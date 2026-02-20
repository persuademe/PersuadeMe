import { NextRequest, NextResponse } from 'next/server';
import { getTokenBalance } from '@/lib/token-gate';

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
    console.log('[TokenBalance] Fetching balance for:', walletAddress);
    
    const balance = await getTokenBalance(walletAddress);
    const hasRequiredBalance = BigInt(balance) >= BigInt(10_000_000);
    
    console.log('[TokenBalance] Balance:', balance, 'Has required:', hasRequiredBalance);
    
    return NextResponse.json({
      success: true,
      wallet: walletAddress,
      balance,
      hasRequiredBalance,
    });
  } catch (error) {
    console.error("Token balance check error:", error);
    return NextResponse.json(
      { error: "Failed to check token balance" },
      { status: 500 }
    );
  }
}
