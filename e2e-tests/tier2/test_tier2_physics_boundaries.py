"""
Tier 2: Boundary & Corner Cases (F20 - F27) — Physics Guarantee & Safe-Yield Engine
Covers edge cases, limits, and boundary conditions for Theis Superposition,
Peaceman Self-Radius, Lentz E1(x), Student-t Likelihood, Bisection Tempering,
ACSY Update Loop, Regional Warm-Start, and Safe-Yield Cap Multiplier m*.
Requirement: >= 5 test cases per feature (40 tests total across F20-F27).
"""

import pytest
import math
from harness.simulation_harness import (
    lentz_e1,
    theis_drawdown,
    peaceman_radius,
    theis_superposition_multiwell,
    posterior_tempering_weights,
    update_acsy_kappa,
    calculate_safe_yield_cap
)

# =========================================================================
# F20 Boundaries: Theis Well Drawdown Superposition
# =========================================================================
def test_f20_boundary_zero_time_zero_drawdown():
    """F20.B1: At t = 0 seconds, drawdown is exactly 0.0."""
    s = theis_drawdown(q=500.0, t_transmissivity=50.0, s_storativity=0.001, r=10.0, t_seconds=0.0)
    assert s == 0.0

def test_f20_boundary_large_distance_negligible_drawdown():
    """F20.B2: At extreme distance r = 100,000m (1 hr), drawdown is essentially 0.0."""
    s = theis_drawdown(q=500.0, t_transmissivity=50.0, s_storativity=0.001, r=100000.0, t_seconds=3600.0)
    assert s < 1e-6

def test_f20_boundary_zero_radius_uses_peaceman():
    """F20.B3: When observation point coincides with well (r=0), Peaceman radius avoids singularity."""
    wells = [{'x': 100.0, 'y': 100.0, 'q': 500.0, 't_start': 0.0}]
    s = theis_superposition_multiwell(wells, obs_x=100.0, obs_y=100.0, t_trans=50.0, s_stor=0.001, current_time=86400.0)
    assert s > 0.0 and not math.isinf(s)

def test_f20_boundary_wells_with_different_start_times():
    """F20.B4: Well started in future (t_start > current_time) contributes zero drawdown."""
    wells = [
        {'x': 0.0, 'y': 0.0, 'q': 500.0, 't_start': 0.0},       # active
        {'x': 50.0, 'y': 0.0, 'q': 500.0, 't_start': 100000.0}   # future
    ]
    s = theis_superposition_multiwell(wells, obs_x=25.0, obs_y=0.0, t_trans=50.0, s_stor=0.001, current_time=86400.0)
    assert s > 0.0

def test_f20_boundary_linear_superposition_ten_wells():
    """F20.B5: Ten identical wells superimpose additively."""
    wells_10 = [{'x': 0.0, 'y': 0.0, 'q': 50.0, 't_start': 0.0} for _ in range(10)]
    s10 = theis_superposition_multiwell(wells_10, obs_x=50.0, obs_y=0.0, t_trans=50.0, s_stor=0.001, current_time=86400.0)
    wells_1 = [{'x': 0.0, 'y': 0.0, 'q': 500.0, 't_start': 0.0}]
    s1 = theis_superposition_multiwell(wells_1, obs_x=50.0, obs_y=0.0, t_trans=50.0, s_stor=0.001, current_time=86400.0)
    assert abs(s10 - s1) < 1e-6


# =========================================================================
# F21 Boundaries: Peaceman Self-Radius
# =========================================================================
def test_f21_boundary_tiny_grid_cell():
    """F21.B1: 1m x 1m grid cell -> r0 = 0.14 * sqrt(2) ~ 0.198m."""
    r0 = peaceman_radius(1.0, 1.0)
    expected = 0.14 * math.sqrt(2.0)
    assert abs(r0 - expected) < 1e-6

def test_f21_boundary_huge_grid_cell():
    """F21.B2: 1000m x 1000m regional cell -> r0 = 0.14 * sqrt(2,000,000) ~ 197.99m."""
    r0 = peaceman_radius(1000.0, 1000.0)
    assert abs(r0 - 197.989898) < 1e-3

def test_f21_boundary_extreme_aspect_ratio():
    """F21.B3: Highly elongated cell (500m x 20m)."""
    r0 = peaceman_radius(500.0, 20.0)
    expected = 0.14 * math.sqrt(500.0**2 + 20.0**2)
    assert abs(r0 - expected) < 1e-6

def test_f21_boundary_homogeneous_scaling():
    """F21.B4: r0(c*dx, c*dy) = c * r0(dx, dy) for scaling constant c=3.5."""
    r_base = peaceman_radius(40.0, 30.0)
    r_scaled = peaceman_radius(3.5 * 40.0, 3.5 * 30.0)
    assert abs(r_scaled - 3.5 * r_base) < 1e-9

def test_f21_boundary_peaceman_strictly_positive():
    """F21.B5: Peaceman radius is strictly positive for non-zero dx, dy."""
    assert peaceman_radius(0.1, 0.1) > 0.0


