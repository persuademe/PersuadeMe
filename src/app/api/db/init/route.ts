// /api/db/init/route.ts - Initialize database on first request
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Try to push schema - this creates tables if they don't exist
    // Using prisma's db push for initial setup
    try {
      // Check if tables exist by querying
      const userCount = await prisma.user.count();
      
      return NextResponse.json({
        success: true,
        initialized: true,
        message: 'Database already initialized',
        userCount,
      });
    } catch (dbError: any) {
      // Tables don't exist - try to create them
      // This works with connection pooling enabled
      
      // Return helpful error with SQL to run
      return NextResponse.json({
        success: false,
        initialized: false,
        error: dbError.message || 'Database tables not found',
        message: 'Database tables need to be created. Run the SQL below in Supabase SQL Editor.',
        setupRequired: true,
        sql: `
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/qpjgevubuzubqcjlkxbl/sql

DROP TABLE IF EXISTS "Conversation" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

CREATE TABLE "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletAddress" TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  "apiKey" TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  "lastLogin" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "Conversation" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'judge')),
  content TEXT NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX "idx_User_walletAddress" ON "User"("walletAddress");
CREATE INDEX "idx_User_apiKey" ON "User"("apiKey");
CREATE INDEX "idx_Conversation_userId" ON "Conversation"("userId");
CREATE INDEX "idx_Conversation_createdAt" ON "Conversation"("createdAt");
        `.trim(),
      });
    }
  } catch (error: any) {
    console.error('Database init error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database initialization failed',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
