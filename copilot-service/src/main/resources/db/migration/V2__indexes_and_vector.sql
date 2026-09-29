-- AquaPulse v8: Migration V2 - Secondary Indexes, JSONB GIN, and HNSW Vector Index
-- Target: PostgreSQL 16 / Neon Serverless (pgvector)

-- Foreign Key & Common Query Selectors
CREATE INDEX idx_farmers_zone ON farmers(zone);
CREATE INDEX idx_readings_farmer_event ON readings(farmer_id, t_event DESC);
CREATE INDEX idx_readings_prov ON readings(prov);
CREATE INDEX idx_seasons_zone ON seasons(zone);
CREATE INDEX idx_seasons_dates ON seasons(start_date, end_date);
CREATE INDEX idx_allocations_cert_hash ON allocations(cert_hash);
CREATE INDEX idx_allocations_farmer ON allocations(farmer_id);
CREATE INDEX idx_audit_queue_status ON audit_queue(status);
CREATE INDEX idx_audit_queue_farmer_season ON audit_queue(farmer_id, season);
CREATE INDEX idx_rule_proposals_status ON rule_proposals(status);
CREATE INDEX idx_doc_chunks_source ON doc_chunks(source);

-- GIN Index for Fast JSONB Rule Queries
CREATE INDEX idx_rule_proposals_json ON rule_proposals USING gin(structured_json);

-- HNSW Vector Index for Cosine Similarity RAG Retrieval (m = 16, ef_construction = 64)
CREATE INDEX idx_doc_chunks_hnsw 
ON doc_chunks USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