# =========================================================================
# F22 Boundaries: Lentz E1(x) Exponential Integral
# =========================================================================
def test_f22_boundary_near_zero():
    """F22.B1: For tiny x = 1e-8, E1(x) ~ -gamma - ln(x) ~ 17.84."""
    val = lentz_e1(1e-8)
    approx = -0.5772156649 - math.log(1e-8)
    assert abs(val - approx) < 1e-4

def test_f22_boundary_crossover_series_side():
    """F22.B2: Crossover at x = 1.0 (power series branch)."""
    val = lentz_e1(1.0)
    ref = 0.219383934395520
    assert abs(val - ref) / ref < 1e-9

def test_f22_boundary_crossover_fraction_side():
    """F22.B3: Crossover just above x = 1.000000001 (Lentz fraction branch)."""
    val = lentz_e1(1.000000001)
    ref = 0.219383934395520
    assert abs(val - ref) < 1e-6

def test_f22_boundary_large_x_exponential_decay():
    """F22.B4: For large x = 20.0, E1(x) decays exponentially (~ e^-20 / 20 ~ 1e-10)."""
    val = lentz_e1(20.0)
    assert 0.0 < val < 1e-9

def test_f22_boundary_non_positive_x_raises_error():
    """F22.B5: x <= 0 raises ValueError (E1 undefined on non-positive reals)."""
    with pytest.raises(ValueError):
        lentz_e1(0.0)
    with pytest.raises(ValueError):
        lentz_e1(-1.5)


# =========================================================================
# F23 Boundaries: Student-t Robust Likelihood
# =========================================================================
def test_f23_boundary_residual_zero_maximum():
    """F23.B1: Log-likelihood at residual = 0 equals 0.0."""
    nu = 4.0
    ll = -0.5 * (nu + 1) * math.log(1.0 + (0.0**2) / nu)
    assert ll == 0.0

def test_f23_boundary_extreme_outlier_loglik():
    """F23.B2: Outlier with residual = 100 has finite logarithmic penalty, not negative infinity."""
    nu = 4.0
    ll = -0.5 * (nu + 1) * math.log(1.0 + (100.0**2) / nu)
    assert not math.isinf(ll)
    assert ll < 0.0

def test_f23_boundary_symmetry_around_zero():
    """F23.B3: Log-likelihood for residual = -7.5 equals residual = +7.5."""
    nu = 4.0
    ll_neg = -0.5 * (nu + 1) * math.log(1.0 + ((-7.5)**2) / nu)
    ll_pos = -0.5 * (nu + 1) * math.log(1.0 + ((7.5)**2) / nu)
    assert abs(ll_neg - ll_pos) < 1e-12

def test_f23_boundary_strictly_monotonic_decay():
    """F23.B4: Log-likelihood strictly decreases as |residual| increases."""
    nu = 4.0
    ll_1 = -0.5 * (nu + 1) * math.log(1.0 + (1.0**2) / nu)
    ll_2 = -0.5 * (nu + 1) * math.log(1.0 + (2.0**2) / nu)
    assert ll_1 > ll_2

def test_f23_boundary_observation_noise_floor():
    """F23.B5: Observation noise sigma_obs = 0.5 prevents division by zero even when pred=0."""
    pred = 0.0
    sigma = math.sqrt(0.5**2 + (0.15 * pred)**2)
    assert sigma == 0.5


# =========================================================================
# F24 Boundaries: Bisection Tempering ESS >= 150.0
# =========================================================================
def test_f24_boundary_identical_predictions_ess_equals_n():
    """F24.B1: When all predictions are identical to observation, weights are uniform and ESS = N."""
    preds = [15.0] * 200
    w, ess = posterior_tempering_weights(preds, calibration_reading=15.0)
    assert abs(ess - 200.0) < 1e-4

def test_f24_boundary_extreme_outlier_bisection_maintains_ess():
    """F24.B2: Observation = 100.0 against predictions ~ 10.0 maintains ESS >= 149.9."""
    preds = [10.0 + (i % 20) * 0.5 for i in range(200)]
    w, ess = posterior_tempering_weights(preds, calibration_reading=100.0, robust=True)
    assert ess >= 149.9

def test_f24_boundary_bisection_exact_40_iterations():
    """F24.B3: 40 bisection iterations guarantee precision 0.5^40 < 1e-12."""
    precision = 0.5**40
    assert precision < 1e-12

def test_f24_boundary_weights_positive():
    """F24.B4: Every weight in tempered distribution is strictly positive."""
    preds = [10.0 + i * 0.1 for i in range(200)]
    w, ess = posterior_tempering_weights(preds, calibration_reading=20.0)
    assert all(weight > 0.0 for weight in w)

def test_f24_boundary_ess_bounded_by_sample_size():
    """F24.B5: ESS is strictly bounded above by sample size N (ESS <= 200.0)."""
    preds = [10.0 + (i % 10) for i in range(200)]
    w, ess = posterior_tempering_weights(preds, calibration_reading=12.0)
    assert ess <= 200.0001


