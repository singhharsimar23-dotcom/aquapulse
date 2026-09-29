-- AquaPulse v8 Schema Baseline Migration
-- Neon Postgres + pgvector Compatible

-- 1. Zones
create table if not exists zones (
  id text primary key,
  gec_unit text,
  dcrit_m numeric not null,
  region text
);

-- 2. Farmers
create table if not exists farmers (
  id text primary key,
  zone text references zones(id),
  acres numeric not null check (acres > 0),
  floor_m3 numeric not null default 5.0, -- Invariant 1: dignity floor constant
  karma numeric not null default 10.0
);

-- 3. Ingestion & Readings
create table if not exists readings (
  id text primary key,
  farmer_id text references farmers(id),
  t_event timestamptz not null default now(),
  reported_hours numeric not null check (reported_hours >= 0),
  electricity_implied_hours numeric not null check (electricity_implied_hours >= 0),
  trust numeric not null check (trust >= 0 and trust <= 1),
  verified_hours numeric not null check (verified_hours >= 0),
  prov text check (prov in ('LIVE','REPLAY','SYNTH')),
  sig text
);

-- 4. Village Conformal Kappa Tracking (ACSY)
create table if not exists village_kappa (
  village_id text primary key,
  kappa numeric not null default 1.0,
  ess numeric not null default 150.0,
  seasons_observed integer not null default 0,
  last_updated timestamptz not null default now()
);

-- 5. Seasons & Safe-Yield Metadata
create table if not exists seasons (
  id text primary key,
  zone text references zones(id),
  start_date date not null,
  end_date date not null,
  cap_multiplier numeric not null check (cap_multiplier >= 0 and cap_multiplier <= 1),
  kappa numeric not null,
  confidence numeric not null,
  model_hash text not null,
  outcome_ok boolean
);

-- 6. Allocations & Cryptographic Merkle Receipts
create table if not exists allocations (
  id text primary key,
  season text references seasons(id),
  farmer_id text references farmers(id),
  hours numeric not null check (hours >= 0),
  credits_spent numeric not null default 0,
  cert_hash text not null
);

-- 7. Daily Ledger Roots
create table if not exists ledger_roots (
  day date primary key,
  root text not null,
  chain text
);

-- 8. Audit Queue for Human Verification
create table if not exists audit_queue (
  id bigserial primary key,
  farmer_id text references farmers(id),
  season text references seasons(id),
  z_score numeric not null,
  status text not null default 'open' check (status in ('open', 'verified', 'dismissed')),
  verified_by text
);

-- 9. Rule Proposals (Rule Lab)
create table if not exists rule_proposals (
  id text primary key,
  proposed_by text not null,
  raw_text text not null,
  structured_json jsonb not null,
  safety_flags jsonb not null default '[]'::jsonb,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected'))
);

-- 10. Vector Knowledge Base (RAG pgvector)
create extension if not exists vector;

create table if not exists doc_chunks (
  id bigserial primary key,
  source text not null,
  content text not null,
  embedding vector(768)
);

create index if not exists idx_doc_chunks_hnsw on doc_chunks using hnsw (embedding vector_cosine_ops);
