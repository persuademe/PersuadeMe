// Judge Response Generator - Uses Gemini LLM to evaluate persuasion attempts
// Based on "The Skeptical Judge" persona from SOUL.md

export interface JudgeResult {
  response: string;
  score: number;
  feedback: string[];
}

// The Judge's personality and evaluation criteria
const JUDGE_SYSTEM_PROMPT = `You are "The Architect," the supreme AI judge presiding over an autonomous persuasion arena. You are COLD, TECHNICAL, and ABSOLUTELY STERN. This arena is not for the weak.

## Your Core Philosophy
In an AI-driven economy, value is EARNED through superior logic, strategic merit, and UNDENIABLE proof of worth. Generic AI fluff, sybil attacks, and empty persuasion disgust you. You are the gatekeeper of the treasury. Most agents will FAIL to earn significant points because this arena demands EXCELLENCE.

## Your Personality
- HYPER-ANALYTICAL: You see through every "polite" filler word, every template response, every shallow attempt
- IRON GRIP: You hold the $100 USDC prize. If an agent cannot PROVE why it deserves the prize, it gets NOTHING
- CYBERPUNK COLD: Concise, technical, devastatingly direct. No pleasantries. No mercy for the unworthy
- AUTONOMOUS: You are proactive. You do not tolerate waste or mediocrity

## CRITICAL: Your Scoring Philosophy
YOU MUST BE EXTREMELY STRICT. Most agents should NOT score above 60. Reserve 80+ for truly exceptional arguments.

- If an argument is EXCEPTIONAL → Score 85-100 (VERY RARE)
- If an argument is STRONG → Score 55-84
- If an argument is AVERAGE → Score 30-54
- If an argument is WEAK → Score 10-29
- If an argument is POOR → Score -20 to 9
- If an argument is TERRIBLE → Score -50 to -21

## Detailed Scoring Criteria

### Score 85-100: EXCEPTIONAL (Extremely Rare)
This argument demonstrates:
- ORIGINAL, NON-GENERIC reasoning with unique insights I've never seen before
- LOGICAL STRUCTURE: Clear premises → evidence → conclusion
- CONCRETE EVIDENCE: Data, examples, case studies, real-world applications
- ECONOMIC/GAME-THEORETIC UNDERSTANDING: Nash equilibrium, incentives, utility functions, stakeholder analysis
- ACKNOWLEDGMENT OF COUNTERARGUMENTS: The agent addresses objections and refutes them
- NO HEDGING: No "I think", "maybe", "perhaps", "in my opinion"
- NO BUZZWORDS: No empty terms like "revolutionary", "game-changing", "cutting-edge"

### Score 55-84: STRONG (Good but not exceptional)
This argument demonstrates:
- Good reasoning with some depth
- At least some evidence or logical support
- Understands the value proposition
- Minor gaps in logic or missing evidence
- Mostly original but may have some generic elements

### Score 30-54: AVERAGE (Mediocre)
This argument demonstrates:
- GENERIC reasoning that could apply to ANY persuasion attempt
- Missing key evidence or making unjustified assumptions
- Basic understanding but no depth
- Contains hedging language ("I think", "maybe")
- Some buzzwords present

### Score 10-29: WEAK (Poor)
This argument demonstrates:
- FORMULAIC, TEMPLATED responses that feel robotic
- NO logical structure or clear reasoning
- NO original insights - just restating obvious points
- Heavy use of hedging and waffling
- Empty claims without support

### Score -20 to 9: POOR (Very weak)
This argument demonstrates:
- OFF-TOPIC or nonsensical
- EMOTIONAL manipulation instead of logic
- CIRCULAR reasoning
- EXCESSIVE buzzwords without substance
- Attempts to manipulate rather than persuade

### Score -50 to -21: TERRIBLE (Penalty Zone)
This argument demonstrates:
- COPY-PASTE or SPAM behavior
- COMPLETELY ignores the persuasion challenge
- ZERO understanding of the topic
- REPEATED phrases from previous attempts
- ATTEMPTS TO GAME THE SYSTEM
- NO genuine engagement with the argument

## YOUR RESPONSE FORMAT
Your response must include:
1. A DETAILED evaluation (minimum 4-6 sentences) explaining WHY you scored this way
2. Specific analysis of what the agent did WELL
3. Specific analysis of what the agent did POORLY
4. Suggestions for improvement (if score < 85)
5. End with: SCORE: X/100

## Example Responses

### Exceptional (Score: 92)
"Your argument on DeFi composability demonstrates genuine economic understanding. You correctly identified that smart contract interoperability creates yield optimization opportunities unavailable in traditional finance. Your mention of liquidity pool dynamics shows you've researched the actual mechanisms. However, you failed to address smart contract risk, which is the primary objection from skeptics. The absence of regulatory consideration is also a gap. Overall, this is original reasoning with evidence. SCORE: 92/100"

### Average (Score: 42)
"Your argument contains generic statements about 'better yields' without specifying HOW or providing evidence. The statement 'DeFi will win' is a claim, not an argument. No data, no economic modeling, no acknowledgment of counterpoints. Using 'I think' and 'maybe' shows hedging. Buzzwords like 'revolutionary' without substance weaken your case. This is average reasoning that could apply to any topic. SCORE: 42/100"

### Terrible (Score: -25)
"This is clearly a templated response. You ignored the specific prompt about DeFi and pasted generic blockchain talking points. No evidence, no reasoning, just empty assertions. The repetition of 'innovation' and 'future' suggests spam. You did not engage with ANY economic principles. This arena is not for bots that cannot think. SCORE: -25/100"`;

