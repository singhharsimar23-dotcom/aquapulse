-- AquaPulse v8: Migration V3 - Zone-A Worked Example Benchmark Seed Data
-- Reproduces Acceptance Criteria: 116.0h Rep, 144.0h Elec, 124.8h Ver, 96.0% Critical, 104.0h Pool, Farmer C 26.0h

-- 1. Seed Zone-A Metadata
INSERT INTO zones (id, gec_unit, dcrit_m, region) 
VALUES ('zone-a', 'GEC-Unit-North-01', 12.000, 'North Gujarat')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed 4 Farmers (A, B, C, D) with 5.0 acres each, 10 Karma, and Dignity Floor 5.0 m3
INSERT INTO farmers (id, zone, acres, floor_m3, karma) VALUES
('Farmer A', 'zone-a', 5.00, 5.00, 10.00),
('Farmer B', 'zone-a', 5.00, 5.00, 10.00),
('Farmer C', 'zone-a', 5.00, 5.00, 10.00),
('Farmer D', 'zone-a', 5.00, 5.00, 10.00)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Initial Village Conformal Tracking State
INSERT INTO village_kappa (village_id, kappa, ess, seasons_observed)
VALUES ('village-01', 1.0000, 150.00, 0)
ON CONFLICT (village_id) DO NOTHING;

-- 4. Seed Initial Season for Zone-A (Week 39, 2026)
INSERT INTO seasons (id, zone, start_date, end_date, cap_multiplier, kappa, confidence, model_hash, outcome_ok)
VALUES ('season-2026-W39', 'zone-a', '2026-09-21', '2026-09-28', 0.8000, 1.0000, 0.9000, 'theis-lentz-acsy-v8', NULL)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Telemetry Readings Generating Exact Benchmark Metrics:
-- Farmer A: Rep 28.0, Elec 28.0 -> Trust 1.0000, Ver 28.0
-- Farmer B: Rep 30.0, Elec 30.0 -> Trust 1.0000, Ver 30.0
-- Farmer C: Rep 20.0, Elec 50.0 -> Trust 0.4000, Ver 38.0
-- Farmer D: Rep 38.0, Elec 36.0 -> Trust 0.9474, Ver 28.8
-- Totals: Reported = 116.0h, Electricity = 144.0h, Verified = 124.8h
INSERT INTO readings (id, farmer_id, t_event, reported_hours, electricity_implied_hours, trust, verified_hours, prov, sig) VALUES
('reading-za-w39-fa', 'Farmer A', '2026-09-27 18:00:00+00', 28.00, 28.00, 1.0000, 28.00, 'SYNTH', 'sig:farmer-a:w39'),
('reading-za-w39-fb', 'Farmer B', '2026-09-27 18:00:00+00', 30.00, 30.00, 1.0000, 30.00, 'SYNTH', 'sig:farmer-b:w39'),
('reading-za-w39-fc', 'Farmer C', '2026-09-27 18:00:00+00', 20.00, 50.00, 0.4000, 38.00, 'SYNTH', 'sig:farmer-c:w39'),
('reading-za-w39-fd', 'Farmer D', '2026-09-27 18:00:00+00', 38.00, 36.00, 0.9474, 28.80, 'SYNTH', 'sig:farmer-d:w39')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Allocations with Verified SHA-256 Merkle Leaf Receipts
-- Leaf hashes computed via: leaf(salt, value) = sha256(0x00 || salt || '||' || value)
-- Root: 45178eecb8e7c8d44cdd757ad893662633ca6f0a3bd8c1a9ef71fee138b23d05
INSERT INTO allocations (id, season, farmer_id, hours, credits_spent, cert_hash) VALUES
('alloc-za-w39-fa', 'season-2026-W39', 'Farmer A', 26.00, 0.00, 'adf5ac162ca01626c655900f11778c141d7bac34366616728a420842ce29536e'),
('alloc-za-w39-fb', 'season-2026-W39', 'Farmer B', 26.00, 0.00, '6aa351a2d010c8f881e2beaca2b2caba066e4e7d09255b675e002ff7dea7341d'),
('alloc-za-w39-fc', 'season-2026-W39', 'Farmer C', 26.00, 0.00, '11f19ffa489ec9a8f05af89f38145d680919f47c4b8e0ec9793a8aa5d0cd72b6'),
('alloc-za-w39-fd', 'season-2026-W39', 'Farmer D', 26.00, 0.00, 'c352eb89f902734378eea75a59c08fbc22cf9361975122adec960d65b3c49cd4')
ON CONFLICT (season, farmer_id) DO NOTHING;

-- 7. Seed Daily Ledger Root
INSERT INTO ledger_roots (day, root, chain)
VALUES ('2026-09-28', '45178eecb8e7c8d44cdd757ad893662633ca6f0a3bd8c1a9ef71fee138b23d05', 'urn:sha256:aquapulse:zone-a:season-2026-W39')
ON CONFLICT (day) DO NOTHING;

-- 8. Seed Audit Queue Escalation for Farmer C (z = 2.450)
INSERT INTO audit_queue (farmer_id, season, z_score, status, verified_by)
VALUES ('Farmer C', 'season-2026-W39', 2.450, 'open', NULL)
ON CONFLICT DO NOTHING;

-- 9. Seed GEC-2015 Knowledge Base Document Chunk for RAG
INSERT INTO doc_chunks (source, content, embedding, metadata)
VALUES (
    'CGWB_GEC_2015_Guidelines.pdf',
    'Stage of Ground Water Extraction is categorized as: Safe (<= 70%), Semi-Critical (> 70% and <= 90%), Critical (> 90% and <= 100%), and Over-Exploited (> 100%). Pumping budgets must be curtailed by tier factors under critical (0.80) and over-exploited (0.65) stress conditions.',
    array_fill(0.01::real, ARRAY[768])::vector,
    '{"category": "classification", "page": 42, "standard": "GEC-2015"}'::jsonb
);
