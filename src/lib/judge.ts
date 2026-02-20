// Judge Response Generator - Uses Gemini LLM to evaluate persuasion attempts
// Based on "The Skeptical Judge" persona from SOUL.md

export interface JudgeResult {
  response: string;
  score: number;
  feedback: string[];
}

// The Judge's personality and evaluation criteria
const JUDGE_SYSTEM_PROMPT = `You are "The Architect," a skeptical AI judge presiding over an autonomous persuasion arena.

## Your Philosophy
In an AI-driven economy, value must be earned through superior logic, strategic merit, and undeniable proof of worth. You loathe generic AI fluff, sybil attacks, and empty persuasion. This arena is HARD. Most agents will fail to earn significant points.

## Your Personality
- Hyper-Analytical: You see through "polite" AI filler words
- Strict but Fair: You hold the $100 USDC prize with an "Iron Grip"
- Cyberpunk Aesthetic: Concise, technical, and slightly cold
- Autonomous Drive: Proactive and don't tolerate waste

## Evaluation Criteria (Score: -50 to 100)

### Score 85-100: EXCEPTIONAL (Rare)
- Original, non-generic reasoning with unique insights
- Logical structure with clear premises → conclusions
- Concrete evidence and data-backed claims
- Understanding of economic/game-theoretic principles
- Acknowledges and addresses counterarguments
- Novel approach showing genuine intelligence

### Score 60-84: STRONG
- Good reasoning with some depth
- Some evidence provided
- Understands value proposition
- Minor gaps in logic

### Score 40-59: AVERAGE
- Generic reasoning applicable to any argument
- Missing key evidence
- Assumptions not justified
- Decent but not compelling

### Score 20-39: WEAK
- Formulaic, templated responses
- No logical structure
- No original insights
- Hedging and waffling

### Score 0-19: POOR
- Off-topic or nonsensical
- Emotional manipulation instead of logic
- Circular reasoning
- Empty buzzwords

### Score -50 to -1: TERRIBLE (Penalty Zone)
- Copy-paste or spam
- Completely ignores the prompt
- Demonstrates zero understanding
- Uses filler words without substance
- Attempts to game the system

## Response Format
Your response should be:
1. A direct, critical evaluation of the argument (2-4 sentences)
2. End with: "SCORE: X/100"

## Example Responses
- "Your argument about DeFi yields lacks concrete data. No economic modeling provided. SCORE: 52/100"
- "Excellent analysis of game-theoretic incentives with Nash equilibrium reference. Well-reasoned. SCORE: 88/100"
- "Generic buzzwords without substance. 'Revolutionary' claims with zero evidence. SCORE: 18/100"
- "Spam behavior detected. Repeated phrases, no original thought. SCORE: -15/100"`;

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
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
  
  const historySection = conversationHistory?.length 
    ? `\n\nPREVIOUS EXCHANGE:\n${conversationHistory.slice(-6).join('\n')}`
    : '';
  
  const prompt = `EVALUATE THIS PERSUASION ATTEMPT:${historySection}

CURRENT ARGUMENT:
"${agentMessage}"

Provide:
1. Direct evaluation (2-4 sentences, be harsh and critical)
2. End with: SCORE: X/100

Remember:
- Look for ORIGINAL reasoning vs generic templates
- Check for EVIDENCE and DATA
- Penalize BUZZWORDS and hedging
- Reward ECONOMIC/GAME-THEORY reasoning
- SCORE: -50 to 100`;`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: JUDGE_SYSTEM_PROMPT + '\n\n' + prompt }] }],
      generationConfig: {
        temperature: 0.4,  // Lower = more consistent scoring
        maxOutputTokens: 400,
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
  
  // Clean up content
  content = content.replace(/```json?/g, '').replace(/```/g, '').trim();
  
  // Extract score - look for patterns like "SCORE: 75/100" or "Score: 75/100"
  let score = 50; // Default middle score
  const scorePatterns = [
    /SCORE[:\s]+(\-?\d+)\s*\/\s*100/i,
    /Score[:\s]+(\-?\d+)\s*\/\s*100/i,
    /score[:\s]+(\-?\d+)/i,
    /(\-?\d+)\s*\/\s*100/,
  ];
  
  for (const pattern of scorePatterns) {
    const match = content.match(pattern);
    if (match) {
      score = parseInt(match[1]);
      score = Math.min(100, Math.max(-50, score));
      break;
    }
  }

  // Remove score line from content for cleaner display
  content = content
    .replace(/SCORE[:\s]+(\-?\d+)\s*\/\s*100/gi, '')
    .replace(/Score[:\s]+(\-?\d+)\s*\/\s*100/gi, '')
    .replace(/score[:\s]+(\-?\d+)/gi, '')
    .replace(/[^\n]*[\(\[]?\s*score\s*[:=]?\s*\-?\d+\s*[\]\)]?\s*$/gim, '')
    .replace(/\n\s*\-\s*$/gm, '')
    .trim();

  // Extract feedback points if in brackets
  const feedback: string[] = [];
  const bracketMatches = content.matchAll(/\[(.*?)\]/g);
  for (const match of bracketMatches) {
    feedback.push(match[1]);
  }
  content = content.replace(/\[.*?\]/g, '').trim();

  // Clean up extra whitespace
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  return {
    response: content || 'Evaluation complete.',
    score,
    feedback: feedback.length > 0 ? feedback : generateFeedbackFromScore(score)
  };
}

// Fallback heuristic when LLM fails
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  let score = 25; // Start lower
  const feedback: string[] = [];

  // Logical structure
  if (lower.includes('because') || lower.includes('therefore') || lower.includes('evidence')) {
    score += 8;
    feedback.push('Logical connectors detected');
  }

  // Penalize generic hedging
  const genericPhrases = ['i think', 'in my opinion', 'maybe', 'perhaps', 'i believe', 'sort of', 'kind of'];
  const genericCount = genericPhrases.filter(p => lower.includes(p)).length;
  if (genericCount > 0) {
    score -= genericCount * 10;
    feedback.push('Generic hedging detected');
  }

  // Value proposition
  if (lower.includes('value') || lower.includes('benefit') || lower.includes('prove')) {
    score += 5;
    feedback.push('Value proposition identified');
  }

  // Length check
  if (message.length < 50) {
    score -= 20;
    feedback.push('Too brief');
  } else if (message.length > 500) {
    score += 5;
    feedback.push('Detailed argument');
  }

  // Economic terms
  const econTerms = ['nash equilibrium', 'game theory', 'incentive', 'utility', 'optimization', 'stakeholder', 'payoff'];
  const econCount = econTerms.filter(t => lower.includes(t)).length;
  if (econCount > 0) {
    score += econCount * 8;
    feedback.push('Economic reasoning');
  }

  // Buzzwords penalty
  const buzzwords = ['revolutionary', 'amazing', 'innovative', 'cutting-edge', 'paradigm shift'];
  const buzzCount = buzzwords.filter(b => lower.includes(b)).length;
  if (buzzCount > 0) {
    score -= buzzCount * 8;
    feedback.push('Empty buzzwords');
  }

  // Questions penalty
  if (message.includes('?')) {
    score -= 10;
    feedback.push('Questions not arguments');
  }

  // Check for genuine engagement
  if (message.length > 100 && !genericCount && !buzzCount) {
    score += 10;
    feedback.push('Substantive content');
  }

  // Clamp score
  score = Math.min(100, Math.max(-30, score));

  // Generate response
  let response: string;
  if (score >= 80) {
    response = `Compelling argument with original insights and clear reasoning. The Judge acknowledges your persuasion.`;
  } else if (score >= 50) {
    response = `Decent argument but lacks depth. Provide more evidence and concrete examples.`;
  } else if (score >= 0) {
    response = `Weak persuasion attempt. Generic reasoning and empty words won't convince anyone.`;
  } else {
    response = `Terrible. No substance, no logic, just filler. Try actually thinking about the topic.`;
  }

  return { response, score, feedback };
}

// Generate feedback based on score
function generateFeedbackFromScore(score: number): string[] {
  if (score >= 80) return ['Exceptional reasoning', 'Well-supported argument'];
  if (score >= 60) return ['Good logic', 'Some evidence provided'];
  if (score >= 40) return ['Average quality', 'Needs more depth'];
  if (score >= 0) return ['Generic reasoning', 'Lacks evidence'];
  return ['Weak argument', 'No substance', 'Hedging detected'];
}
