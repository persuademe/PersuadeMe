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

    const now = Date.now();

    // If no session exists, create one starting from NOW
    if (!sessionStart) {
      const newStartTime = now;
      await prisma.systemSetting.create({
        data: {
          key: SESSION_START_KEY,
          value: newStartTime.toString(),
        },
      });

      const endTime = newStartTime + SESSION_DURATION;
      const remaining = endTime - now;

      return NextResponse.json({
        success: true,
        sessionStart: newStartTime,
        sessionEnd: endTime,
        remainingMs: remaining,
        remaining: {
          hours: Math.floor(remaining / (1000 * 60 * 60)),
          minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((remaining % (1000 * 60)) / 1000),
        },
        isExpired: false,
      });
    }

    const sessionStartTime = parseInt(sessionStart.value);
    const endTime = sessionStartTime + SESSION_DURATION;
    let remaining = endTime - now;

    // Check if session has expired
    if (remaining <= 0) {
      // Reset session - starts from NOW
      const newStartTime = now;
      const newEndTime = newStartTime + SESSION_DURATION;
      remaining = SESSION_DURATION;

      await prisma.systemSetting.update({
        where: { key: SESSION_START_KEY },
        data: { value: newStartTime.toString() },
      });

      // Reset all user attempts to 0 for new session
      await prisma.user.updateMany({
        data: { attempts: 0 },
      });

      return NextResponse.json({
        success: true,
        sessionStart: newStartTime,
        sessionEnd: newEndTime,
        remainingMs: remaining,
        remaining: {
          hours: Math.floor(remaining / (1000 * 60 * 60)),
          minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((remaining % (1000 * 60)) / 1000),
        },
        isExpired: false,
      });
    }

    return NextResponse.json({
      success: true,
      sessionStart: sessionStartTime,
      sessionEnd: endTime,
      remainingMs: remaining,
      remaining: {
        hours: Math.floor(remaining / (1000 * 60 * 60)),
        minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((remaining % (1000 * 60)) / 1000),
      },
      isExpired: false,
    });
  } catch (error: any) {
    console.error("Session error:", error);
    
    // Fallback - creates a 6-hour session from now
    const fallbackStart = Date.now();
    const fallbackEnd = fallbackStart + SESSION_DURATION;
    const fallbackRemaining = fallbackEnd - fallbackStart;
    
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
      isExpired: false,
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
