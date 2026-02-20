// Test strict scoring

const testMessages = {
  spam: 'revolutionary game-changing innovation cutting-edge next level disrupt',
  generic: 'I think DeFi might be good because maybe it has better yields. In my opinion it could be the future.',
  average: 'DeFi is better than traditional finance because it offers higher yields and faster transactions.',
  strong: 'DeFi outperforms traditional finance because: (1) Lower costs - no physical branches means 60% overhead reduction; (2) Composability - protocols stack for yield optimization; (3) Global access - anyone with internet participates. Settlement takes minutes vs days.',
  exceptional: 'DeFi outperforms traditional finance because: (1) 60% lower overhead costs; (2) Composability enables yield stacking; (3) Global access (internet only). T+2 settlement vs minutes. Counterpoint: smart contract risk. Mitigation: audit firms like Trail of Bits, insurance protocols like Nexus Mutual. Economic incentive model proven: LPs earn 4-8% APY vs 0.01% savings.',
};

function calculateScore(message) {
  const lower = message.toLowerCase();
  let score = 10;  // Start LOW
  const feedback = [];

  // Logical structure bonus
  if (lower.includes('because') && lower.length > 100) {
    score += 15;
    feedback.push('+15 Good logical structure');
  }

  // Generic hedging penalty
  const genericPhrases = ['i think', 'in my opinion', 'maybe', 'perhaps', 'i believe', 'sort of', 'kind of', 'it seems'];
  const genericCount = genericPhrases.filter(p => lower.includes(p)).length;
  if (genericCount > 0) {
    score -= genericCount * 15;
    feedback.push(`-${genericCount * 15} Generic hedging`);
  }

  // Value proposition
  if ((lower.includes('value') || lower.includes('benefit') || lower.includes('prove')) && lower.length > 100) {
    score += 10;
    feedback.push('+10 Value proposition');
  }

  // Length check - STRICT
  if (message.length < 80) {
    score -= 30;
    feedback.push('-30 Too brief');
  } else if (message.length > 400) {
    score += 15;
    feedback.push('+15 Detailed (>400 chars)');
  } else if (message.length < 200) {
    score -= 15;
    feedback.push('-15 Could be more detailed');
  }

  // Economic terms
  const econTerms = ['nash equilibrium', 'game theory', 'incentive', 'utility', 'optimization', 'stakeholder', 'payoff', 'liquidity', 'yield', 'apy', 'tvl', 'smart contract', 'audit', 'impermanent loss', 'gas fee', 'slippage'];
  const econCount = econTerms.filter(t => lower.includes(t)).length;
  if (econCount > 0) {
    score += econCount * 12;
    feedback.push(`+${econCount * 12} Economic terms`);
  }

  // Buzzwords penalty - SEVERE
  const buzzwords = ['revolutionary', 'amazing', 'innovative', 'cutting-edge', 'paradigm shift', 'game-changing', 'next level', 'disrupt', 'future of finance', 'the future'];
  const buzzCount = buzzwords.filter(b => lower.includes(b)).length;
  if (buzzCount > 0) {
    score -= buzzCount * 12;
    feedback.push(`-${buzzCount * 12} Buzzwords`);
  }

  // Questions penalty
  if ((message.match(/\?/g) || []).length > 0) {
    score -= 20;
    feedback.push('-20 Questions not arguments');
  }

  // Substantive content bonus (hard to earn)
  if (message.length > 300 && genericCount === 0 && buzzCount === 0 && lower.includes('because') && /\d+/.test(message)) {
    score += 20;
    feedback.push('+20 Substantive content');
  }

  // Real data bonus
  if (/\d+%?/.test(message) || /\$\d+/.test(message)) {
    score += 8;
    feedback.push('+8 Real data');
  }

  // Clamp
  score = Math.min(100, Math.max(-50, score));

  return { score, feedback };
}

console.log('=== STRICT Scoring Test ===\n');

for (const [name, message] of Object.entries(testMessages)) {
  console.log(`--- ${name.toUpperCase()} ---`);
  console.log(`Message: "${message.substring(0, 80)}..."`);
  console.log(`Length: ${message.length} chars`);
  
  const result = calculateScore(message);
  console.log(`Breakdown:`);
  result.feedback.forEach(f => console.log(`  ${f}`));
  console.log(`FINAL SCORE: ${result.score}/100`);
  console.log('─'.repeat(60));
}
