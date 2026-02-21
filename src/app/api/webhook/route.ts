import { NextRequest, NextResponse } from 'next/server';

// POST /api/webhook - Handle FarCast webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Webhook] Received:', JSON.stringify(body, null, 2));

    // Handle different webhook events
    const eventType = body.type || body.event;
    
    switch (eventType) {
      case 'frame_added':
        // User added the frame
        console.log('[Webhook] Frame added:', body.user?.username);
        break;
        
      case 'frame_removed':
        // User removed the frame
        console.log('[Webhook] Frame removed:', body.user?.username);
        break;
        
      case 'notification':
        // Notification from FarCast
        console.log('[Webhook] Notification:', body);
        break;
        
      default:
        console.log('[Webhook] Unknown event type:', eventType);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// GET /api/webhook - Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'FarCast webhook endpoint' 
  });
}
