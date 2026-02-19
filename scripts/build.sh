#!/bin/bash
# Build script with database setup for Vercel

echo "🏗️  Starting build process..."

# Use non-pooling URL for Prisma compatibility (pgbouncer causes prepared statement issues)
if [ -n "$DATABASE_URL" ]; then
  echo "✅ Using DATABASE_URL from environment"
elif [ -n "$POSTGRES_URL_NON_POOLING" ]; then
  export DATABASE_URL="$POSTGRES_URL_NON_POOLING"
  echo "✅ DATABASE_URL from POSTGRES_URL_NON_POOLING (pgbouncer-safe)"
elif [ -n "$POSTGRES_URL" ]; then
  export DATABASE_URL="$POSTGRES_URL"
  echo "⚠️  Using POSTGRES_URL (may have pgbouncer issues)"
elif [ -n "$POSTGRES_HOST" ] && [ -n "$POSTGRES_USER" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DATABASE:-postgres}?sslmode=require"
  echo "✅ DATABASE_URL constructed from POSTGRES_* variables"
else
  echo "⚠️  No DATABASE_URL available during build"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build Next.js
echo "📦 Building Next.js application..."
npx next build

echo ""
echo "✅ Build complete!"
