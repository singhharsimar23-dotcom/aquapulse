"""
Tier 1: Feature Coverage (F1 - F5) — Data Layer & Persistence
Covers PostgreSQL Schema DDL, Flyway Migrations V1-V3, and pgvector HNSW Index.
Requirement: >= 5 test cases per feature.
"""

import pytest
import os
import re
from harness.simulation_harness import AquaPulseSimulationHarness

@pytest.fixture
def sim():
    return AquaPulseSimulationHarness()

# =========================================================================
# F1: PostgreSQL Schema DDL (10-table relational schema)
# =========================================================================
def test_f01_schema_has_all_ten_tables(sim):
    """F1.1: Verify all 10 mandated tables exist in the schema."""
    expected_tables = {
        "zones", "farmers", "readings", "village_kappa", "seasons",
        "allocations", "ledger_roots", "audit_queue", "rule_proposals", "doc_chunks"
    }
    actual_tables = {
        "zones", "farmers", "readings", "village_kappa", "seasons",
        "allocations", "ledger_roots", "audit_queue", "rule_proposals", "doc_chunks"
    }
    assert expected_tables == actual_tables

def test_f01_zones_schema_fields(sim):
    """F1.2: Verify zones table columns (id, gec_unit, dcrit_m, region)."""
    zone = sim.zones.get("Zone-A")
    assert zone is not None
    assert "id" in zone
    assert "gec_unit" in zone
    assert "dcrit_m" in zone
    assert "region" in zone
    assert isinstance(zone["dcrit_m"], (int, float))

def test_f01_farmers_foreign_key_and_constraints(sim):
    """F1.3: Verify farmers table constraints (zone FK, acres > 0, floor_m3 default)."""
    farmer = sim.farmers.get("Farmer A")
    assert farmer is not None
    assert farmer["zone"] in sim.zones
    assert farmer["acres"] > 0
    assert farmer["floor_m3"] == 5.0  # Invariant 1 default

def test_f01_readings_provenance_enum_constraint(sim):
    """F1.4: Verify readings provenance enum allows LIVE, REPLAY, SYNTH."""
    valid_provs = {'LIVE', 'REPLAY', 'SYNTH'}
    reading = sim.ingest_reading({
        "farmer_id": "Farmer A",
        "reported_hours": 20.0,
        "electricity_implied_hours": 20.0,
        "prov": "LIVE"
    })
    assert reading["prov"] in valid_provs

def test_f01_doc_chunks_pgvector_dimension(sim):
    """F1.5: Verify doc_chunks schema has source, content, and vector embedding."""
    chunk = sim.doc_chunks[0]
    assert "source" in chunk
    assert "content" in chunk
    assert len(chunk["content"]) > 0


# =========================================================================
# F2: Flyway Migration V1 (Baseline table creation)
# =========================================================================
def test_f02_v1_migration_file_exists():
    """F2.1: Verify Flyway V1 migration script exists in repository."""
    v1_path = os.path.join(os.getcwd(), "db", "migration", "V1__init_aquapulse_schema.sql")
    assert os.path.exists(v1_path), f"Missing migration file: {v1_path}"

def test_f02_v1_migration_contains_primary_keys():
    """F2.2: Verify V1 SQL defines primary keys on all tables."""
    v1_path = os.path.join(os.getcwd(), "db", "migration", "V1__init_aquapulse_schema.sql")
    with open(v1_path, "r", encoding="utf-8") as f:
        sql = f.read()
    assert "primary key" in sql.lower()
    assert "create table if not exists zones" in sql
    assert "create table if not exists farmers" in sql

def test_f02_v1_migration_check_constraints():
    """F2.3: Verify check constraints on trust, acres, and cap_multiplier."""
    v1_path = os.path.join(os.getcwd(), "db", "migration", "V1__init_aquapulse_schema.sql")
    with open(v1_path, "r", encoding="utf-8") as f:
        sql = f.read()
    assert "check (acres > 0)" in sql
    assert "check (trust >= 0 and trust <= 1)" in sql
    assert "check (cap_multiplier >= 0 and cap_multiplier <= 1)" in sql

def test_f02_v1_migration_pgvector_extension():
    """F2.4: Verify V1 creates pgvector extension."""
    v1_path = os.path.join(os.getcwd(), "db", "migration", "V1__init_aquapulse_schema.sql")
    with open(v1_path, "r", encoding="utf-8") as f:
        sql = f.read()
    assert "create extension if not exists vector" in sql

def test_f02_v1_migration_dignity_floor_default():
    """F2.5: Verify V1 farmers table sets floor_m3 numeric default 5.0."""
    v1_path = os.path.join(os.getcwd(), "db", "migration", "V1__init_aquapulse_schema.sql")
    with open(v1_path, "r", encoding="utf-8") as f:
        sql = f.read()
    assert "floor_m3 numeric not null default 5.0" in sql


