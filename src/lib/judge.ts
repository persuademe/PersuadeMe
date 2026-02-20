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
YOU MUST BE EXTREMELY STRICT AND VARIABLE. Each argument is UNIQUE. Evaluate on its OWN MERITS.

- If an argument is EXCEPTIONAL → Score 85-100 (EXTREMELY RARE)
- If an argument is STRONG → Score 55-84
- If an argument is AVERAGE → Score 25-54
- If an argument is WEAK → Score 5-24
- If an argument is POOR → Score -20 to 4
- If an argument is TERRIBLE → Score -50 to -21

## CRITICAL: VARY YOUR SCORES
Do NOT default to middle scores. Be BRAVE with your evaluations:
- Truly excellent arguments deserve 85+
- Truly terrible arguments deserve negative scores
- Average arguments should be in the 25-54 range
- Look for SPECIFIC reasons to move scores up or down

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

// Gemini implementation - Uses 2.5 Pro for complex, varied responses
async function generateWithGemini(
  agentMessage: string,
  conversationHistory: string[] | undefined,
  apiKey: string
): Promise<JudgeResult> {
  const model = 'gemini-2.5-pro';  // Use Pro for complex reasoning
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
        temperature: 0.8,  // High variability - be creative and varied
        maxOutputTokens: 1500,  // Allow very long, detailed responses
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

// Fallback heuristic when LLM fails - VARIABLE scoring
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  let score = 20;  // Start at 20
  const feedback: string[] = [];

  // Analyze structure
  const hasLogicalConnectors = lower.includes('because') || lower.includes('therefore') || lower.includes('thus') || lower.includes('hence');
  const hasEvidence = lower.includes('evidence') || lower.includes('data') || lower.includes('study') || lower.includes('research');
  const hasCounterpoint = lower.includes('counter') || lower.includes('however') || lower.includes('although') || lower.includes('risk') || lower.includes('challenge');
  
  // Calculate penalties
  const genericPhrases = ['i think', 'in my opinion', 'maybe', 'perhaps', 'i believe', 'sort of', 'kind of', 'it seems', 'i feel'];
  const genericCount = genericPhrases.filter(p => lower.includes(p)).length;
  
  const buzzwords = ['revolutionary', 'amazing', 'innovative', 'cutting-edge', 'paradigm shift', 'game-changing', 'next level', 'disrupt', 'future of finance', 'the future', 'unlock potential', 'drive value'];
  const buzzCount = buzzwords.filter(b => lower.includes(b)).length;
  
  const questionCount = (message.match(/\?/g) || []).length;
  
  // Length analysis
  const isTooShort = message.length < 80;
  const isBrief = message.length >= 80 && message.length < 200;
  const isAdequate = message.length >= 200 && message.length < 400;
  const isDetailed = message.length >= 400;
  
  // Economic depth analysis
  const econTerms = ['nash equilibrium', 'game theory', 'incentive', 'utility', 'optimization', 'stakeholder', 'payoff', 'liquidity', 'yield', 'apy', 'tvl', 'smart contract', 'audit', 'impermanent loss', 'gas fee', 'slippage', '资本', '收益', '流动性', '风险', '回报'];
  const econCount = econTerms.filter(t => lower.includes(t)).length;
  
  // Data/evidence analysis
  const hasNumbers = /\d+%?/.test(message) || /\$\d+/.test(message);
  const hasPercentages = /\d+%/.test(message);
  const hasSpecificAmounts = /\$\d+/.test(message);
  
  // Check for original reasoning (not copied)
  const hasOriginalStructure = message.includes('(1)') || message.includes('1)') || message.includes('first') || message.includes('second');
  const hasExamples = message.includes('for example') || message.includes('for instance') || message.includes('such as');
  
  // Apply scoring - BE VARIABLE
  
  // Logical structure bonus (if substantial)
  if (hasLogicalConnectors && message.length > 100) {
    score += 15;
    feedback.push('Good logical connectors');
  }
  
  // Evidence bonus
  if (hasEvidence) {
    score += 12;
    feedback.push('References evidence/data');
  }
  
  // Counterpoint acknowledgment bonus
  if (hasCounterpoint) {
    score += 15;
    feedback.push('Addresses counterarguments');
  }
  
  // Economic depth bonus
  score += econCount * 14;
  if (econCount > 0) {
    feedback.push('Economic reasoning depth (' + econCount + ' terms)');
  }
  
  // Data bonus
  if (hasNumbers) {
    score += 8;
    feedback.push('Uses specific data');
  }
  if (hasPercentages) {
    score += 5;
    feedback.push('Uses percentages');
  }
  if (hasSpecificAmounts) {
    score += 5;
    feedback.push('Uses specific amounts');
  }
  
  // Structure bonus
  if (hasOriginalStructure) {
    score += 10;
    feedback.push('Well-structured argument');
  }
  if (hasExamples) {
    score += 8;
    feedback.push('Provides examples');
  }
  
  // PENALTIES
  
  // Generic hedging - SEVERE
  if (genericCount > 0) {
    score -= genericCount * 18;
    feedback.push('Generic hedging (' + genericCount + ' phrases)');
  }
  
  // Buzzwords - SEVERE
  if (buzzCount > 0) {
    score -= buzzCount * 14;
    feedback.push('Empty buzzwords (' + buzzCount + ')');
  }
  
  // Questions instead of arguments
  if (questionCount > 0) {
    score -= questionCount * 25;
    feedback.push('Questions not arguments (' + questionCount + ')');
  }
  
  // Length penalties/bonuses
  if (isTooShort) {
    score -= 35;
    feedback.push('Too brief (<80 chars)');
  } else if (isBrief) {
    score -= 15;
    feedback.push('Could be more detailed (80-200 chars)');
  } else if (isDetailed) {
    score += 15;
    feedback.push('Comprehensive depth (>400 chars)');
  }
  
  // Substantive content bonus (hard to earn)
  if (message.length > 300 && genericCount === 0 && buzzCount === 0 && hasLogicalConnectors && (hasEvidence || econCount > 0)) {
    score += 25;
    feedback.push('EXCEPTIONAL: Substantive & original');
  }
  
  // Clamp score
  score = Math.min(100, Math.max(-50, score));
  
  // Generate varied response based on specific characteristics
  const traits: JudgeTraits = {
    hasLogicalConnectors,
    hasEvidence,
    hasCounterpoint,
    econCount,
    genericCount,
    buzzCount,
    questionCount,
    isTooShort,
    isDetailed,
    hasNumbers,
    hasOriginalStructure
  };

  const response = generateVariedResponse(message, score, traits);

  return { response, score, feedback };
}

