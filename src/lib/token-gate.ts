// Token Gate Verification - Check for 10M $PERSUADE Balance
// Uses Base RPC for token balance checks

export interface TokenGateResult {
  hasBalance: boolean;
  balance?: string;
  error?: string;
}

// Token configuration
const PERSUADE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_PERSUADE_TOKEN_ADDRESS?.toLowerCase() || '';
const REQUIRED_BALANCE = BigInt(10_000_000); // 10M tokens (assuming 18 decimals)

// Format bytes for JSON-RPC request
function encodeBalanceOfCall(walletAddress: string): string {
  const methodId = '0x70a08231'; // balanceOf(address)
  const paddedAddress = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  return methodId + paddedAddress;
}

// Fetch balance from RPC endpoint
async function fetchBalanceFromRpc(rpcUrl: string, walletAddress: string): Promise<bigint | null> {
  try {
    console.log('[TokenGate] Fetching balance from RPC:', rpcUrl);
    console.log('[TokenGate] Token address:', PERSUADE_TOKEN_ADDRESS);
    console.log('[TokenGate] Wallet address:', walletAddress);

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
    console.log('[TokenGate] RPC response:', JSON.stringify(data));

    if (data.error) {
      console.error('[TokenGate] RPC error:', data.error);
      return null;
    }

    const balanceHex = data.result || '0x0';
    const balance = BigInt(balanceHex);
    console.log('[TokenGate] Raw balance (wei):', balance.toString());
    console.log('[TokenGate] Balance (tokens):', (balance / BigInt(10 ** 18)).toString());

    return balance;
  } catch (error) {
    console.error('[TokenGate] RPC fetch failed:', error);
    return null;
  }
}

// Main verification function
export async function verifyTokenGate(walletAddress: string): Promise<TokenGateResult> {
  const rpcUrl = process.env.RPC_URL;

  console.log('[TokenGate] Verifying token gate for:', walletAddress);
  console.log('[TokenGate] Required balance:', REQUIRED_BALANCE.toString());

  if (!rpcUrl) {
    console.warn('[TokenGate] No RPC URL configured');
    return { hasBalance: true, balance: '10000000' }; // Allow in development
  }

  if (!PERSUADE_TOKEN_ADDRESS) {
    console.warn('[TokenGate] No token address configured');
    return { hasBalance: true, balance: '10000000' };
  }

  const balance = await fetchBalanceFromRpc(rpcUrl, walletAddress);

  if (balance === null) {
    return {
      hasBalance: false,
      error: 'Unable to verify token balance',
    };
  }

  const balanceTokens = balance / BigInt(10 ** 18);
  const hasBalance = balance >= REQUIRED_BALANCE;

  console.log('[TokenGate] Final result:', { balance: balanceTokens.toString(), hasBalance });

  return {
    hasBalance,
    balance: balanceTokens.toString(),
  };
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

  const balance = await fetchBalanceFromRpc(rpcUrl, walletAddress);
  if (balance === null) {
    return '0';
  }

  return (balance / BigInt(10 ** 18)).toString();
}
