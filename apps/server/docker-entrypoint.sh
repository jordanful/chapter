#!/bin/sh
set -e

echo "Running database setup..."
npx prisma db push --skip-generate
npx prisma generate

echo "Starting server..."
exec node dist/server.js
