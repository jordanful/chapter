#!/bin/bash

set -e

echo "Setting up Chapter for development..."
echo ""

# Check prerequisites
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "Error: $1 is not installed."
        echo "Please install $1 first."
        [ -n "$2" ] && echo "  $2"
        exit 1
    fi
}

check_command "pnpm" "Install with: npm install -g pnpm"
check_command "docker" "Install from: https://docs.docker.com/get-docker/"

# Install dependencies
echo "[1/4] Installing dependencies..."
pnpm install

# Setup environment files
echo "[2/4] Setting up environment files..."

if [ ! -f apps/server/.env ]; then
    cp apps/server/.env.example apps/server/.env
    echo "  Created apps/server/.env"
else
    echo "  apps/server/.env already exists"
fi

if [ ! -f apps/web/.env.local ]; then
    cp apps/web/.env.example apps/web/.env.local
    echo "  Created apps/web/.env.local"
else
    echo "  apps/web/.env.local already exists"
fi

# Create data directory
echo "[3/4] Creating data directories..."
mkdir -p apps/server/data/books apps/server/data/audio
echo "  Created apps/server/data/"

# Start Redis
echo "[4/4] Starting Redis..."
if ! docker ps -a --format '{{.Names}}' | grep -q '^chapter-redis$'; then
    docker run -d -p 6379:6379 --name chapter-redis redis:7-alpine
    echo "  Started Redis"
else
    docker start chapter-redis 2>/dev/null || true
    echo "  Redis already exists, started"
fi

# Setup database
echo ""
echo "Setting up database..."
cd apps/server
pnpm db:generate
pnpm db:push
cd ../..

echo ""
echo "============================================"
echo "  Development setup complete!"
echo "============================================"
echo ""
echo "To start the development servers:"
echo ""
echo "  pnpm dev"
echo ""
echo "This starts both the API server and web client:"
echo "  - Web:  http://localhost:3000"
echo "  - API:  http://localhost:3001"
echo ""
echo "Optional: Start Kokoro TTS for audiobook features:"
echo ""
echo "  cd services/kokoro"
echo "  docker build -t chapter-kokoro ."
echo "  docker run -d -p 5000:5000 --name chapter-kokoro chapter-kokoro"
echo ""
echo "Other useful commands:"
echo "  pnpm test         # Run tests"
echo "  pnpm lint         # Lint code"
echo "  pnpm db:studio    # Open database GUI (from apps/server)"
echo ""