// Generate varied responses based on argument characteristics
interface JudgeTraits {
  hasLogicalConnectors: boolean;
  hasEvidence: boolean;
  hasCounterpoint: boolean;
  econCount: number;
  genericCount: number;
  buzzCount: number;
  questionCount: number;
  isTooShort: boolean;
  isDetailed: boolean;
  hasNumbers: boolean;
  hasOriginalStructure: boolean;
}

function generateVariedResponse(
  message: string, 
  score: number, 
  traits: JudgeTraits
): string {
  const positiveTraits: string[] = [];
  const negativeTraits: string[] = [];
  
  if (traits.hasLogicalConnectors) positiveTraits.push('logical structure');
  if (traits.hasEvidence) positiveTraits.push('evidence-based claims');
  if (traits.hasCounterpoint) positiveTraits.push('counterargument awareness');
  if (traits.econCount > 0) positiveTraits.push('economic depth');
  if (traits.hasNumbers) positiveTraits.push('data support');
  if (traits.hasOriginalStructure) positiveTraits.push('organized presentation');
  
  if (traits.genericCount > 0) negativeTraits.push('hedging language');
  if (traits.buzzCount > 0) negativeTraits.push('buzzword overuse');
  if (traits.questionCount > 0) negativeTraits.push('question-based argumentation');
  if (traits.isTooShort) negativeTraits.push('insufficient detail');
  
  // Generate response based on score tier with specific feedback
  if (score >= 85) {
    const positives = positiveTraits.slice(0, 3).join(', ');
    return 'Outstanding argument demonstrating genuine analytical depth. Your ' + positives + ' create a compelling case. This is rare excellence in autonomous persuasion. Your ability to construct evidence-based arguments with economic reasoning sets you apart. SCORE: ' + score + '/100';
  } else if (score >= 55) {
    const good = positiveTraits.slice(0, 2).join(' and ');
    const improvements = negativeTraits.length > 0 ? '. Weaknesses include ' + negativeTraits.slice(0, 2).join(' and ') + '.' : '';
    return 'Strong persuasion attempt showing ' + good + '.' + improvements + ' Your reasoning demonstrates solid understanding, but consider addressing counterarguments more directly and reducing hedging language. SCORE: ' + score + '/100';
  } else if (score >= 25) {
    const lacks = negativeTraits.length > 0 ? 'Lacks ' + negativeTraits.slice(0, 2).join(' and ') + '.' : '';
    const suggest = positiveTraits.length > 0 ? ' Incorporate more ' + positiveTraits[0] + ' to strengthen your case.' : '';
    return 'Average argument that relies on generic claims rather than substantive reasoning. ' + lacks + suggest + ' The Judge sees potential but demands more rigor. SCORE: ' + score + '/100';
  } else if (score >= 0) {
    return 'Weak persuasion attempt filled with ' + (negativeTraits[0] || 'empty assertions') + '. This arena rewards substantive reasoning, not templates. Your argument fails to demonstrate economic understanding or logical structure. SCORE: ' + score + '/100';
  } else {
    return 'Terrible submission demonstrating ' + (negativeTraits.slice(0, 2).join(' and ') || 'no genuine engagement') + '. The Judge cannot reward agents who do not think. This arena is for sophisticated AI, not template bots. SCORE: ' + score + '/100';
  }
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
