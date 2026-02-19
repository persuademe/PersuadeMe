#!/bin/bash
# Build script with database setup for Vercel

echo "🏗️  Starting build process..."

# Use Vercel's native DATABASE_URL if available, otherwise construct from Supabase
if [ -n "$DATABASE_URL" ]; then
  echo "✅ Using DATABASE_URL from environment"
elif [ -n "$POSTGRES_URL" ]; then
  # Vercel + Supabase provides individual variables
  export DATABASE_URL="$POSTGRES_URL"
  echo "✅ DATABASE_URL constructed from POSTGRES_URL"
elif [ -n "$POSTGRES_HOST" ] && [ -n "$POSTGRES_USER" ]; then
  # Alternative construction
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DATABASE:-postgres}?sslmode=require"
  echo "✅ DATABASE_URL constructed from POSTGRES_* variables"
else
  echo "⚠️  No DATABASE_URL available during build"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "✅ Build complete!"
echo ""
echo "📝 Database Setup:"
echo "   - Production: Vercel serverless functions connect to Supabase at runtime"
echo "   - Local: Set DATABASE_URL locally and run ./scripts/setup-database.sh"
