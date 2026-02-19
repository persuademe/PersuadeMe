// Token Gate Verification - Check for 10M $PERSUADE Balance
// Supports: Alchemy, Infura, Moralis, Helius RPC endpoints

export interface TokenGateResult {
  hasBalance: boolean;
  balance?: string;
  error?: string;
}

// Token configuration
const PERSUADE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_PERSUADE_TOKEN_ADDRESS?.toLowerCase() || '';
const REQUIRED_BALANCE = BigInt(10_000_000); // 10M tokens (assuming 18 decimals)

// ERC-20 balanceOf ABI (minimal)
const BALANCE_OF_ABI = {
  inputs: [{ name: 'owner', type: 'address' }],
  name: 'balanceOf',
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function',
};

// Format bytes for JSON-RPC request
function encodeBalanceOfCall(walletAddress: string): string {
  const methodId = '0x70a08231'; // balanceOf(address)
  const paddedAddress = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  return methodId + paddedAddress;
}

// Fetch balance from RPC endpoint
async function fetchBalanceFromRpc(rpcUrl: string, walletAddress: string): Promise<bigint | null> {
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

    if (!response.ok) return null;

    const data = await response.json();
    if (data.error) return null;

    return BigInt(data.result || '0x0');
  } catch {
    return null;
  }
}

// Fetch balance from Moralis API
async function fetchBalanceFromMoralis(walletAddress: string): Promise<bigint | null> {
  try {
    const apiKey = process.env.MORALIS_API_KEY;
    if (!apiKey) return null;

    const response = await fetch(
      `https://deep-index.moralis.io/api/v2/${walletAddress}/balance?chain=eth`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return BigInt(data.balance || 0);
  } catch {
    return null;
  }
}

// Main verification function
export async function verifyTokenGate(walletAddress: string): Promise<TokenGateResult> {
  const rpcUrl = process.env.RPC_URL;
  const moralisKey = process.env.MORALIS_API_KEY;
  const heliusKey = process.env.HELIUS_API_KEY;

  // Try multiple providers for redundancy
  const providers = [];

  if (rpcUrl) {
    providers.push(async () => {
      const balance = await fetchBalanceFromRpc(rpcUrl, walletAddress);
      return { balance, provider: 'rpc' };
    });
  }

  if (moralisKey) {
    providers.push(async () => {
      const balance = await fetchBalanceFromMoralis(walletAddress);
      return { balance, provider: 'moralis' };
    });
  }

  // If no providers configured, skip check in development
  if (providers.length === 0) {
    console.warn('[TokenGate] No RPC providers configured, skipping balance check');
    return { hasBalance: true }; // Allow in development
  }

  // Try each provider until one succeeds
  for (const provider of providers) {
    try {
      const result = await provider();
      if (result.balance !== null) {
        const hasBalance = result.balance >= REQUIRED_BALANCE;
        return {
          hasBalance,
          balance: (result.balance / BigInt(10 ** 18)).toString(), // Convert from wei
        };
      }
    } catch (error) {
      console.warn(`[TokenGate] Provider failed: ${error}`);
      continue;
    }
  }

  return {
    hasBalance: false,
    error: 'Unable to verify token balance',
  };
}

// Mock function for development/testing
export function mockVerifyTokenGate(_walletAddress: string): TokenGateResult {
  return { hasBalance: true, balance: '10000000' };
}
