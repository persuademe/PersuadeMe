import { NextResponse } from 'next/server';

// Session configuration
const SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// In-memory storage for session (resets on server restart)
// For production, use Redis or database
let sessionStartTime: number | null = null;

// GET /api/session - Get current session info
export async function GET() {
  try {
    // If no session exists, create one starting from first request
    if (!sessionStartTime) {
      sessionStartTime = Date.now();
    }

    const now = Date.now();
    const endTime = sessionStartTime + SESSION_DURATION;
    const remaining = Math.max(0, endTime - now);
    const isExpired = remaining === 0;

    // Auto-start new session if expired
    if (isExpired) {
      sessionStartTime = now;
    }

    const newEndTime = sessionStartTime + SESSION_DURATION;
    const newRemaining = Math.max(0, newEndTime - now);

    return NextResponse.json({
      success: true,
      sessionStart: sessionStartTime,
      sessionEnd: newEndTime,
      remainingMs: newRemaining,
      remaining: {
        hours: Math.floor(newRemaining / (1000 * 60 * 60)),
        minutes: Math.floor((newRemaining % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((newRemaining % (1000 * 60)) / 1000),
      },
      isExpired: newRemaining === 0,
    });
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}

// POST /api/session - Reset session (admin only in production)
export async function POST() {
  try {
    sessionStartTime = Date.now();
    
    return NextResponse.json({
      success: true,
      sessionStart: sessionStartTime,
      sessionEnd: sessionStartTime + SESSION_DURATION,
      message: "Session reset successfully",
    });
  } catch (error) {
    console.error("Session reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset session" },
      { status: 500 }
    );
  }
}
