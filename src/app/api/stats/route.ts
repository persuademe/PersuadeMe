import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/stats - Get real-time platform statistics
export async function GET() {
  try {
    // Count active agents (all users have API keys by default)
    const activeAgents = await prisma.user.count();

    // Calculate total rewards (sum of scores from conversations)
    const conversations = await prisma.conversation.findMany({
      where: { role: 'judge' },
    });
    const totalRewards = conversations.reduce((sum, conv) => sum + (conv.score || 0), 0);

    // Uptime - calculate from first user created
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    let uptime = "99.9%";
    if (firstUser) {
      const daysRunning = Math.max(1, Math.floor((Date.now() - firstUser.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      // Mock uptime based on days running
      uptime = daysRunning < 1 ? "99.9%" : daysRunning < 7 ? "99.95%" : "99.99%";
    }

    return NextResponse.json({
      success: true,
      activeAgents,
      totalRewards,
      uptime,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
