#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=================================================="
echo "          GUARDIAN AI LAUNCH PROTOCOL            "
echo "  FIFA World Cup 2026 Stadium Command Console   "
echo "=================================================="
echo ""

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to handle shutdown
cleanup() {
    echo ""
    echo "=================================================="
    echo "       SHUTTING DOWN OPERATIONAL SERVERS          "
    echo "=================================================="
    # Kill child processes
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Verify environment variables
if [ ! -f "$ROOT_DIR/.env" ]; then
    echo "⚠️ Warning: .env file not found in root. Generating template..."
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env" 2>/dev/null || true
fi

# Load variables
export $(grep -v '^#' "$ROOT_DIR/.env" | xargs) 2>/dev/null || true

# 2. Configure Python Virtual Environment & Install Dependencies
echo "⚙️ [1/3] Configuring FastAPI backend node..."
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

echo "🔌 Activating virtual environment..."
source venv/bin/activate

echo "📥 Installing python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# 3. Boot Backend Server
echo "🚀 [2/3] Booting FastAPI server on http://localhost:${BACKEND_PORT:-8000}..."
uvicorn app.main:app --host 0.0.0.0 --port ${BACKEND_PORT:-8000} --reload &
BACKEND_PID=$!

# Wait for backend health check to pass
echo "⏳ Waiting for backend telemetry sync..."
for i in {1..30}; do
    if curl -s http://localhost:${BACKEND_PORT:-8000}/health >/dev/null; then
        echo "✅ Backend online and healthy."
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend server timeout. Check logs."
        exit 1
    fi
    sleep 1
done

# 4. Boot Frontend Next.js Server
echo "🚀 [3/3] Launching Next.js UI client on http://localhost:3000..."
cd "$ROOT_DIR/frontend"

# Copy root .env variables to frontend for standard Next.js execution
cp "$ROOT_DIR/.env" "$ROOT_DIR/.env.local" 2>/dev/null || true

npm run dev &
FRONTEND_PID=$!

echo ""
echo "=================================================="
echo "          SYSTEM BOOT SUCCESSFUL!                 "
echo "=================================================="
echo "  Central Command: http://localhost:3000          "
echo "  Telemetry API:   http://localhost:8000/docs     "
echo "=================================================="
echo "Press Ctrl+C to terminate all services."
echo ""

# Keep shell alive
wait
