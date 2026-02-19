import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenGate } from '@/lib/token-gate';

// GET /api/token-balance - Get $PERSUADE token balance for a wallet
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get("wallet");

  if (!walletAddress) {
    return NextResponse.json(
      { error: "Missing wallet address" },
      { status: 400 }
    );
  }

  try {
    const result = await verifyTokenGate(walletAddress);
    
    return NextResponse.json({
      success: true,
      wallet: walletAddress,
      balance: result.balance || '0',
      hasRequiredBalance: result.hasBalance,
    });
  } catch (error) {
    console.error("Token balance check error:", error);
    return NextResponse.json(
      { error: "Failed to check token balance" },
      { status: 500 }
    );
  }
}
