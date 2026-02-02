#!/bin/bash
#
# Chapter installer
# Usage: curl -sSL https://raw.githubusercontent.com/jordanful/chapter/master/install.sh | bash
#

set -e

echo "Installing Chapter..."

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    echo "Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Create directory
mkdir -p ~/chapter
cd ~/chapter

# Download docker-compose.yml
echo "Downloading configuration..."
curl -sSL https://raw.githubusercontent.com/jordanful/chapter/master/docker-compose.yml -o docker-compose.yml

# Generate secrets if .env doesn't exist
if [ ! -f .env ]; then
    echo "Generating secure configuration..."
    cat > .env << EOF
JWT_SECRET=$(openssl rand -base64 48 | tr -d '=/+')
EOF
fi

# Start services
echo "Starting Chapter..."
docker compose pull
docker compose up -d

echo ""
echo "Chapter is starting up!"
echo ""
echo "Open http://localhost in your browser."
echo ""
echo "Useful commands:"
echo "  cd ~/chapter"
echo "  docker compose logs -f    # View logs"
echo "  docker compose down       # Stop"
echo "  docker compose pull       # Update"
echo ""
