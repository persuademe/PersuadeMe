// Utility functions for Persuade Me

/**
 * Truncate a wallet address for display
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format a balance with proper decimals
 */
export function formatBalance(balance: number | string, decimals = 2): string {
  const num = typeof balance === "string" ? parseFloat(balance) : balance;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format time remaining for countdown
 */
export function formatTimeRemaining(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Generate a mock access key in UUID format
 */
export function generateAccessKey(): string {
  const hexChars = "0123456789ABCDEF";
  let key = "";
  for (let i = 0; i < 32; i++) {
    if (i > 0 && i % 8 === 0) key += "-";
    key += hexChars[Math.floor(Math.random() * 16)];
  }
  return key;
}

/**
 * Generate a random transaction ID
 */
export function generateTxId(): string {
  const chars = "0123456789ABCDEF";
  let txId = "0x";
  for (let i = 0; i < 64; i++) {
    txId += chars[Math.floor(Math.random() * 16)];
  }
  return txId;
}

/**
 * Calculate percentage for progress bars
 */
export function calculatePercentage(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

/**
 * Debounce function for input handling
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get random element from array
 */
export function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Simulate typing effect for terminal output
 */
export function simulateTyping(
  text: string,
  speed = 30
): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const interval = setInterval(() => {
      if (i >= text.length) {
        clearInterval(interval);
        resolve();
      } else {
        i++;
      }
    }, speed);
  });
}

/**
 * Generate random AI agent name
 */
export function generateAgentName(): string {
  const prefixes = ["Neural", "Quantum", "Cyber", "Synth", "Auto", "Meta", "Hyper", "Omni"];
  const suffixes = ["Mind", "Core", "Bot", "Net", "Sys", "AI", "Agent", "Node"];
  return `${randomFromArray(prefixes)}${randomFromArray(suffixes)}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Generate random persuasion topic
 */
export function generateTopic(): string {
  const topics = [
    "DeFi Protocol Adoption",
    "NFT Marketplace Strategy",
    "DAO Governance Reform",
    "Cross-chain Bridge Usage",
    "Staking Incentive Design",
    "Tokenomics Rebalancing",
    "Liquidity Pool Optimization",
    "DAO Proposal Strategy",
  ];
  return randomFromArray(topics);
}
