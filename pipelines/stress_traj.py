#!/usr/bin/env python3
"""pipelines/stress_traj.py
M4 stress trajectories generator per AQUAPULSE_V9_2_LEAN.md §9 (M4) and §8.8 (W4).
Precomputes 10-15 season trajectories across two arms (reports-only vs verified-with-overdraw-correction).
Plays stored SYNTH(seed) trajectories with seed + code hash.
"""

import json
import math
import hashlib
import random
import statistics
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = REPO_ROOT / "public" / "data" / "stress_trajectories.json"

SEEDS = [42, 101, 2024, 777, 999, 1234, 5678, 9012, 31415, 27182]
WEEKS = 156
B_REF = 130.0


def get_code_hash():
    with open(__file__, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def simulate_trajectory(
    seed: int,
    arm: str,
    shift: bool = False,
    liar_fraction: float = 0.0,
    with_aci: bool = True,
    weeks: int = WEEKS,
    overdraw: float = 0.25,
    target: float = 0.10,
    gamma: float = 0.02,
    window: int = 52,
    B: float = B_REF,
    ema: float = 0.3,
):
    """Simulates multi-season closed-loop trajectory.
    arm: 'reports' (reports-only) | 'verified' (verified-with-overdraw-correction)
    shift: True simulates hydrological recharge shift (drought / phase shift)
    liar_fraction: fraction of farmers whose reports understate true extraction
    with_aci: whether ACI adapts margin (gamma > 0) or margin is fixed
    """
    rng = random.Random(seed)
    SyA = 60.0
    h = 6.0
    alpha = target
    eff_gamma = gamma if with_aci else 0.0
    res = []
    caps = []
    pools = []
    margins = []
    omegas = []
    alphas = []
    h_obs_list = []
    viol = 0
    below = 0
    om = 0.0

    weekly_trace = []

    for t in range(weeks):
        # Hydrological recharge
        if shift and t >= 52:
            # Shifted recharge: lower mean and seasonal phase shift
            rch_base = 75 * max(0.0, 1 + 0.5 * math.sin(2 * math.pi * (t - 13) / 52))
        else:
            rch_base = 100 * max(0.0, 1 + 0.6 * math.sin(2 * math.pi * t / 52))
        rch = rch_base + rng.gauss(0, 5)

        # Conformal margin computation
        if with_aci:
            q = min(1.0, max(0.0, 1 - alpha))
            pos = sorted(max(x, 0.0) for x in res[-window:])
            m = pos[min(len(pos) - 1, int(q * (len(pos) - 1) + 0.5))] if len(pos) >= 8 else 1.0
        else:
            m = 1.0  # Fixed baseline margin without ACI

        cap = max(0.0, rch + SyA * (h - m))
        pool = min(cap / (1 + om), B)

        # True extraction vs extraction seen by model
        phi = liar_fraction if liar_fraction > 0 else 1.0
        true_ext = pool * (1 + overdraw * phi)

        if arm == "reports":
            # Reports-only: model believes reported pool extraction
            ext_model = pool
        else:
            # Verified: model observes true extraction with smart meter telemetry
            ext_model = true_ext * (1 + rng.gauss(0, 0.03))
            if pool > 0:
                om = (1 - ema) * om + ema * max(0.0, ext_model / pool - 1)

        # Head physics update
        h_pred = h + (rch - ext_model) / SyA
        h_obs = h + (rch - true_ext) / SyA + rng.gauss(0, 0.05)

        # Prediction error and ACI step
        e = h_pred - h_obs
        err = 1 if e > m else 0
        alpha += eff_gamma * (target - err)

        res.append(e)
        caps.append(cap)
        pools.append(pool)
        margins.append(m)
        omegas.append(om)
        alphas.append(alpha)
        h_obs_list.append(h_obs)
        viol += err
        below += 1 if (h_obs < 0) else 0
        h = h_obs

        # Sample every 2 weeks for compact client-side payload
        if t % 2 == 0 or t == weeks - 1:
            weekly_trace.append({
                "week": t,
                "cap": round(cap, 2),
                "pool": round(pool, 2),
                "margin": round(m, 3),
                "omega": round(om, 4),
                "alpha": round(alpha, 4),
                "h_obs": round(h_obs, 2),
                "err": err,
            })

    miscoverage = viol / weeks
    return {
        "seed": seed,
        "arm": arm,
        "shift": shift,
        "liar_fraction": liar_fraction,
        "with_aci": with_aci,
        "mean_pool": round(statistics.mean(pools), 2),
        "realised_miscoverage": round(miscoverage, 4),
        "target_miscoverage": target,
        "weeks_below_floor": below,
        "final_margin": round(margins[-1], 3),
        "final_omega": round(omegas[-1], 4),
        "weekly_trace": weekly_trace,
    }


def main():
    code_hash = get_code_hash()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    scenarios = [
        {"name": "baseline", "shift": False, "liar_fraction": 0.0},
        {"name": "shift", "shift": True, "liar_fraction": 0.0},
        {"name": "readers_lie", "shift": False, "liar_fraction": 0.60},
        {"name": "shift_and_lie", "shift": True, "liar_fraction": 0.60},
    ]

    all_trajectories = []

    for seed in SEEDS:
        for sc in scenarios:
            for with_aci in [True, False]:
                for arm in ["reports", "verified"]:
                    traj = simulate_trajectory(
                        seed=seed,
                        arm=arm,
                        shift=sc["shift"],
                        liar_fraction=sc["liar_fraction"],
                        with_aci=with_aci,
                    )
                    traj["scenario"] = sc["name"]
                    traj["code_hash"] = code_hash
                    all_trajectories.append(traj)

    payload = {
        "title": "AquaPulse Stress Trajectories (M4)",
        "provenance_kind": "SYNTH",
        "description": "Precomputed multi-season trajectories in two arms: reports-only vs verified-with-overdraw-correction",
        "code_hash": code_hash,
        "seeds": SEEDS,
        "weeks": WEEKS,
        "target_miscoverage": 0.10,
        "trajectories": all_trajectories,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Generated {len(all_trajectories)} trajectories -> {OUTPUT_PATH}")
    print(f"Code hash: {code_hash}")


if __name__ == "__main__":
    main()
