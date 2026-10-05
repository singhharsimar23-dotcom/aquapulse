#!/usr/bin/env python3
"""AquaPulse reference oracle (Python). Independent third implementation.
Java (server) and TypeScript (browser) must reproduce every number this file exports.
Usage:  python reference/aquapulse_ref.py --selftest
        python reference/aquapulse_ref.py --export tests/golden
Deps: Python >= 3.10, scipy (only for E1 reference values). No network."""
import hashlib, json, math, struct, sys, pathlib

LAMBDA_MAX = 0.6          # ASSUMPTION: cap on meter override
REVIEW_MISMATCH = 0.5     # ASSUMPTION: mismatch above this -> REVIEW
EULER_GAMMA = 0.5772156649015329

# ---------- 6.2 trust + blend, with missing-data handling ----------
def trust_blend(R, E, lam_max=LAMBDA_MAX):
    """R, E: hours (float) or None (missing). Returns dict(T, lam, U, mismatch, flags)."""
    flags = []
    if R is None and E is None:
        return dict(T=None, lam=None, U=0.0, mismatch=None, flags=["NO_DATA"])
    if E is None:
        return dict(T=None, lam=None, U=float(R), mismatch=None, flags=["NO_METER"])
    if R is None:
        return dict(T=None, lam=None, U=float(E), mismatch=None, flags=["NO_REPORT"])
    m = max(R, E)
    T = 1.0 if m == 0 else min(1.0, max(0.0, 1.0 - abs(R - E) / m))
    mismatch = 0.0 if m == 0 else abs(R - E) / m
    lam = min(lam_max, 1.0 - T)
    U = (1.0 - lam) * R + lam * E
    if mismatch > REVIEW_MISMATCH:
        flags.append("REVIEW")
    return dict(T=T, lam=lam, U=U, mismatch=mismatch, flags=flags)

# ---------- 6.5 weighted max-min water-filling with floor ----------
def water_fill(d, w, P, f=0.0):
    n = len(d)
    fi = [min(f, x) for x in d]
    if sum(fi) > P:                               # FLOOR_INFEASIBLE: scale floors, raise flag upstream
        s = sum(fi)
        return [P * x / s for x in fi], True
    P2 = P - sum(fi)
    d2 = [x - y for x, y in zip(d, fi)]
    if sum(d2) <= P2:
        return [a + b for a, b in zip(fi, d2)], False
    lo, hi = 0.0, max(x / y for x, y in zip(d2, w))
    for _ in range(300):
        th = (lo + hi) / 2
        if sum(min(x, th * y) for x, y in zip(d2, w)) > P2: hi = th
        else: lo = th
    return [a + min(x, lo * y) for a, x, y in zip(fi, d2, w)], False

# ---------- 6.5 escrow: disputed water is held, never cut ----------
def escrow_split(alloc, R, E, review):
    """For REVIEW farmers: released = min(alloc, min(R,E)); escrow = remainder. Others: all released."""
    rel, esc = [], []
    for a, r, e, rv in zip(alloc, R, E, review):
        if rv and r is not None and e is not None:
            u = min(r, e); x = min(a, u)
        else:
            x = a
        rel.append(x); esc.append(a - x)
    return rel, esc

# ---------- 6.6 Theis well function ----------
def e1(u):
    if u <= 0: raise ValueError("u must be > 0")
    if u <= 1.0:                                   # power series
        s, term = 0.0, 1.0
        for k in range(1, 200):
            term *= -u / k
            s += term / k
            if abs(term / k) < 1e-18: break
        return -EULER_GAMMA - math.log(u) - s
    tiny = 1e-300                                  # modified Lentz continued fraction
    b = u + 1.0; c = 1.0 / tiny; d = 1.0 / b; h = d
    for i in range(1, 500):
        a = -float(i * i); b += 2.0
        d = 1.0 / (a * d + b); c = b + a / c
        de = c * d; h *= de
        if abs(de - 1.0) < 1e-16: break
    return h * math.exp(-u)

def cooper_jacob(u): return -EULER_GAMMA - math.log(u)

def theis_s(Q_m3d, T_m2d, S, r_m, t_d):
    u = r_m * r_m * S / (4.0 * T_m2d * t_d)
    return Q_m3d / (4.0 * math.pi * T_m2d) * e1(u)

# ---------- 6.7 impact meter ----------
def kwh_per_m3(H_m, eta): return 1000.0 * 9.81 * H_m / (3.6e6 * eta)

# ---------- 6.8 Merkle ----------
def _enc(fields):
    return b"".join(struct.pack(">I", len(b)) + b for b in (f.encode("utf-8") for f in fields))
def fmt6(x): return f"{x:.6f}"
def leaf(fields): return hashlib.sha256(b"\x00" + _enc(fields)).digest()
def node(a, b):   return hashlib.sha256(b"\x01" + a + b).digest()
def root(leaves):
    lv = list(leaves)
    if not lv: raise ValueError("empty")
    while len(lv) > 1:
        nx = [node(lv[i], lv[i + 1]) for i in range(0, len(lv) - 1, 2)]
        if len(lv) % 2: nx.append(lv[-1])          # promote odd node unchanged
        lv = nx
    return lv[0]
