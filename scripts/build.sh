#!/bin/bash
# Build script with database setup for Vercel

echo "🏗️  Starting build process..."

# Export DATABASE_URL from Vercel + Supabase environment variables
if [ -n "$POSTGRES_HOST" ] && [ -n "$POSTGRES_USER" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DATABASE:-postgres}?sslmode=require"
  echo "✅ DATABASE_URL constructed from Vercel environment"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Note: Database schema push happens at runtime via /api/db/init
# This is because Vercel's build infrastructure may not have direct DB access
# The API routes will use Prisma's connection pooling for serverless functions

if [ -n "$DATABASE_URL" ]; then
  echo "🗄️  Database URL available - schema will be managed at runtime"
else
  echo "⚠️  DATABASE_URL not available during build"
  echo "   Database schema will be initialized on first API request"
fi

# Build Next.js
echo "📦 Building Next.js application..."
next build

echo ""
echo "✅ Build complete!"
echo ""
echo "📝 Database Setup:"
echo "   - Production: Vercel serverless functions connect to Supabase at runtime"
echo "   - Local: Run ./scripts/setup-database.sh to initialize local database"
