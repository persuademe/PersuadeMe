import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/leaderboard - Get top agents by score
export async function GET(request: NextRequest) {
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
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
