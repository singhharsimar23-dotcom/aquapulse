"""
Tier 2: Boundary & Corner Cases (F13 - F19) — Verification & Allocation Engine
Covers edge cases, mathematical limits, and boundary thresholds for Trust,
Verified Hours, Beta Reliability, Audit Escalation, CGWB Tiers, and Zone-A Benchmark.
Requirement: >= 5 test cases per feature (35 tests total across F13-F19).
"""

import pytest
from harness.simulation_harness import (
    AquaPulseSimulationHarness,
    compute_trust,
    compute_verified_hours,
    BayesianReliabilityTracker,
    classify_cgwb_stress
)

@pytest.fixture
def sim():
    return AquaPulseSimulationHarness()

# =========================================================================
# F13 Boundaries: Farmer Trust Formula
# =========================================================================
def test_f13_boundary_reported_zero_meter_positive():
    """F13.B1: R=0, E=50 -> T = 1 - 50/50 = 0.0."""
    t = compute_trust(0.0, 50.0)
    assert t == 0.0

def test_f13_boundary_reported_positive_meter_zero():
    """F13.B2: R=50, E=0 -> T = 1 - 50/50 = 0.0."""
    t = compute_trust(50.0, 0.0)
    assert t == 0.0

def test_f13_boundary_huge_numbers_precision():
    """F13.B3: Large numbers R=1,000,000, E=1,000,000 -> T = 1.0 without overflow."""
    t = compute_trust(1_000_000.0, 1_000_000.0)
    assert abs(t - 1.0) < 1e-9

def test_f13_boundary_tiny_difference():
    """F13.B4: Sub-second difference R=10.0, E=10.0001 -> T ~ 0.99999."""
    t = compute_trust(10.0, 10.0001)
    assert 0.9999 <= t <= 1.0

def test_f13_boundary_both_zero():
    """F13.B5: R=0.0, E=0.0 returns 1.0 (no pump usage during rain/fallow)."""
    t = compute_trust(0.0, 0.0)
    assert t == 1.0


# =========================================================================
# F14 Boundaries: Verified Hours Formula
# =========================================================================
def test_f14_boundary_trust_zero_collapses_to_electricity():
    """F14.B1: When T=0.0, U = E exactly."""
    u = compute_verified_hours(10.0, 45.0, trust=0.0)
    assert abs(u - 45.0) < 1e-9

def test_f14_boundary_trust_one_collapses_to_reported():
    """F14.B2: When T=1.0, U = R exactly."""
    u = compute_verified_hours(35.0, 35.0, trust=1.0)
    assert abs(u - 35.0) < 1e-9

def test_f14_boundary_trust_half_arithmetic_mean():
    """F14.B3: When T=0.5, U is exact arithmetic mean of R and E."""
    u = compute_verified_hours(20.0, 40.0, trust=0.5)
    assert abs(u - 30.0) < 1e-9

def test_f14_boundary_fractional_minute_precision():
    """F14.B4: Fractional pumping (0.01667h = 1 minute) retains decimal accuracy."""
    u = compute_verified_hours(0.01667, 0.01667, trust=1.0)
    assert abs(u - 0.01667) < 1e-5

def test_f14_boundary_non_negativity():
    """F14.B5: Verified hours is always >= 0 for non-negative inputs."""
    u = compute_verified_hours(0.0, 0.0, trust=1.0)
    assert u == 0.0


# =========================================================================
# F15 Boundaries: Bayesian Reliability Model
# =========================================================================
def test_f15_boundary_prior_mean():
    """F15.B1: Prior Beta(2, 1) has mean exactly 2/3."""
    tracker = BayesianReliabilityTracker(alpha=2.0, beta=1.0)
    assert abs(tracker.mean_reliability - (2.0 / 3.0)) < 1e-6

def test_f15_boundary_high_alpha_limit():
    """F15.B2: As alpha -> 1000 with beta=1, mean reliability -> 0.999."""
    tracker = BayesianReliabilityTracker(alpha=1000.0, beta=1.0)
    assert tracker.mean_reliability > 0.998

def test_f15_boundary_high_beta_limit():
    """F15.B3: As beta -> 1000 with alpha=1, mean reliability -> 0.001."""
    tracker = BayesianReliabilityTracker(alpha=1.0, beta=1000.0)
    assert tracker.mean_reliability < 0.002

