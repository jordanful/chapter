#!/bin/bash

set -e

echo "🚀 Setting up Chapter..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Navigate to docker directory
cd "$(dirname "$0")/../docker"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env

    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -base64 48)
    sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    rm .env.bak

    # Generate secure postgres password
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    sed -i.bak "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" .env
    rm .env.bak

    echo "✅ Generated secure secrets"
fi

# Pull images
echo "📦 Pulling Docker images..."
docker-compose pull

# Build services
echo "🔨 Building services..."
docker-compose build

# Start services
echo "▶️  Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "🗄️  Running database migrations..."
docker-compose exec -T server sh -c "cd /app && npx prisma migrate deploy" || {
    echo "📝 Creating initial migration..."
    docker-compose exec -T server sh -c "cd /app && npx prisma db push"
}

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Chapter is now running at:"
echo "   - Web: http://localhost"
echo "   - API: http://localhost/api"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: cd docker && docker-compose logs -f"
echo "   - Stop: cd docker && docker-compose down"
echo "   - Restart: cd docker && docker-compose restart"
echo "   - Database shell: cd docker && docker-compose exec postgres psql -U chapter"
echo ""
