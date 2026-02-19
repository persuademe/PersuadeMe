#!/bin/bash
# Database setup script - Run locally to initialize the database
# Usage: ./scripts/setup-database.sh

set -e

echo "🗄️  Persuade Me Database Setup"
echo "=============================="
echo ""

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable not set"
  echo ""
  echo "📋 To set up your database:"
  echo ""
  echo "1. VERCEL + SUPABASE (Production):"
  echo "   - Database is managed by Vercel's Supabase integration"
  echo "   - Connection is available at runtime (not during local build)"
  echo "   - For local development, use a local PostgreSQL or create a preview database"
  echo ""
  echo "2. LOCAL POSTGRESQL:"
  echo "   - Install PostgreSQL locally"
  echo "   - Create a database: createdb persuade_me"
  echo "   - Set DATABASE_URL: export DATABASE_URL='postgresql://user:password@localhost:5432/persuade_me'"
  echo ""
  echo "3. NEON (Free tier):"
  echo "   - Go to https://console.neon.tech"
  echo "   - Create a project"
  echo "   - Copy the connection string"
  echo "   - Set DATABASE_URL: export DATABASE_URL='postgresql://...'"
  echo ""
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push schema to database
echo "🗄️  Pushing schema to database..."
npx prisma db push

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Start development server: npm run dev"
echo "   2. Visit http://localhost:3000"
echo "   3. Connect wallet and test the application"
