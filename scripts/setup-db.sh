#!/bin/bash
# Database Setup Script for Persuade Me
# Run this after adding your DATABASE_URL to .env.local

set -e

echo "🚀 Setting up Persuade Me Database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not found in .env.local"
    echo ""
    echo "📋 To set up your database:"
    echo ""
    echo "1. VERCEL POSTGRES (Recommended):"
    echo "   - Go to https://vercel.com/dashboard/persuademe/databases"
    echo "   - Click 'Create Database' → 'PostgreSQL'"
    echo "   - Copy the connection string"
    echo "   - Add to .env.local: DATABASE_URL='postgresql://...'"
    echo ""
    echo "2. NEON (Free tier):"
    echo "   - Go to https://console.neon.tech"
    echo "   - Create a new project"
    echo "   - Copy the connection string"
    echo "   - Add to .env.local: DATABASE_URL='postgresql://...'"
    echo ""
    echo "3. SUPABASE:"
    echo "   - Go to https://database.new/your-project"
    echo "   - Copy the connection string"
    echo "   - Add to .env.local: DATABASE_URL='postgresql://...'"
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL found"

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

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
echo "   1. Add RPC_URL to .env.local for token gate (optional)"
echo "   2. Add OPENAI_API_KEY for LLM judge (optional)"
echo "   3. Run 'npm run dev' to start development server"
echo "   4. Or deploy to Vercel: 'npx vercel --prod'"
