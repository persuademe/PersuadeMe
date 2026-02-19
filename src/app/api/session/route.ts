import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Session configuration
const SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const SESSION_START_KEY = 'session_start_time';

// GET /api/session - Get current session info
export async function GET() {
  try {
    // Try to get session start time from database
    let sessionStart = await prisma.systemSetting.findUnique({
      where: { key: SESSION_START_KEY },
    });

    // If no session exists, create one
    if (!sessionStart) {
      const newStartTime = Date.now();
      await prisma.systemSetting.create({
        data: {
          key: SESSION_START_KEY,
          value: newStartTime.toString(),
        },
      });
      sessionStart = {
        key: SESSION_START_KEY,
        value: newStartTime.toString(),
        id: '',
        updatedAt: new Date(),
      };
    }

    const sessionStartTime = parseInt(sessionStart.value);
    const now = Date.now();
    const endTime = sessionStartTime + SESSION_DURATION;
    const remaining = Math.max(0, endTime - now);
    const isExpired = remaining === 0;

    // Auto-start new session if expired
    if (isExpired) {
      const newStartTime = Date.now();
      await prisma.systemSetting.update({
        where: { key: SESSION_START_KEY },
        data: { value: newStartTime.toString() },
      });
    }

    const newEndTime = isExpired ? Date.now() + SESSION_DURATION : endTime;
    const newRemaining = Math.max(0, newEndTime - now);

    return NextResponse.json({
      success: true,
      sessionStart: isExpired ? Date.now() : sessionStartTime,
      sessionEnd: newEndTime,
      remainingMs: newRemaining,
      remaining: {
        hours: Math.floor(newRemaining / (1000 * 60 * 60)),
        minutes: Math.floor((newRemaining % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((newRemaining % (1000 * 60)) / 1000),
      },
      isExpired: newRemaining === 0,
    });
  } catch (error: any) {
    console.error("Session error:", error);
    // Fallback to memory-based session
    const fallbackStart = Date.now();
    const fallbackEnd = fallbackStart + SESSION_DURATION;
    const fallbackRemaining = Math.max(0, fallbackEnd - Date.now());
    
    return NextResponse.json({
      success: true,
      sessionStart: fallbackStart,
      sessionEnd: fallbackEnd,
      remainingMs: fallbackRemaining,
      remaining: {
        hours: Math.floor(fallbackRemaining / (1000 * 60 * 60)),
        minutes: Math.floor((fallbackRemaining % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((fallbackRemaining % (1000 * 60)) / 1000),
      },
      isExpired: fallbackRemaining === 0,
      fallback: true,
    });
  }
}

// POST /api/session - Reset session (admin only in production)
export async function POST(request: NextRequest) {
  try {
    const newStartTime = Date.now();
    
    // Upsert session start time
    await prisma.systemSetting.upsert({
      where: { key: SESSION_START_KEY },
      update: { value: newStartTime.toString() },
      create: { key: SESSION_START_KEY, value: newStartTime.toString() },
    });
    
    return NextResponse.json({
      success: true,
      sessionStart: newStartTime,
      sessionEnd: newStartTime + SESSION_DURATION,
      message: "Session reset successfully",
    });
  } catch (error: any) {
    console.error("Session reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset session" },
      { status: 500 }
    );
  }
}
