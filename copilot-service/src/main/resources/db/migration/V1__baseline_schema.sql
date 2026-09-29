-- AquaPulse v8: Migration V1 - Baseline Schema
-- Target: PostgreSQL 16 / Neon Serverless (pgvector)

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. zones
CREATE TABLE zones (
    id VARCHAR(64) PRIMARY KEY,
    gec_unit TEXT NOT NULL,
    dcrit_m NUMERIC(8, 3) NOT NULL,
    region TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_zones_dcrit CHECK (dcrit_m > 0)
);

-- 2. farmers
CREATE TABLE farmers (
    id VARCHAR(64) PRIMARY KEY,
    zone VARCHAR(64) NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    acres NUMERIC(8, 2) NOT NULL,
    floor_m3 NUMERIC(10, 2) NOT NULL DEFAULT 5.0,
    karma NUMERIC(10, 2) NOT NULL DEFAULT 10.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_farmers_acres CHECK (acres > 0),
    CONSTRAINT chk_farmers_floor CHECK (floor_m3 >= 0),
    CONSTRAINT chk_farmers_karma CHECK (karma >= 0)
);

-- 3. readings
CREATE TABLE readings (
    id VARCHAR(64) PRIMARY KEY,
    farmer_id VARCHAR(64) NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
    t_event TIMESTAMPTZ NOT NULL,
    reported_hours NUMERIC(8, 2) NOT NULL,
    electricity_implied_hours NUMERIC(8, 2) NOT NULL,
    trust NUMERIC(5, 4) NOT NULL,
    verified_hours NUMERIC(8, 2) NOT NULL,
    prov TEXT NOT NULL,
    sig TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_readings_prov CHECK (prov IN ('LIVE', 'REPLAY', 'SYNTH')),
    CONSTRAINT chk_readings_trust CHECK (trust >= 0.0 AND trust <= 1.0),
    CONSTRAINT chk_readings_non_neg CHECK (
        reported_hours >= 0 AND electricity_implied_hours >= 0 AND verified_hours >= 0
    )
);

-- 4. village_kappa
CREATE TABLE village_kappa (
    village_id VARCHAR(64) PRIMARY KEY,
    kappa NUMERIC(8, 4) NOT NULL DEFAULT 1.0000,
    ess NUMERIC(8, 2) NOT NULL DEFAULT 150.00,
    seasons_observed INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_village_kappa_val CHECK (kappa > 0),
    CONSTRAINT chk_village_kappa_ess CHECK (ess >= 0),
    CONSTRAINT chk_village_kappa_seasons CHECK (seasons_observed >= 0)
);

-- 5. seasons
CREATE TABLE seasons (
    id VARCHAR(64) PRIMARY KEY,
    zone VARCHAR(64) NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    cap_multiplier NUMERIC(6, 4) NOT NULL,
    kappa NUMERIC(8, 4) NOT NULL,
    confidence NUMERIC(5, 4) NOT NULL,
    model_hash TEXT NOT NULL,
    outcome_ok BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_seasons_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_seasons_cap CHECK (cap_multiplier >= 0.0 AND cap_multiplier <= 1.0)
);

-- 6. allocations
CREATE TABLE allocations (
    id VARCHAR(64) PRIMARY KEY,
    season VARCHAR(64) NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
    farmer_id VARCHAR(64) NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
    hours NUMERIC(8, 2) NOT NULL,
    credits_spent NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    cert_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_allocations_season_farmer UNIQUE (season, farmer_id),
    CONSTRAINT chk_allocations_hours CHECK (hours >= 0),
    CONSTRAINT chk_allocations_credits CHECK (credits_spent >= 0)
);

-- 7. ledger_roots
CREATE TABLE ledger_roots (
    day DATE PRIMARY KEY,
    root TEXT NOT NULL,
    chain TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. audit_queue
CREATE TABLE audit_queue (
    id BIGSERIAL PRIMARY KEY,
    farmer_id VARCHAR(64) NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    season VARCHAR(64) NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    z_score NUMERIC(8, 3) NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    verified_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT chk_audit_queue_status CHECK (
        status IN ('open', 'investigating', 'resolved', 'escalated', 'verified', 'dismissed')
    )
);

-- 9. rule_proposals
CREATE TABLE rule_proposals (
    id VARCHAR(64) PRIMARY KEY,
    proposed_by TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    structured_json JSONB NOT NULL,
    safety_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending_review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT chk_rule_proposals_status CHECK (
        status IN ('pending_review', 'approved', 'rejected')
    )
);

-- 10. doc_chunks
CREATE TABLE doc_chunks (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