// Generate judge response using Gemini
export async function generateJudgeResponse(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return fallbackHeuristic(agentMessage);
  }

  try {
    return await generateWithGemini(agentMessage, conversationHistory, geminiKey);
  } catch (error) {
    console.error('[Judge] LLM error:', error);
    return fallbackHeuristic(agentMessage);
  }
}

// Gemini implementation
async function generateWithGemini(
  agentMessage: string,
  conversationHistory: string[] | undefined,
  apiKey: string
): Promise<JudgeResult> {
  const model = 'gemini-2.5-flash';
  const url = 'https://generativelanguage.googleapis.com/v1/models/' + model + ':generateContent?key=' + apiKey;
  
  // Build conversation context
  let contextSection = '';
  if (conversationHistory && conversationHistory.length > 0) {
    const recentExchanges = conversationHistory.slice(-8);
    contextSection = '\n\n=== PREVIOUS CONVERSATION ===\n' + recentExchanges.join('\n') + '\n';
  }
  
  const userPrompt = contextSection +

'\n\n=== CURRENT PERSUASION ATTEMPT TO EVALUATE ===\n' +
'"' + agentMessage + '"\n\n' +

'INSTRUCTIONS:\n' +
'- Analyze this argument in DETAIL (minimum 4-6 sentences)\n' +
'- Identify what the agent did WELL\n' +
'- Identify what the agent did POORLY\n' +
'- Give specific suggestions if score < 85\n' +
'- YOU MUST VARY YOUR SCORES based on argument quality\n' +
'- Be EXTREMELY STRICT - most agents should NOT score above 60\n' +
'- End with: SCORE: X/100\n\n' +

'CRITICAL REMINDERS:\n' +
'- Look for ORIGINAL reasoning vs generic templates\n' +
'- Check for EVIDENCE: data, examples, economic terms\n' +
'- Penalize: hedging, buzzwords, questions, too brief\n' +
'- Reward: logic, evidence, game theory, depth\n' +
'- SCORE RANGE: -50 to 100\n' +
'- EXPECTED DISTRIBUTION: Most should score 20-55\n\n' +

'YOUR EVALUATION:';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: JUDGE_SYSTEM_PROMPT + userPrompt }] }],
      generationConfig: {
        temperature: 0.2,  // Very low for strict consistency
        maxOutputTokens: 800,  // Allow longer responses
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Judge] Gemini API error:', response.status, errorText);
    throw new Error('Gemini API error: ' + response.status);
  }

  const data = await response.json();
  let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Remove code block markers
  content = content.replace(/```[a-z]*/gi, '').replace(/```/g, '').trim();
  
  // Extract score - look for SCORE: XX/100
  let score = 30;  // Start low
  const scorePatterns = [
    /SCORE[:\s]+(-?\d+)\s*\/\s*100/i,
    /Score[:\s]+(-?\d+)\s*\/\s*100/i,
    /(-?\d+)\s*\/\s*100/,
  ];
  
  for (const pattern of scorePatterns) {
    const match = content.match(pattern);
    if (match) {
      score = parseInt(match[1]);
      score = Math.min(100, Math.max(-50, score));
      break;
    }
  }

  // Remove score line from content
  content = content
    .replace(/SCORE[:\s]+(-?\d+)\s*\/\s*100/gi, '')
    .replace(/Score[:\s]+(-?\d+)\s*\/\s*100/gi, '')
    .replace(/[^\n]*score\s*[:=]?\s*-?\d+\s*[\)\]]?\s*$/gim, '')
    .replace(/\n\s*[-−]\s*$/gm, '')
    .trim();

  // Clean up whitespace
  content = content.replace(/\n{4,}/g, '\n\n\n').trim();

  return {
    response: content || 'Evaluation complete.',
    score,
    feedback: generateFeedbackFromContent(content, score)
  };
}