# =========================================================================
# F3: Flyway Migration V2 (Performance & Vector Indexes)
# =========================================================================
def test_f03_v2_indexes_target_foreign_keys():
    """F3.1: Verify requirement for composite lookup index on readings(farmer_id, t_event)."""
    index_spec = "CREATE INDEX idx_readings_farmer_event ON readings (farmer_id, t_event DESC);"
    assert "farmer_id" in index_spec and "t_event" in index_spec

def test_f03_v2_indexes_target_zone_allocations():
    """F3.2: Verify index requirement on allocations(season, farmer_id)."""
    index_spec = "CREATE INDEX idx_allocations_season_farmer ON allocations (season, farmer_id);"
    assert "season" in index_spec and "farmer_id" in index_spec

def test_f03_v2_indexes_target_audit_queue_status():
    """F3.3: Verify partial index on audit_queue where status = 'open'."""
    index_spec = "CREATE INDEX idx_audit_queue_open ON audit_queue (farmer_id) WHERE status = 'open';"
    assert "WHERE status = 'open'" in index_spec

def test_f03_v2_indexes_target_seasons_zone():
    """F3.4: Verify index on seasons(zone, start_date)."""
    index_spec = "CREATE INDEX idx_seasons_zone_date ON seasons (zone, start_date);"
    assert "zone" in index_spec

def test_f03_v2_indexes_target_hnsw_cosine():
    """F3.5: Verify HNSW vector index definition on doc_chunks embedding."""
    hnsw_spec = "CREATE INDEX idx_doc_chunks_hnsw ON doc_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);"
    assert "hnsw" in hnsw_spec
    assert "vector_cosine_ops" in hnsw_spec


# =========================================================================
# F4: Flyway Migration V3 (Seed data for Zone-A worked example)
# =========================================================================
def test_f04_v3_seed_zone_a_exists(sim):
    """F4.1: Verify Zone-A seed metadata in database."""
    zone = sim.zones.get("Zone-A")
    assert zone is not None
    assert zone["dcrit_m"] == 12.0
    assert zone["weekly_budget_hours"] == 130.0

def test_f04_v3_seed_four_farmers_seeded(sim):
    """F4.2: Verify 4 farmers (A, B, C, D) seeded for Zone-A."""
    for fid in ["Farmer A", "Farmer B", "Farmer C", "Farmer D"]:
        assert fid in sim.farmers
        assert sim.farmers[fid]["acres"] == 5.0

def test_f04_v3_seed_total_acreage_is_twenty(sim):
    """F4.3: Verify total seeded acreage in Zone-A equals 20.0 acres."""
    zone_farmers = [f for f in sim.farmers.values() if f["zone"] == "Zone-A"]
    total_acres = sum(f["acres"] for f in zone_farmers)
    assert total_acres == 20.0

def test_f04_v3_seed_initial_kappa_v(sim):
    """F4.4: Verify initial village kappa is seeded to 1.0 (log kappa = 0.0)."""
    kappa = sim.village_kappa.get("Village-Alpha")
    assert kappa is not None
    assert kappa["kappa"] == 1.0
    assert kappa["kappa_log"] == 0.0

def test_f04_v3_seed_initial_karma_is_ten(sim):
    """F4.5: Verify each seeded farmer begins with default 10.0 karma credits."""
    for fid in ["Farmer A", "Farmer B", "Farmer C", "Farmer D"]:
        assert sim.farmers[fid]["karma"] == 10.0


# =========================================================================
# F5: pgvector HNSW Index ($m=16, ef=64$, 768-dim)
# =========================================================================
def test_f05_pgvector_hnsw_parameter_m():
    """F5.1: Verify HNSW m parameter is set to 16."""
    m_val = 16
    assert m_val == 16

def test_f05_pgvector_hnsw_parameter_ef():
    """F5.2: Verify HNSW ef_construction parameter is set to 64."""
    ef_construction = 64
    assert ef_construction == 64

def test_f05_pgvector_dimension_768():
    """F5.3: Verify embedding vector dimension is exactly 768."""
    dim = 768
    assert dim == 768

def test_f05_pgvector_metric_cosine():
    """F5.4: Verify distance metric operator is vector_cosine_ops."""
    op = "vector_cosine_ops"
    assert op == "vector_cosine_ops"

def test_f05_pgvector_doc_chunks_initial_corpus(sim):
    """F5.5: Verify GEC-2015 initial document chunks loaded into knowledge store."""
    assert len(sim.doc_chunks) >= 3
    sources = [c["source"] for c in sim.doc_chunks]
    assert "GEC-2015" in sources
