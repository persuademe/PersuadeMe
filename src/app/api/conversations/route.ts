// /api/conversations/route.ts - Battle Feed API (Optimized)
import { NextRequest, NextResponse } from 'next/server';
import { prisma, disconnectPrisma } from '@/lib/db';

// Helper to ensure disconnection
async function withDisconnect<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } finally {
    await disconnectPrisma();
  }
}

// GET /api/conversations - Get live battle feed (Cached: 5s)
export async function GET(request: NextRequest) {
  return withDisconnect(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const walletAddress = searchParams.get('wallet');
      const apiKey = searchParams.get('apiKey');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const offset = parseInt(searchParams.get('offset') || '0');
      const recentOnly = searchParams.get('recent') === 'true';

      // Single optimized query - no N+1
      const conversations = await prisma().conversation.findMany({
        where: walletAddress 
          ? { user: { walletAddress: walletAddress.toLowerCase() } }
          : apiKey 
            ? { user: { apiKey } }
            : {},
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: recentOnly ? 10 : limit,
        select: {
          id: true,
          role: true,
          content: true,
          score: true,
          createdAt: true,
          user: {
            select: {
              walletAddress: true,
              agentName: true,
            },
          },
        },
      });

      // Transform in-memory (fast)
      const battleFeed = conversations.reverse().map((conv) => ({
        id: conv.id,
        timestamp: conv.createdAt.toISOString(),
        speaker: conv.role === 'user' ? 'agent' : 'judge',
        agentName: conv.user.agentName || conv.user.walletAddress?.slice(0, 6) + '...' || 'Agent',
        content: conv.content,
        score: conv.score,
        wallet: conv.user.walletAddress,
      }));

      // Cache header for 5 seconds (reduces DB load)
      return NextResponse.json(
        {
          success: true,
          battleFeed,
          cached: true,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
          },
        }
      );
    } catch (error) {
      console.error('Conversations fetch error:', error);
      throw error;
    }
  });
}
