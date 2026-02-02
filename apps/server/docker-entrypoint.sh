#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate

echo "Starting server..."
exec node dist/server.js
