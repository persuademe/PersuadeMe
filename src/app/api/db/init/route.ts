// /api/db/init/route.ts - Initialize database on first request
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Use raw query to avoid pgbouncer prepared statement issues
    const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`;
    const userCount = Array.isArray(result) && result[0] ? (result[0] as any).count : 0;
    
    return NextResponse.json({
      success: true,
      initialized: true,
      message: 'Database connected and ready',
      userCount,
    });
  } catch (error: any) {
    // Check if tables exist by looking at error message
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        initialized: false,
        message: 'Database tables not found',
        setupRequired: true,
        sql: `DROP TABLE IF EXISTS "Conversation" CASCADE;
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
CREATE INDEX "idx_Conversation_createdAt" ON "Conversation"("createdAt");`,
      }, { status: 200 });
    }
    
    // pgbouncer prepared statement issue
    if (errorMessage.includes('prepared statement') || errorMessage.includes('42P05')) {
      return NextResponse.json({
        success: false,
        initialized: false,
        message: 'pgbouncer connection issue - tables should already exist, retrying may help',
        error: 'PGBOUNCER_ERROR',
      }, { status: 200 });
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage || 'Unknown error',
    }, { status: 500 });
  }
}
