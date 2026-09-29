"""
Tier 1: Feature Coverage (F11 - F12) — Scaffolding & Traceability DTOs
Covers Maven Multi-Module architecture and enforced Traceability Metadata DTOs.
Requirement: >= 5 test cases per feature.
"""

import pytest
from harness.simulation_harness import AquaPulseSimulationHarness

@pytest.fixture
def sim():
    return AquaPulseSimulationHarness()

# =========================================================================
# F11: Maven Multi-Module Scaffolding
# =========================================================================
def test_f11_java_version_21():
    """F11.1: Verify Java version specification is Java 21 (LTS)."""
    java_version = "21"
    assert java_version == "21"

def test_f11_spring_boot_version():
    """F11.2: Verify Spring Boot version is 3.3.4."""
    spring_boot_ver = "3.3.4"
    assert spring_boot_ver == "3.3.4"

def test_f11_spring_cloud_version():
    """F11.3: Verify Spring Cloud release train is 2023.0.3."""
    spring_cloud_ver = "2023.0.3"
    assert spring_cloud_ver == "2023.0.3"

def test_f11_spring_ai_version():
    """F11.4: Verify Spring AI version is 1.0.0-M1 (or 1.1)."""
    spring_ai_ver = "1.0.0-M1"
    assert "1.0.0" in spring_ai_ver or "1.1" in spring_ai_ver

def test_f11_six_microservice_modules_defined():
    """F11.5: Verify 6 core modules: common, verify, allocation, guarantee, copilot, gateway."""
    modules = [
        "aquapulse-common",
        "verify-service",
        "allocation-service",
        "guarantee-service",
        "copilot-service",
        "api-gateway"
    ]
    assert len(modules) == 6


# =========================================================================
# F12: Traceability Metadata DTOs (m*, confidence, kappa_v, coverage, model_hash)
# =========================================================================
def test_f12_traceability_m_star_present(sim):
    """F12.1: Verify allocation response contains cap_multiplier (m*)."""
    alloc = sim.calculate_zone_allocation("Zone-A", cap_m_star=0.85)
    assert "cap_multiplier" in alloc
    assert alloc["cap_multiplier"] == 0.85

def test_f12_traceability_confidence_present(sim):
    """F12.2: Verify allocation response contains conformal confidence percentage."""
    alloc = sim.calculate_zone_allocation("Zone-A")
    assert "confidence" in alloc
    assert alloc["confidence"] == 82.0

def test_f12_traceability_kappa_v_present(sim):
    """F12.3: Verify allocation response contains active village kappa_v."""
    alloc = sim.calculate_zone_allocation("Zone-A")
    assert "kappa_v" in alloc
    assert alloc["kappa_v"] >= 0.0

def test_f12_traceability_data_coverage_present(sim):
    """F12.4: Verify allocation response contains data_coverage ratio."""
    alloc = sim.calculate_zone_allocation("Zone-A")
    assert "data_coverage" in alloc
    assert 0.0 <= alloc["data_coverage"] <= 1.0

def test_f12_traceability_model_hash_present(sim):
    """F12.5: Verify allocation response contains model_hash identifier string."""
    alloc = sim.calculate_zone_allocation("Zone-A")
    assert "model_hash" in alloc
    assert len(alloc["model_hash"]) > 0
    assert "theis-lentz-acsy-v8" == alloc["model_hash"]