def root_duplicate_odd_WRONG(leaves):              # must NOT be what the product produces
    lv = list(leaves)
    while len(lv) > 1:
        if len(lv) % 2: lv.append(lv[-1])
        lv = [node(lv[i], lv[i + 1]) for i in range(0, len(lv), 2)]
    return lv[0]

# ---------- 6.4 toy bucket model + ACI (sanity harness, NOT golden) ----------
def simulate_cap(phi, mode, seed, weeks=156, overdraw=0.25, target=0.10, gamma=0.02, window=52, B=130.0, ema=0.3):
    """Toy closed loop. mode: 'reports' (model sees reported extraction) or 'verified' (sees metered, with overdraw correction).
    Numbers it produces are SYNTH and must be reported as measured by the harness, never asserted in prose."""
    import random, statistics
    rng = random.Random(seed); SyA = 60.0; h = 6.0; alpha = target; res = []; caps = []; viol = 0; below = 0; om = 0.0
    for t in range(weeks):
        rch = 100 * max(0.0, 1 + 0.6 * math.sin(2 * math.pi * t / 52)) + rng.gauss(0, 5)
        q = min(1.0, max(0.0, 1 - alpha)); pos = sorted(max(x, 0.0) for x in res[-window:])
        m = (pos[min(len(pos) - 1, int(q * (len(pos) - 1) + 0.5))] if len(pos) >= 8 else 1.0)
        cap = max(0.0, rch + SyA * (h - m)); pool = min(cap / (1 + om), B)
        true_ext = pool * (1 + overdraw * phi)
        ext_model = pool if mode == "reports" else true_ext * (1 + rng.gauss(0, 0.03))
        if mode == "verified": om = (1 - ema) * om + ema * max(0.0, ext_model / pool - 1) if pool > 0 else om
        h_pred = h + (rch - ext_model) / SyA; h_obs = h + (rch - true_ext) / SyA + rng.gauss(0, 0.05)
        e = h_pred - h_obs; err = 1 if e > m else 0; alpha += gamma * (target - err)
        res.append(e); caps.append(pool); viol += err; below += (h_obs < 0); h = h_obs
    return dict(mean_pool=statistics.mean(caps), miscoverage=viol / weeks, weeks_below_floor=below)

# ---------- golden fixtures ----------
LAND = [7.0, 7.5, 5.0, 9.5]; R = [28.0, 30.0, 20.0, 38.0]; E = [28.0, 30.0, 50.0, 36.0]; B_REF = 130.0

def zone_a():
    tb = [trust_blend(r, e) for r, e in zip(R, E)]
    U = [x["U"] for x in tb]; review = ["REVIEW" in x["flags"] for x in tb]
    out = dict(inputs=dict(land=LAND, R=R, E=E, B_REF=B_REF, lambda_max=LAMBDA_MAX, review_mismatch=REVIEW_MISMATCH),
               T=[x["T"] for x in tb], lam=[x["lam"] for x in tb], U=U, sumU=sum(U), review=review,
               SOE_verified_pct=sum(U) / B_REF * 100, SOE_reports_pct=sum(R) / B_REF * 100, SOE_meter_pct=sum(E) / B_REF * 100)
    out["waterfill"] = {}
    for P, f in [(104, 0), (91, 0), (78, 0), (130, 0), (104, 5)]:
        a, inf = water_fill(U, LAND, P, f); out["waterfill"][f"pool{P}_floor{f}"] = dict(alloc=a, floor_infeasible=inf)
    out["escrow"] = {}
    for P in (130, 104):
        a, _ = water_fill(U, LAND, P); rel, esc = escrow_split(a, R, E, review)
        out["escrow"][f"pool{P}"] = dict(alloc=a, released=rel, escrow=esc)
    d2 = list(U); d2[2] = min(R[2], E[2]); a2, _ = water_fill(d2, LAND, 130)
    out["escrow"]["pool130_committee_CONFIRMED_on_C"] = dict(alloc=a2, unused=130 - sum(a2))
    out["edge_cases"] = {k: trust_blend(*v) for k, v in dict(
        lambda_binds_R0_E50=(0.0, 50.0), lambda_binds_R50_E0=(50.0, 0.0), lambda_equal_not_binding_R20_E50=(20.0, 50.0),
        both_zero=(0.0, 0.0), meter_missing=(30.0, None), report_missing=(None, 40.0), no_data=(None, None)).items()}
    return out

E1_US = [0.001, 0.01, 0.05, 0.1, 0.5, 0.9999, 1.0, 1.0001, 2.0, 5.0, 10.0, 20.0]
def e1_vectors():
    from scipy.special import exp1
    return [dict(u=u, E1=float(exp1(u))) for u in E1_US]

