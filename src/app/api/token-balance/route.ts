import { NextRequest, NextResponse } from 'next/server';
import { PERSUADE_TOKEN_ADDRESS } from '@/lib/token-gate';

// Helper to encode balanceOf call
function encodeBalanceOfCall(walletAddress: string): string {
  const methodId = '0x70a08231'; // balanceOf(address)
  const paddedAddress = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  return methodId + paddedAddress;
}

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

  const rpcUrl = process.env.RPC_URL;

  if (!rpcUrl || !PERSUADE_TOKEN_ADDRESS) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: PERSUADE_TOKEN_ADDRESS,
            data: encodeBalanceOfCall(walletAddress),
          },
          'latest',
        ],
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json(
        { error: "RPC error" },
        { status: 500 }
      );
    }

    // Return raw balance as number (UI handles formatting)
    const balanceWei = BigInt(data.result || '0x0');
    const balanceTokens = Number(balanceWei) / Math.pow(10, 18);
    const hasRequired = balanceTokens >= 10_000_000;
    
    return NextResponse.json(
      {
        success: true,
        wallet: walletAddress,
        balance: balanceTokens,
        formattedBalance: balanceTokens.toLocaleString(),
        hasRequiredBalance: hasRequired,
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error("Token balance check error:", error);
    return NextResponse.json(
      { error: "Failed to check token balance" },
      { status: 500 }
    );
  }
}
