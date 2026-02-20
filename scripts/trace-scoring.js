// Manual scoring trace - understanding how the judge calculates scores

const testMessages = {
  spam: 'revolutionary game-changing innovation cutting-edge next level disrupt',
  generic: 'I think DeFi might be good because maybe it has better yields. In my opinion it could be the future.',
  average: 'DeFi is better than traditional finance because it offers higher yields and faster transactions.',
  strong: 'DeFi outperforms traditional finance because: (1) Lower costs - no physical branches means 60% overhead reduction; (2) Composability - protocols stack for yield optimization; (3) Global access - anyone with internet participates. Settlement takes minutes vs days.',
  exceptional: 'DeFi outperforms traditional finance because: (1) 60% lower overhead costs; (2) Composability enables yield stacking; (3) Global access (internet only). T+2 settlement vs minutes. Counterpoint: smart contract risk. Mitigation: audit firms like Trail of Bits, insurance protocols like Nexus Mutual. Economic incentive model proven: LPs earn 4-8% APY vs 0.01% savings.',
};

function calculateScore(message) {
  const lower = message.toLowerCase();
  let score = 25;
  const feedback = [];

  // Logical structure bonus
  if (lower.includes('because') || lower.includes('therefore') || lower.includes('evidence') || lower.includes('since')) {
    score += 10;
    feedback.push('+10 Logical connectors');
  }

  // Generic hedging penalty
  const genericPhrases = ['i think', 'in my opinion', 'maybe', 'perhaps', 'i believe', 'sort of', 'kind of', 'it seems'];
  const genericCount = genericPhrases.filter(p => lower.includes(p)).length;
  if (genericCount > 0) {
    score -= genericCount * 12;
    feedback.push(`-${genericCount * 12} Generic hedging (${genericCount} phrases)`);
  }

  // Value proposition bonus
  if (lower.includes('value') || lower.includes('benefit') || lower.includes('prove') || lower.includes('data')) {
    score += 8;
    feedback.push('+8 Value proposition');
  }

  // Length check
  if (message.length < 50) {
    score -= 25;
    feedback.push('-25 Too brief');
  } else if (message.length > 300) {
    score += 8;
    feedback.push('+8 Detailed (>300 chars)');
  } else if (message.length < 150) {
    score -= 10;
    feedback.push('-10 Could be more detailed');
  }

  // Economic terms bonus
  const econTerms = ['nash equilibrium', 'game theory', 'incentive', 'utility', 'optimization', 'stakeholder', 'payoff', 'liquidity', 'yield', 'ap'];
  const econCount = econTerms.filter(t => lower.includes(t)).length;
  if (econCount > 0) {
    score += econCount * 10;
    feedback.push(`+${econCount * 10} Economic terms (${econCount} found)`);
  }

  // Buzzwords penalty
  const buzzwords = ['revolutionary', 'amazing', 'innovative', 'cutting-edge', 'paradigm shift', 'game-changing', 'next level', 'disrupt'];
  const buzzCount = buzzwords.filter(b => lower.includes(b)).length;
  if (buzzCount > 0) {
    score -= buzzCount * 10;
    feedback.push(`-${buzzCount * 10} Buzzwords (${buzzCount} found)`);
  }

  // Questions penalty
  if ((message.match(/\?/g) || []).length > 0) {
    score -= 15;
    feedback.push('-15 Questions instead of arguments');
  }

  // Substantive content bonus
  if (message.length > 200 && genericCount === 0 && buzzCount === 0 && message.includes('because')) {
    score += 15;
    feedback.push('+15 Substantive content');
  }

  // Data/numbers bonus
  if (/\d+/.test(message)) {
    score += 5;
    feedback.push('+5 Uses data/numbers');
  }

  // Clamp score
  score = Math.min(100, Math.max(-30, score));

  // Random variation (-5 to +5)
  const randomOffset = Math.floor(Math.random() * 11) - 5;
  score = Math.min(100, Math.max(-30, score + randomOffset));
  feedback.push(`+/-${randomOffset} Random variation`);

  return { score, feedback };
}

console.log('=== Manual Scoring Trace ===\n');

for (const [name, message] of Object.entries(testMessages)) {
  console.log(`\n--- ${name.toUpperCase()} ---`);
  console.log(`Message: "${message}"`);
  console.log(`Length: ${message.length} chars`);
  
  const result = calculateScore(message);
  console.log(`\nScore Breakdown:`);
  result.feedback.forEach(f => console.log(`  ${f}`));
  console.log(`\nFinal Score: ${result.score}/100`);
  console.log('─'.repeat(60));
}
