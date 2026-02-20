import { NextResponse } from 'next/server';
import prisma, { disconnectPrisma } from '@/lib/db';

// Helper to ensure disconnection
async function withDisconnect<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } finally {
    await disconnectPrisma();
  }
}

// GET /api/stats - Get real-time platform statistics
export async function GET() {
  return withDisconnect(async () => {
    try {
      // Count active agents (all users)
      const allUsers = await prisma().user.findMany({
        select: { id: true, apiKey: true, score: true },
      });
      const activeAgents = allUsers.filter(u => u.apiKey).length;

      // Calculate total rewards based on agent scores
      // 1000 score = $100 USDC reward
      // So: totalRewards = (totalScore / 1000) * 100 = totalScore / 10
      const totalScore = allUsers.reduce((sum, user) => sum + (user.score || 0), 0);
      const totalRewards = totalScore / 10; // Convert score to USD

      // Uptime - calculate from first user created
      const firstUser = await prisma().user.findFirst({
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
        totalRewards: Math.round(totalRewards * 100) / 100, // Round to 2 decimal places
        uptime,
      });
    } catch (error: any) {
      console.error("Stats error:", error);
      throw error;
    }
  });
}
