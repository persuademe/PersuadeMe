# Supabase Integration Guide for Vercel

## Quick Connect via Vercel Dashboard

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard/persuademe/persuade-me

2. **Navigate to Storage Tab**
   - Click on your project → **Storage** tab
   - Click **Create Database** → **Supabase**

3. **Connect or Create Supabase Account**
   - Sign in with GitHub or email
   - Create a new project or select existing

4. **Copy Connection String**
   - Go to Project Settings → Database → Connection string
   - Format: `postgresql://user:password@host:5432/postgres`

5. **Add to Vercel Environment**
   - In Vercel Dashboard → Settings → Environment Variables
   - Add: `DATABASE_URL` = your connection string
   - Add to: Production, Preview, Development

## Alternative: Create Supabase Directly

1. Go to https://database.new/persuade-me
2. Create a new project
3. Copy connection string from Settings → Database
4. Add to Vercel as above

## After Connecting Database

```bash
# Pull environment variables
npx vercel env pull

# Push schema to database
npx prisma db push

# Deploy with new database
npx vercel --prod
```

## Your Vercel Project Details

- **Project ID:** `prj_MoXUIdoGoQWxr6X6MgLIkzXUbJRd`
- **Project URL:** https://vercel.com/persuademe/persuade-me
- **Deployment URL:** https://persuade-me.vercel.app

## Troubleshooting

### Connection Errors
- Ensure your IP is allowlisted in Supabase (Settings → Network)
- Use SSL: add `?sslmode=require` to connection string

### Build Errors
- Make sure `DATABASE_URL` is set in Vercel Environment Variables
- Redeploy after adding environment variables
