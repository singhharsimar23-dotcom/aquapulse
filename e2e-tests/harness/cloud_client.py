"""
AquaPulse v8 — Cloud HTTP Client
Connects to live cloud endpoints (Spring Cloud Gateway, Render, Cloud Run)
with JWT authentication and Upstash rate-limit headers.
"""

import os
import requests
from typing import Dict, Any, Optional

class AquaPulseCloudClient:
    """Client for executing E2E tests against live cloud endpoints."""
    def __init__(self, base_url: Optional[str] = None, jwt_token: Optional[str] = None):
        self.base_url = base_url or os.environ.get("AQUAPULSE_ENDPOINT_URL", "http://localhost:8080").rstrip('/')
        self.jwt_token = jwt_token or os.environ.get("AQUAPULSE_JWT_TOKEN", "")
        self.session = requests.Session()
        if self.jwt_token:
            self.session.headers.update({"Authorization": f"Bearer {self.jwt_token}"})
        self.session.headers.update({"Content-Type": "application/json"})

    def health_check(self) -> Dict[str, Any]:
        resp = self.session.get(f"{self.base_url}/actuator/health", timeout=10)
        return resp.json()

    def ingest_reading(self, reading_dto: Dict[str, Any]) -> Dict[str, Any]:
        resp = self.session.post(f"{self.base_url}/api/readings", json=reading_dto, timeout=10)
        resp.raise_for_status()
        return resp.json()

    def get_zone_status(self, zone_id: str) -> Dict[str, Any]:
        resp = self.session.get(f"{self.base_url}/api/zones/{zone_id}/status", timeout=10)
        resp.raise_for_status()
        return resp.json()

    def get_zone_allocations(self, zone_id: str) -> Dict[str, Any]:
        resp = self.session.get(f"{self.base_url}/api/zones/{zone_id}/allocations", timeout=10)
        resp.raise_for_status()
        return resp.json()

    def get_farmer_allocation(self, farmer_id: str) -> Dict[str, Any]:
        resp = self.session.get(f"{self.base_url}/api/farmers/{farmer_id}/allocation", timeout=10)
        resp.raise_for_status()
        return resp.json()

    def verify_merkle_receipt(self, cert_hash: str) -> Dict[str, Any]:
        resp = self.session.get(f"{self.base_url}/api/verify/{cert_hash}", timeout=10)
        resp.raise_for_status()
        return resp.json()

    def close_season(self, season_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        resp = self.session.post(f"{self.base_url}/api/season/{season_id}/close", json=payload, timeout=10)
        resp.raise_for_status()
        return resp.json()

    def submit_rule_proposal(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        resp = self.session.post(f"{self.base_url}/api/rule-proposals", json=proposal, timeout=10)
        resp.raise_for_status()
        return resp.json()

    def query_copilot_ask(self, query: str) -> Dict[str, Any]:
        resp = self.session.post(f"{self.base_url}/api/copilot/ask", json={"query": query}, timeout=10)
        resp.raise_for_status()
        return resp.json()