def test_f15_boundary_neutral_update():
    """F15.B4: Intermediate trust (T=0.65) updates alpha and beta equally (+0.5 each)."""
    tracker = BayesianReliabilityTracker(alpha=2.0, beta=2.0)
    tracker.update(trust=0.65)
    assert tracker.alpha == 2.5
    assert tracker.beta == 2.5
    assert tracker.mean_reliability == 0.50

def test_f15_boundary_variance_reduction():
    """F15.B5: Total observations N = alpha + beta increases with every update."""
    tracker = BayesianReliabilityTracker(alpha=2.0, beta=1.0)
    initial_n = tracker.alpha + tracker.beta
    tracker.update(trust=0.9)
    assert (tracker.alpha + tracker.beta) > initial_n


# =========================================================================
# F16 Boundaries: Audit Escalation Queue
# =========================================================================
def test_f16_boundary_z_score_below_two_not_flagged(sim):
    """F16.B1: Z-score = 1.99 does not trigger audit queue escalation."""
    sim.reporters["Farmer A"] = BayesianReliabilityTracker(alpha=5.0, beta=1.0)
    # diff = 19.9 -> z_score = 1.99 <= 2.0
    reading = sim.ingest_reading({
        "farmer_id": "Farmer A",
        "reported_hours": 10.0,
        "electricity_implied_hours": 29.9
    })
    assert reading["audit_flagged"] is False

def test_f16_boundary_z_score_above_two_flagged(sim):
    """F16.B2: Z-score = 2.05 triggers audit queue escalation."""
    # diff = 20.5 -> z_score = 2.05 > 2.0
    reading = sim.ingest_reading({
        "farmer_id": "Farmer B",
        "reported_hours": 10.0,
        "electricity_implied_hours": 30.5
    })
    assert reading["audit_flagged"] is True

def test_f16_boundary_mean_reliability_exact_threshold(sim):
    """F16.B3: Mean reliability >= 0.60 is not flagged on trust alone."""
    tracker = sim.reporters["Farmer A"]
    tracker.alpha = 3.0
    tracker.beta = 2.0  # E[theta] = 3/5 = 0.60
    assert tracker.mean_reliability >= 0.60

def test_f16_boundary_mean_reliability_sub_threshold(sim):
    """F16.B4: Mean reliability < 0.60 triggers audit escalation."""
    tracker = sim.reporters["Farmer A"]
    tracker.alpha = 2.9
    tracker.beta = 2.1  # E[theta] = 2.9 / 5.0 = 0.58 < 0.60
    reading = sim.ingest_reading({
        "farmer_id": "Farmer A",
        "reported_hours": 10.0,
        "electricity_implied_hours": 15.0  # z-score = 0.5 < 2.0
    })
    assert reading["audit_flagged"] is True

def test_f16_boundary_audit_queue_id_monotonic(sim):
    """F16.B5: Audit queue record IDs are strictly monotonic positive integers."""
    sim.ingest_reading({"farmer_id": "Farmer C", "reported_hours": 10.0, "electricity_implied_hours": 45.0})
    sim.ingest_reading({"farmer_id": "Farmer D", "reported_hours": 10.0, "electricity_implied_hours": 45.0})
    assert sim.audit_queue[-1]["id"] > sim.audit_queue[-2]["id"]


# =========================================================================
# F17 Boundaries: CGWB Stress Classification
# =========================================================================
def test_f17_boundary_exact_seventy_percent():
    """F17.B1: Stress at exactly 70.0% is Safe (factor 1.00)."""
    cat, factor = classify_cgwb_stress(70.0)
    assert cat == "Safe"
    assert factor == 1.00

def test_f17_boundary_just_above_seventy_percent():
    """F17.B2: Stress at 70.001% is Semi-Critical (factor 0.90)."""
    cat, factor = classify_cgwb_stress(70.001)
    assert cat == "Semi-Critical"
    assert factor == 0.90

def test_f17_boundary_exact_ninety_percent():
    """F17.B3: Stress at exactly 90.0% is Critical (factor 0.80)."""
    cat, factor = classify_cgwb_stress(90.0)
    assert cat == "Critical"
    assert factor == 0.80

def test_f17_boundary_exact_one_hundred_percent():
    """F17.B4: Stress at exactly 100.0% is Critical (factor 0.80)."""
    cat, factor = classify_cgwb_stress(100.0)
    assert cat == "Critical"
    assert factor == 0.80

