// Token Gate Verification - Check for 10M $PERSUADE Balance
// Uses Base RPC for token balance checks

export interface TokenGateResult {
  hasBalance: boolean;
  balance?: string;
  error?: string;
}

// Token configuration
export const PERSUADE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_PERSUADE_TOKEN_ADDRESS || '').trim().toLowerCase();
export const REQUIRED_BALANCE = 10_000_000; // 10M tokens

// Format bytes for JSON-RPC request
function encodeBalanceOfCall(walletAddress: string): string {
  const methodId = '0x70a08231'; // balanceOf(address)
  const paddedAddress = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  return methodId + paddedAddress;
}

// Fetch balance from RPC endpoint
async function fetchBalanceFromRpc(rpcUrl: string, walletAddress: string): Promise<string | null> {
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
      console.error('[TokenGate] RPC error:', data.error);
      return null;
    }

    const balanceHex = data.result || '0x0';
    // Convert hex to decimal string (divide by 10^18 for human readable)
    const balanceWei = BigInt(balanceHex);
    const balanceTokens = balanceWei / BigInt(10 ** 18);
    
    console.log('[TokenGate] Raw balance (wei):', balanceWei.toString());
    console.log('[TokenGate] Balance (tokens):', balanceTokens.toString());
    
    return balanceTokens.toString();
  } catch (error) {
    console.error('[TokenGate] RPC fetch failed:', error);
    return null;
  }
}

// Main verification function
export async function verifyTokenGate(walletAddress: string): Promise<TokenGateResult> {
  const rpcUrl = process.env.RPC_URL;

  console.log('[TokenGate] Verifying token gate for:', walletAddress);

  if (!rpcUrl || !PERSUADE_TOKEN_ADDRESS) {
    console.warn('[TokenGate] Missing config, allowing access');
    return { hasBalance: true, balance: '10000000' };
  }

  const balance = await fetchBalanceFromRpc(rpcUrl, walletAddress);

  if (balance === null) {
    return { hasBalance: false, error: 'Unable to verify token balance' };
  }

  const balanceBigInt = BigInt(balance);
  const requiredBigInt = BigInt(10_000_000);
  const hasBalance = balanceBigInt >= requiredBigInt;

  console.log('[TokenGate] Final result:', { balance, hasBalance });

  return { hasBalance, balance };
}

// Mock function for development/testing
export function mockVerifyTokenGate(_walletAddress: string): TokenGateResult {
  return { hasBalance: true, balance: '10000000' };
}

// Export helper to get raw balance (for UI display)
export async function getTokenBalance(walletAddress: string): Promise<string> {
  const rpcUrl = process.env.RPC_URL;

  if (!rpcUrl || !PERSUADE_TOKEN_ADDRESS) {
    return '0';
  }

  return (await fetchBalanceFromRpc(rpcUrl, walletAddress)) || '0';
}