def merkle_vectors():
    rows = [("F-A", 25.103448), ("F-B", 26.896552), ("F-C", 17.931034), ("F-D", 34.068966)]
    mk = lambda f, a: leaf([f, "zone-a", "2026-W10", fmt6(a)])
    ls = [mk(f, a) for f, a in rows]
    t = list(ls); t[2] = mk("F-C", 27.931034)
    return dict(fields=["farmerId", "zone", "week", "alloc"], rows=[[f, fmt6(a)] for f, a in rows],
                leaves=[x.hex() for x in ls], root4=root(ls).hex(), root3=root(ls[:3]).hex(), root1=root(ls[:1]).hex(),
                root4_tampered_FC_plus10=root(t).hex(), WRONG_duplicate_odd_root3=root_duplicate_odd_WRONG(ls[:3]).hex())

def impact_vectors():
    out = []
    for H in (20, 40):
        k = kwh_per_m3(H, 0.30)
        out.append(dict(H=H, eta=0.30, kwh_per_m3=k, avg_0_675=k * 0.675, cm_0_705=k * 0.705, om_0_963=k * 0.963))
    return out

EXPECT_ROOT4 = "b0fb427d7e2a42bc6f6583fbbb54bed252c0e6d582ac95882f5a3bcd007bba38"
EXPECT_ROOT3 = "e03fddc98b8138d7c6d314f722074e4f033de836c11133d570adae04879a4b90"
EXPECT_TAMPER = "3c9e4579bbd32f5a1f70ab31e57c9452b637d82f859ed8ab4c663e43e0633293"
EXPECT_WRONG3 = "dd29d333cfc578522be2ac62dad3b162173513674f4c6e0c6edb03c5ce51f511"

def selftest():
    z = zone_a(); ap = lambda a, b, tol=1e-3: abs(a - b) <= tol
    assert [round(x, 4) for x in z["T"]] == [1.0, 1.0, 0.4, 0.9474]
    assert [round(x, 3) for x in z["U"]] == [28.0, 30.0, 38.0, 37.895] and ap(z["sumU"], 133.895)
    assert ap(z["SOE_verified_pct"], 103.0, 0.05) and ap(z["SOE_reports_pct"], 89.23, 0.01) and ap(z["SOE_meter_pct"], 110.77, 0.01)
    assert z["review"] == [False, False, True, False]
    wf = z["waterfill"]
    for key, exp in {"pool104_floor0": [25.10, 26.90, 17.93, 34.07], "pool91_floor0": [21.97, 23.53, 15.69, 29.81],
                     "pool78_floor0": [18.83, 20.17, 13.45, 25.55], "pool130_floor0": [28.00, 30.00, 34.11, 37.89],
                     "pool104_floor5": [25.28, 26.72, 19.48, 32.52]}.items():
        assert all(ap(a, b, 0.006) for a, b in zip(wf[key]["alloc"], exp)), key
    assert ap(sum(wf["pool104_floor0"]["alloc"]), 104.0, 1e-9)
    e130 = z["escrow"]["pool130"]; assert ap(e130["escrow"][2], 14.1053, 1e-3) and ap(e130["released"][2], 20.0, 1e-9)
    assert all(x == 0 for x in z["escrow"]["pool104"]["escrow"])           # scarcity: nothing to escrow
    ec = z["edge_cases"]
    assert ec["lambda_binds_R0_E50"]["U"] == 30.0 and ec["lambda_equal_not_binding_R20_E50"]["U"] == 38.0
    assert ec["meter_missing"]["U"] == 30.0 and "NO_METER" in ec["meter_missing"]["flags"] and ec["no_data"]["U"] == 0.0
    from scipy.special import exp1
    for u in E1_US: assert abs(e1(u) / float(exp1(u)) - 1) < 1e-9, u
    assert abs(cooper_jacob(0.01) / float(exp1(0.01)) - 1) < 0.003
    m = merkle_vectors()
    assert m["root4"] == EXPECT_ROOT4 and m["root3"] == EXPECT_ROOT3 and m["root4_tampered_FC_plus10"] == EXPECT_TAMPER
    assert m["WRONG_duplicate_odd_root3"] == EXPECT_WRONG3 and m["root3"] != m["WRONG_duplicate_odd_root3"] and m["root1"] == m["leaves"][0]
    i = impact_vectors(); assert ap(i[0]["kwh_per_m3"], 0.18167, 1e-5) and ap(i[0]["cm_0_705"], 0.12807, 1e-5)
    print("SELFTEST OK")

def export(outdir):
    d = pathlib.Path(outdir); d.mkdir(parents=True, exist_ok=True)
    for name, obj in (("v9_zone_a.json", zone_a()), ("e1_vectors.json", e1_vectors()),
                      ("merkle_vectors.json", merkle_vectors()), ("impact_vectors.json", impact_vectors())):
        (d / name).write_text(json.dumps(obj, indent=2, sort_keys=True)); print("wrote", d / name)

if __name__ == "__main__":
    if "--selftest" in sys.argv: selftest()
    elif "--export" in sys.argv: export(sys.argv[sys.argv.index("--export") + 1])
    else: print(__doc__)