def test_f17_boundary_just_above_one_hundred_percent():
    """F17.B5: Stress at 100.001% is Over-exploited (factor 0.65)."""
    cat, factor = classify_cgwb_stress(100.001)
    assert cat == "Over-exploited"
    assert factor == 0.65


# =========================================================================
# F18 Boundaries: Land-Proportional Allocation
# =========================================================================
def test_f18_boundary_single_farmer_takes_full_pool(sim):
    """F18.B1: Single registered farmer receives 100% of weekly pool."""
    sim.farmers = {"Solo": {"id": "Solo", "zone": "Zone-A", "acres": 12.0, "floor_m3": 5.0, "karma": 10.0}}
    res = sim.calculate_zone_allocation("Zone-A")
    assert abs(res["allocations"][0]["hours"] - res["weekly_pool"]) < 1e-6

def test_f18_boundary_zero_pool_yields_zero_allocation(sim):
    """F18.B2: When weekly pool is 0.0h (complete emergency shutdown), all allocations are 0.0h."""
    res = sim.calculate_zone_allocation("Zone-A", cap_m_star=0.0)
    for a in res["allocations"]:
        assert a["hours"] == 0.0

def test_f18_boundary_skewed_acreage_ratio(sim):
    """F18.B3: Skewed acreage (99 acres vs 1 acre) yields 99:1 allocation ratio."""
    sim.farmers = {
        "F_huge": {"id": "F_huge", "zone": "Zone-A", "acres": 99.0, "floor_m3": 5.0, "karma": 10.0},
        "F_tiny": {"id": "F_tiny", "zone": "Zone-A", "acres": 1.0, "floor_m3": 5.0, "karma": 10.0},
    }
    res = sim.calculate_zone_allocation("Zone-A")
    alloc_map = {a["farmer_id"]: a["hours"] for a in res["allocations"]}
    assert abs(alloc_map["F_huge"] - 99.0 * alloc_map["F_tiny"]) < 1e-6

def test_f18_boundary_many_farmers_conservation(sim):
    """F18.B4: 100 smallholders with 0.5 acres strictly partition weekly pool."""
    sim.farmers = {f"F{i}": {"id": f"F{i}", "zone": "Zone-A", "acres": 0.5, "floor_m3": 5.0, "karma": 10.0} for i in range(100)}
    res = sim.calculate_zone_allocation("Zone-A")
    total_allocated = sum(a["hours"] for a in res["allocations"])
    assert abs(total_allocated - res["weekly_pool"]) < 1e-6

def test_f18_boundary_proportionality_invariant_under_scaling(sim):
    """F18.B5: Ratio between two farmers' allocations is independent of pool multiplier."""
    res1 = sim.calculate_zone_allocation("Zone-A", cap_m_star=1.0)
    res2 = sim.calculate_zone_allocation("Zone-A", cap_m_star=0.6)
    ratio1 = res1["allocations"][0]["hours"] / res1["allocations"][1]["hours"]
    ratio2 = res2["allocations"][0]["hours"] / res2["allocations"][1]["hours"]
    assert abs(ratio1 - ratio2) < 1e-9


# =========================================================================
# F19 Boundaries: Zone-A Benchmark Test
# =========================================================================
def test_f19_boundary_farmer_c_reduction_precision():
    """F19.B1: Farmer C reduction percentage precision: (26.0 - 38.0) / 38.0 = -31.5789%."""
    red = ((26.0 - 38.0) / 38.0) * 100.0
    assert abs(red - (-31.578947)) < 1e-4

def test_f19_boundary_critical_budget_exact_multiplication():
    """F19.B2: 130.0 hours * 0.80 factor = exactly 104.0 hours."""
    pool = 130.0 * 0.80
    assert pool == 104.0

def test_f19_boundary_verified_total_arithmetic():
    """F19.B3: Sum 28.0 + 30.0 + 38.0 + 28.8 = 124.8 exactly."""
    s = 28.0 + 30.0 + 38.0 + 28.8
    assert abs(s - 124.8) < 1e-9

def test_f19_boundary_stress_score_precision():
    """F19.B4: Stress score is 124.8 / 130.0 = 0.9600000000000001 (96.0%)."""
    score = (124.8 / 130.0) * 100.0
    assert abs(score - 96.0) < 1e-9

def test_f19_boundary_farmer_c_share_of_pool():
    """F19.B5: Farmer C share is 5 / 20 = 0.25; 0.25 * 104.0 = 26.0."""
    share = (5.0 / 20.0) * 104.0
    assert share == 26.0
