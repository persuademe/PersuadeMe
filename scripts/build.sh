#!/bin/bash
# Build script with database setup for Vercel

echo "🏗️  Starting build process..."

# Export DATABASE_URL from Vercel + Supabase environment variables
if [ -n "$POSTGRES_HOST" ] && [ -n "$POSTGRES_USER" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DATABASE:-postgres}?sslmode=require"
  echo "✅ DATABASE_URL constructed from Vercel environment"
else
  echo "⚠️  No POSTGRES_* variables found, using DATABASE_URL if set"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push schema to database (if DATABASE_URL is available)
if [ -n "$DATABASE_URL" ]; then
  echo "🗄️  Pushing database schema..."
  npx prisma db push
else
  echo "⚠️  DATABASE_URL not set - skipping database push"
  echo "   This is expected in local development without a local database"
fi

# Build Next.js
echo "📦 Building Next.js application..."
next build

echo "✅ Build complete!"
