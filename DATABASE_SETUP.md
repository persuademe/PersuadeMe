# Database Setup Guide

## Option 1: Vercel Postgres (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard/persuademe/databases)
2. Click **Create Database** → **PostgreSQL**
3. Copy the connection string (starts with `postgresql://`)
4. Add to `.env.local`:
   ```bash
   DATABASE_URL='postgresql://user:password@host:5432/db?schema=public'
   ```

## Option 2: Neon (Free Tier)

1. Go to [Neon Console](https://console.neon.tech)
2. Click **Create Project**
3. Choose **Free** tier
4. Copy the connection string from the dashboard
5. Add to `.env.local`

## Option 3: Supabase

1. Go to [Supabase](https://database.new/your-project)
2. Create a new project
3. Copy the connection string from Settings → Database
4. Add to `.env.local`

## After Setting DATABASE_URL

```bash
# Make setup script executable
chmod +x scripts/setup-db.sh

# Run database setup
./scripts/setup-db.sh

# Or manually:
npx prisma generate
npx prisma db push
```

## Deploy to Vercel

```bash
# Deploy to production
npx vercel --prod

# Environment variables are automatically synced from Vercel Dashboard
```

## Troubleshooting

### Connection Refused
- Check if your IP is allowlisted (Neon/Supabase may require this)
- Verify the connection string format

### Prisma Client Error
- Run `npx prisma generate` to regenerate the client
- Make sure `DATABASE_URL` is set in your deployment environment

### Migration Required
- If you need to modify the schema: `npx prisma migrate dev`
- For production: `npx prisma migrate deploy`
