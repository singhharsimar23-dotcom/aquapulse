"""
AquaPulse v8 — Unified Test Client
Switches seamlessly between live Cloud Endpoints and Local Simulation Harness
based on AQUAPULSE_TEST_TARGET environment variable.
"""

import os
from typing import Dict, Any, Optional, List
from .simulation_harness import (
    AquaPulseSimulationHarness,
    lentz_e1,
    theis_drawdown,
    peaceman_radius,
    posterior_tempering_weights,
    update_acsy_kappa,
    calculate_safe_yield_cap,
    run_karma_common_pool_round,
    KarmaAgent,
    build_merkle_tree,
    verify_merkle_receipt,
    merkle_leaf,
    merkle_node,
    NumericGroundingValidator,
    compute_trust,
    compute_verified_hours,
    classify_cgwb_stress,
    DIGNITY_FLOOR_M3
)
from .cloud_client import AquaPulseCloudClient

class AquaPulseTestClient:
    """
    Unified client providing a consistent test interface whether running against
    live cloud deployments or the local in-process simulation harness.
    """
    def __init__(self, target: Optional[str] = None):
        self.target = target or os.environ.get("AQUAPULSE_TEST_TARGET", "sim").lower()
        if self.target == "cloud":
            self.cloud = AquaPulseCloudClient()
            self.sim = None
        else:
            self.sim = AquaPulseSimulationHarness()
            self.cloud = None

    def is_cloud(self) -> bool:
        return self.target == "cloud"

    def reset(self):
        if self.sim:
            self.sim.reset()

    # Ingestion API
    def ingest_reading(self, reading: Dict[str, Any]) -> Dict[str, Any]:
        if self.is_cloud():
            return self.cloud.ingest_reading(reading)
        return self.sim.ingest_reading(reading)

    # Zone Status & Allocations
    def get_zone_allocations(self, zone_id: str, mode: str = "land_proportional", cap_m_star: float = 1.0) -> Dict[str, Any]:
        if self.is_cloud():
            return self.cloud.get_zone_allocations(zone_id)
        return self.sim.calculate_zone_allocation(zone_id, mode=mode, cap_m_star=cap_m_star)

    # Verification of Merkle Proof
    def verify_receipt(self, root: str, salt: str, val: str, proof: List) -> bool:
        return verify_merkle_receipt(root, salt, val, proof)

    # Rate Limiting
    def check_rate_limit(self, client_id: str, max_requests: int = 10, window_seconds: float = 1.0) -> bool:
        if self.is_cloud():
            # Cloud calls return 429 when limited
            return True
        return self.sim.check_rate_limit(client_id, max_requests, window_seconds)

    # RAG Assistant
    def ask_rag(self, query: str) -> Dict[str, Any]:
        if self.is_cloud():
            return self.cloud.query_copilot_ask(query)
        return self.sim.query_rag_assistant(query)