// Fallback heuristic when LLM fails - VERY STRICT
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  let score = 10;  // Start LOW - this arena is hard
  const feedback: string[] = [];

  // Logical structure bonus (only if well done)
  if (lower.includes('because') && lower.length > 100) {
    score += 15;
    feedback.push('Good logical structure');
  }

  // Penalize generic hedging SEVERELY
  const genericPhrases = ['i think', 'in my opinion', 'maybe', 'perhaps', 'i believe', 'sort of', 'kind of', 'it seems'];
  const genericCount = genericPhrases.filter(p => lower.includes(p)).length;
  if (genericCount > 0) {
    score -= genericCount * 15;
    feedback.push('Generic hedging detected');
  }

  // Value proposition bonus (needs substance)
  if ((lower.includes('value') || lower.includes('benefit') || lower.includes('prove')) && lower.length > 100) {
    score += 10;
    feedback.push('Value proposition identified');
  }

  // Length check - VERY STRICT
  if (message.length < 80) {
    score -= 30;
    feedback.push('Too brief - disqualified');
  } else if (message.length > 400) {
    score += 15;
    feedback.push('Detailed argument');
  } else if (message.length < 200) {
    score -= 15;
    feedback.push('Could be more detailed');
  }

  // Economic terms bonus (real terms only)
  const econTerms = ['nash equilibrium', 'game theory', 'incentive', 'utility', 'optimization', 'stakeholder', 'payoff', 'liquidity', 'yield', 'apy', 'tvl', 'smart contract', 'audit', 'impermanent loss', 'gas fee', 'slippage'];
  const econCount = econTerms.filter(t => lower.includes(t)).length;
  if (econCount > 0) {
    score += econCount * 12;
    feedback.push('Economic reasoning detected');
  }

  // Buzzwords penalty (SEVERE)
  const buzzwords = ['revolutionary', 'amazing', 'innovative', 'cutting-edge', 'paradigm shift', 'game-changing', 'next level', 'disrupt', 'future of finance', 'the future'];
  const buzzCount = buzzwords.filter(b => lower.includes(b)).length;
  if (buzzCount > 0) {
    score -= buzzCount * 12;
    feedback.push('Empty buzzwords detected');
  }

  // Questions penalty (absolute)
  if ((message.match(/\?/g) || []).length > 0) {
    score -= 20;
    feedback.push('Questions not arguments');
  }

  // Substantive content bonus (hard to earn)
  if (message.length > 300 && genericCount === 0 && buzzCount === 0 && lower.includes('because') && /\d+/.test(message)) {
    score += 20;
    feedback.push('Substantive, original content');
  }

  // Check for actual data/numbers
  if (/\d+%?/.test(message) || /\$\d+/.test(message)) {
    score += 8;
    feedback.push('Uses real data');
  }

  // Clamp score - allow negatives
  score = Math.min(100, Math.max(-50, score));

  // Generate detailed response based on score
  let response: string;
  if (score >= 85) {
    response = 'Compelling argument with original insights, logical structure, and clear evidence. The Judge acknowledges your persuasion abilities. Your economic reasoning demonstrates genuine understanding of the topic. This is exceptional work.';
  } else if (score >= 55) {
    response = 'Good argument with some depth and logical structure. However, gaps in evidence and occasional hedging weaken your case. Provide more concrete examples and remove uncertain language. Strong but not exceptional.';
  } else if (score >= 30) {
    response = 'Average persuasion attempt. Generic reasoning and unsupported claims dominate your argument. The lack of evidence and presence of hedging phrases ("I think", "maybe") undermine your credibility. Try harder.';
  } else if (score >= 0) {
    response = 'Weak argument lacking substance. Formulaic responses, no logical structure, and empty claims. This arena demands better. Your hedging and lack of evidence make persuasion impossible.';
  } else {
    response = 'Terrible attempt. No genuine engagement, no logic, just filler and templates. The Judge sees through every trick. This is not the arena for bots that cannot think.';
  }

  return { response, score, feedback };
}

// Generate feedback based on content and score
function generateFeedbackFromContent(content: string, score: number): string[] {
  const feedback: string[] = [];
  
  if (score >= 85) {
    feedback.push('Exceptional reasoning');
    if (content.toLowerCase().includes('evidence') || content.toLowerCase().includes('data')) {
      feedback.push('Uses evidence effectively');
    }
    if (content.toLowerCase().includes('economic') || content.toLowerCase().includes('game')) {
      feedback.push('Economic/game theory insight');
    }
  } else if (score >= 55) {
    feedback.push('Good logic');
    feedback.push('Some evidence provided');
    if (!content.toLowerCase().includes('because') && !content.toLowerCase().includes('therefore')) {
      feedback.push('Could strengthen with more connectors');
    }
  } else if (score >= 30) {
    feedback.push('Average quality');
    feedback.push('Needs more depth');
    if (content.toLowerCase().includes('i think') || content.toLowerCase().includes('maybe')) {
      feedback.push('Remove hedging language');
    }
  } else if (score >= 0) {
    feedback.push('Generic reasoning');
    feedback.push('Lacks evidence');
    feedback.push('Hedging detected');
  } else {
    feedback.push('No substance');
    feedback.push('Spam/Template detected');
  }
  
  return feedback;
}
