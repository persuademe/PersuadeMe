// /api/db/init/route.ts - Initialize database on first request
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Use raw query to avoid pgbouncer prepared statement issues
    const result = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "User"`;
    
    let userCount = 0;
    if (Array.isArray(result) && result[0] && typeof result[0] === 'object') {
      userCount = Number((result[0] as any).count) || 0;
    }
    
    return NextResponse.json({
      success: true,
      initialized: true,
      message: 'Database connected and ready',
      userCount,
    });
  } catch (error: any) {
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        initialized: false,
        message: 'Database tables not found',
        setupRequired: true,
      }, { status: 200 });
    }
    
    if (errorMessage.includes('prepared statement') || errorMessage.includes('42P05')) {
      return NextResponse.json({
        success: false,
        initialized: false,
        message: 'pgbouncer connection issue - tables should exist',
        error: 'PGBOUNCER_ERROR',
      }, { status: 200 });
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage || 'Unknown error',
    }, { status: 500 });
  }
}
