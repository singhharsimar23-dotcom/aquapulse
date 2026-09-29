#!/usr/bin/env bash
# AquaPulse v8 — Quick Start Script (online-only, no local infra required)
# Prerequisites: Java 21, Maven 3.9+, Node 20+, Python 3.11+
# All cloud services: Neon (Postgres), Upstash (Redis), Groq (LLM)

set -e

echo "=========================================="
echo " AquaPulse v8 — Guaranteed Water Ledger"
echo "=========================================="

# 1. Check .env
if [ ! -f ".env" ]; then
  echo "❌  .env not found. Copy .env.example to .env and fill in your values."
  exit 1
fi
source .env

# 2. Run E2E tests (simulation-only, no services needed)
echo "▶  Running E2E tests (simulation harness)..."
cd e2e-tests
python -m pytest -q --tb=short
cd ..
echo "✅  E2E tests passed"

# 3. Run stress harness
echo "▶  Running algorithm stress tests..."
python stress/aquapulse_stress.py
echo "✅  Stress tests passed"

# 4. Build all Java services
echo "▶  Building Java services (Maven multi-module)..."
mvn -q clean package -DskipTests
echo "✅  Maven build complete"

# 5. Start services (background)
echo "▶  Starting services..."
java -jar verify-service/target/*.jar --spring.datasource.url="$NEON_URL" &
sleep 3
java -jar allocation-service/target/*.jar --spring.datasource.url="$NEON_URL" &
sleep 3
java -jar guarantee-service/target/*.jar --spring.datasource.url="$NEON_URL" &
sleep 3
java -jar copilot-service/target/*.jar &
sleep 3
java -jar api-gateway/target/*.jar &
sleep 5

# 6. Build and serve frontend
echo "▶  Building frontend..."
cd frontend
npm install --silent
npm run build
echo "✅  Frontend built at frontend/dist/"
cd ..

echo ""
echo "=========================================="
echo " AquaPulse v8 is running!"
echo " API Gateway:  http://localhost:8080"
echo " Dashboard:    open frontend/dist/index.html"
echo " Zone-A test:  curl http://localhost:8080/api/guarantee/zones/zone-a/cap"
echo "=========================================="
