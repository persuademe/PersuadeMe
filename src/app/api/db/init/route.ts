// /api/db/init/route.ts - Initialize database on first request
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Simple secret check to prevent unauthorized initialization
    const authHeader = request.headers.get('authorization');
    const initSecret = process.env.DB_INIT_SECRET;

    if (initSecret && authHeader !== `Bearer ${initSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to push schema - this works if connection is available
    // In production with proper Supabase integration, this should succeed
    try {
      // Check if tables exist by querying
      const userCount = await prisma.user.count();
      
      return NextResponse.json({
        success: true,
        initialized: true,
        message: 'Database already initialized',
        userCount,
      });
    } catch (dbError) {
      // Tables don't exist, try to create them
      // This requires direct database access
      return NextResponse.json({
        success: false,
        initialized: false,
        message: 'Database tables not found. Run "npx prisma db push" locally or configure Vercel build to include database migration.',
        setupRequired: true,
      });
    }
  } catch (error) {
    console.error('Database init error:', error);
    return NextResponse.json(
      { error: 'Database initialization failed' },
      { status: 500 }
    );
  }
}
