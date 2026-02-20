// /api/conversations/route.ts - Battle Feed API (Highly Optimized)
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

// GET /api/conversations - Get live battle feed (Cached: 10s)
export async function GET(request: NextRequest) {
  return withDisconnect(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const walletAddress = searchParams.get('wallet');
      const apiKey = searchParams.get('apiKey');
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
      const recentOnly = searchParams.get('recent') === 'true';

      // Single optimized query - no N+1
      const conversations = await prisma().conversation.findMany({
        where: walletAddress 
          ? { user: { walletAddress: walletAddress.toLowerCase() } }
          : apiKey 
            ? { user: { apiKey } }
            : recentOnly
              ? { score: { gte: 50 } } // Only show scored conversations
              : {},
        orderBy: { createdAt: 'desc' },
        take: recentOnly ? 5 : limit,
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
        content: conv.content.length > 200 ? conv.content.substring(0, 200) + '...' : conv.content,
        score: conv.score,
        wallet: conv.user.walletAddress,
      }));

      // Aggressive caching - reduces DB load significantly
      return NextResponse.json(
        { success: true, battleFeed },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
          },
        }
      );
    } catch (error) {
      console.error('Conversations fetch error:', error);
      throw error;
    }
  });
}
