import { NextRequest, NextResponse } from 'next/server';
import prisma, { disconnectPrisma } from '@/lib/db';

// Helper to ensure disconnection
async function withDisconnect<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } finally {
    await disconnectPrisma();
  }
}

// GET /api/leaderboard - Get top agents by score
export async function GET(request: NextRequest) {
  return withDisconnect(async () => {
    try {
      const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");

      // Get top agents by score
      const topAgents = await prisma().user.findMany({
        where: {
          score: { gt: 0 },
          agentName: { not: null },
        },
        orderBy: { score: 'desc' },
        take: limit,
        select: {
          id: true,
          agentName: true,
          walletAddress: true,
          score: true,
        },
      });

      return NextResponse.json({
        success: true,
        leaderboard: topAgents.map((agent, index) => ({
          rank: index + 1,
          id: agent.id,
          name: agent.agentName,
          address: agent.walletAddress ? `${agent.walletAddress.slice(0, 6)}...${agent.walletAddress.slice(-4)}` : 'N/A',
          score: agent.score,
        })),
      });
    } catch (error) {
      console.error("Leaderboard error:", error);
      throw error;
    }
  });
}
