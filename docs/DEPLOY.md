# AquaPulse Deployment Record

**Date**: 2026-10-05
**Gate G1 Selection**: Option C (Tier-0 Static Core - fully deterministic client-side calculation)

## 1. Production Platform (Vercel)
- **Domain**: https://aquapulse-gamma.vercel.app
- **Deployment ID**: `dpl_B3w4DXEmotuVDf5JPyBaRkuvDs7x`
- **Root HTTP**: 200 OK
- **Snapshot Endpoint**: https://aquapulse-gamma.vercel.app/snapshot.json (200 OK, Zone-A B_REF 130.0, Pool 104.0)
- **Playwright E2E Suite**: 9/9 passed (3 Tier-0 network-disabled + 3 network-enabled + 3 DOM provenance)

## 2. Multi-Platform Deployment (Railway)
- **Domain**: https://aquapulse-production.up.railway.app
- **Project**: aquapulse (`23e37cbf-b193-449f-97e9-e48b15abf002`)
- **Service**: aquapulse (`0802cf6b-ef84-46b2-97bd-c5fafbc08b62`)
- **Runtime**: Docker multi-stage (Node 20 build -> Nginx Alpine static serving)

## 3. Basemap & Upstream Health
- **ESRI World Imagery**: 200 OK (matches baseline SHA256)
- **OpenFreeMap**: 200 OK (matches baseline SHA256)
