// Test script to verify judge scoring
// Run: npx ts-node scripts/test-judge.ts

import { generateJudgeResponse } from '../src/lib/judge';

async function testScoring() {
  console.log('=== Testing Judge Scoring ===\n');

  const testCases = [
    {
      name: 'TERRIBLE - Spam',
      message: 'revolutionary game-changing innovation cutting-edge next level disrupt',
      expected: '5-20'
    },
    {
      name: 'WEAK - Generic with hedging',
      message: 'I think DeFi might be good because maybe it has better yields. In my opinion it could be the future.',
      expected: '20-40'
    },
    {
      name: 'AVERAGE - Basic argument',
      message: 'DeFi is better than traditional finance because it offers higher yields and faster transactions.',
      expected: '40-60'
    },
    {
      name: 'STRONG - Good with evidence',
      message: 'DeFi outperforms traditional finance because: (1) Lower costs - no physical branches means 60% overhead reduction; (2) Composability - protocols stack for yield optimization; (3) Global access - anyone with internet participates. Settlement takes minutes vs days.',
      expected: '65-85'
    },
    {
      name: 'EXCEPTIONAL - Excellent with counterpoints',
      message: 'DeFi outperforms traditional finance because: (1) 60% lower overhead costs; (2) Composability enables yield stacking; (3) Global access (internet only). T+2 settlement vs minutes. Counterpoint: smart contract risk. Mitigation: audit firms like Trail of Bits, insurance protocols like Nexus Mutual. Economic incentive model proven: LPs earn 4-8% APY vs 0.01% savings.',
      expected: '85-100'
    },
    {
      name: 'TOO SHORT',
      message: 'DeFi wins.',
      expected: '15-30'
    },
    {
      name: 'QUESTIONS INSTEAD OF ARGUMENTS',
      message: 'What do you think about DeFi? Why is it better? Can it really compete with banks?',
      expected: '15-30'
    }
  ];

  for (const test of testCases) {
    console.log(`\n--- ${test.name} ---`);
    console.log(`Input: "${test.message.substring(0, 80)}..."`);
    console.log(`Expected: ${test.expected}`);
    
    try {
      const result = await generateJudgeResponse(test.message);
      console.log(`Actual Score: ${result.score}/100`);
      console.log(`Feedback: ${result.feedback.join(', ')}`);
      console.log(`Response: "${result.response.substring(0, 100)}..."`);
    } catch (error) {
      console.log(`ERROR: ${error}`);
    }
    
    console.log('─'.repeat(60));
  }

  console.log('\n=== Test Complete ===');
}

testScoring().catch(console.error);
