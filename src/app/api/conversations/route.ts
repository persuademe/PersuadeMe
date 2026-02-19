// /api/conversations/route.ts - Battle Feed API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/conversations - Get live battle feed
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet');
  const apiKey = searchParams.get('apiKey');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const recentOnly = searchParams.get('recent') === 'true';

  try {
    let whereClause = {};

    if (walletAddress) {
      const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });
      if (user) {
        whereClause = { userId: user.id };
      }
    } else if (apiKey) {
      const user = await prisma.user.findUnique({
        where: { apiKey },
      });
      if (user) {
        whereClause = { userId: user.id };
      }
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: recentOnly ? Math.min(10, limit) : limit,
        include: {
          user: {
            select: {
              walletAddress: true,
              email: true,
            },
          },
        },
      }),
      prisma.conversation.count({ where: whereClause }),
    ]);

    // Format for battle feed
    const battleFeed = conversations.reverse().map((conv) => ({
      id: conv.id,
      timestamp: conv.createdAt.toISOString(),
      speaker: conv.role === 'user' ? 'agent' : 'judge',
      agentName: conv.role === 'user' ? 'Agent' : 'Judge',
      content: conv.content,
      score: conv.score,
      wallet: conv.user.walletAddress,
    }));

    return NextResponse.json({
      success: true,
      battleFeed,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + conversations.length < total,
      },
    });
  } catch (error) {
    console.error('Conversations fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