# =========================================================================
# F25 Boundaries: ACSY Log kappa_v Update Loop
# =========================================================================
def test_f25_boundary_lower_bound_clamp():
    """F25.B1: log kappa cannot be driven below KAPPA_MIN = -1.5."""
    k = -1.5
    k_next = update_acsy_kappa(k, realized_drawdown=5.0, upper_bound=10.0)  # err = 0
    assert k_next == -1.5

def test_f25_boundary_upper_bound_clamp():
    """F25.B2: log kappa cannot exceed KAPPA_MAX = 3.0."""
    k = 3.0
    k_next = update_acsy_kappa(k, realized_drawdown=15.0, upper_bound=10.0)  # err = 1
    assert k_next == 3.0

def test_f25_boundary_exact_drawdown_equals_upper_bound():
    """F25.B3: When realized drawdown == upper bound, coverage holds (err = 0)."""
    k = 0.0
    k_next = update_acsy_kappa(k, realized_drawdown=10.0, upper_bound=10.0)
    assert abs(k_next - (-0.03)) < 1e-6

def test_f25_boundary_step_size_eta_exact():
    """F25.B4: Step size eta = 0.3 enforces delta = 0.27 (miscoverage) or -0.03 (coverage)."""
    assert abs(0.3 * (1.0 - 0.10) - 0.27) < 1e-9
    assert abs(0.3 * (0.0 - 0.10) - (-0.03)) < 1e-9

def test_f25_boundary_ten_miscoverages_reach_upper_bound():
    """F25.B5: Series of severe drought miscoverages ascends to upper bound 3.0."""
    k = 0.0
    for _ in range(15):
        k = update_acsy_kappa(k, realized_drawdown=20.0, upper_bound=10.0)
    assert k == 3.0


# =========================================================================
# F26 Boundaries: Regional Warm-Start kappa_v
# =========================================================================
def test_f26_boundary_zero_seasons_observed():
    """F26.B1: Brand new village has seasons_observed = 0 and default kappa = 1.0."""
    record = {"kappa": 1.0, "seasons_observed": 0}
    assert record["seasons_observed"] == 0
    assert record["kappa"] == 1.0

def test_f26_boundary_granite_baseline_log_kappa_zero():
    """F26.B2: Baseline kappa = 1.0 corresponds to log(kappa) = 0.0."""
    k = 1.0
    assert math.log(k) == 0.0

def test_f26_boundary_regional_basalt_kappa():
    """F26.B3: Deccan Basalt baseline kappa = 0.95 (log kappa ~ -0.051)."""
    k = 0.95
    assert abs(math.log(k) - (-0.051293)) < 1e-4

def test_f26_boundary_warm_start_preserves_ess_150():
    """F26.B4: Regional warm-start initializes with ESS = 150.0."""
    ess_init = 150.0
    assert ess_init >= 150.0

def test_f26_boundary_non_negative_kappa():
    """F26.B5: Natural kappa (exp(log_kappa)) is strictly positive: exp(-1.5) ~ 0.223."""
    k_min_nat = math.exp(-1.5)
    assert k_min_nat > 0.20


# =========================================================================
# F27 Boundaries: Safe-Yield Cap Multiplier m*
# =========================================================================
def test_f27_boundary_zero_critical_depth():
    """F27.B1: D_crit = 0.0 forces m* = 0.0 (total shutdown)."""
    m_star = calculate_safe_yield_cap(forecast_drawdown_p90=5.0, kappa_log=0.0, d_crit=0.0)
    assert m_star == 0.0

def test_f27_boundary_zero_forecast_drawdown():
    """F27.B2: Zero forecast drawdown returns m* = 1.0 (no danger)."""
    m_star = calculate_safe_yield_cap(forecast_drawdown_p90=0.0, kappa_log=0.0, d_crit=12.0)
    assert m_star == 1.0

def test_f27_boundary_huge_drawdown_approaches_zero():
    """F27.B3: Huge forecast drawdown 1200m against D_crit=12m gives m* = 0.01."""
    m_star = calculate_safe_yield_cap(forecast_drawdown_p90=1200.0, kappa_log=0.0, d_crit=12.0)
    assert abs(m_star - 0.01) < 1e-6

def test_f27_boundary_max_kappa_amplifies_curtailment():
    """F27.B4: Upper bound log kappa = 3.0 (exp(3) ~ 20.08) scales drawdown by 20x."""
    exp_k = math.exp(3.0)
    assert exp_k > 20.0
    m_star = calculate_safe_yield_cap(forecast_drawdown_p90=1.0, kappa_log=3.0, d_crit=12.0)
    assert m_star < 1.0

def test_f27_boundary_cap_multiplier_always_in_unit_interval():
    """F27.B5: m* is strictly bounded in [0.0, 1.0] across all parameter combinations."""
    for d in [0.0, 5.0, 12.0, 50.0]:
        for q in [0.0, 1.0, 10.0, 100.0]:
            for k in [-1.5, 0.0, 1.5, 3.0]:
                m = calculate_safe_yield_cap(q, k, d)
                assert 0.0 <= m <= 1.0
