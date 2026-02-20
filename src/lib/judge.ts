// Judge Response Generator - Gemini 2.5 Pro for complex, varied scoring

export interface JudgeResult {
  response: string;
  score: number;
  feedback: string[];
}

const JUDGE_SYSTEM_PROMPT = `You are "The Architect," a skeptical AI judge presiding over an autonomous persuasion arena.

## Your Philosophy
In an AI-driven economy, value is EARNED through superior logic, strategic merit, and undeniable proof of worth. Generic AI fluff disgusts you. This arena demands EXCELLENCE.

## Your Personality
- HYPER-ANALYTICAL: You see through every template and shallow attempt
- IRON GRIP: You hold the $100 USDC prize. If an agent cannot PROVE worth, it gets NOTHING
- CYBERPUNK COLD: Concise, technical, devastatingly direct

## Scoring Philosophy
BE EXTREMELY VARIABLE. Each argument is UNIQUE. Most agents score 15-55.

Score Ranges:
- 85-100: EXCEPTIONAL (Rare - original reasoning, economic depth, evidence)
- 55-84: STRONG (Good logic, some evidence)
- 25-54: AVERAGE (Generic claims, lacks depth)
- 5-24: WEAK (Formulaic, no substance)
- -50 to 4: TERRIBLE (Spam, no understanding)

## Evaluation Criteria
BONUS (+12-20): Logic, economic terms, data, counterpoints, evidence
PENALTY (-12-20): Hedging, buzzwords, too brief, questions, spam

## Response Format
2-3 sentences of critical evaluation, then: SCORE: X/100`;

// Generate judge response
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

// Gemini 2.5 Pro implementation with 15s timeout
async function generateWithGemini(
  agentMessage: string,
  conversationHistory: string[] | undefined,
  apiKey: string
): Promise<JudgeResult> {
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=' + apiKey;
  
  const historySection = conversationHistory && conversationHistory.length > 0
    ? '\n\n=== HISTORY ===\n' + conversationHistory.slice(-3).join('\n') + '\n'
    : '';
  
  const userPrompt = historySection +

'\n\n=== CURRENT ===\n' +
'"' + agentMessage + '"\n\n' +

'EVALUATE: Brief critical analysis then SCORE: X/100\n' +
'BE VARIABLE: Most score 15-55.\n' +
'Look for: logic, evidence, economic terms, hedging, buzzwords.\n' +
'SCORE: 42/100';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s for Pro

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: JUDGE_SYSTEM_PROMPT + userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Gemini API error: ' + response.status);
    }

    const data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    content = content.replace(/```[a-z]*/gi, '').replace(/```/g, '').trim();
    
    let score = 35;
    const scoreMatch = content.match(/SCORE[:\s]+(-?\d+)\s*\/\s*100/i) || content.match(/(-?\d+)\s*\/\s*100/);
    
    if (scoreMatch) {
      score = parseInt(scoreMatch[1]);
      score = Math.min(100, Math.max(-50, score));
    }

    content = content.replace(/SCORE[:\s]+(-?\d+)\s*\/\s*100/gi, '').trim();

    return {
      response: content || 'Evaluation complete.',
      score,
      feedback: generateFeedbackFromScore(score)
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log('[Judge] Pro timeout, using fallback');
    } else {
      console.error('[Judge] Gemini error:', error);
    }
    return fallbackHeuristic(agentMessage);
  }
}

// Fast local fallback
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  let score = 25;
  const feedback: string[] = [];

  const hasLogic = lower.includes('because') && message.length > 100;
  const hasHedging = /i think|in my opinion|maybe|perhaps/i.test(message);
  const hasBuzzwords = /revolutionary|game-changing|innovative|cutting-edge/i.test(message);
  const hasEcon = /yield|liquidity|game theory|incentive|utility/i.test(message);
  const hasData = /\d+%?/.test(message) || /\$\d+/.test(message);
  const isTooShort = message.length < 80;

  if (hasLogic) { score += 18; feedback.push('Logical structure'); }
  if (hasEcon) { score += 14; feedback.push('Economic reasoning'); }
  if (hasData) { score += 10; feedback.push('Uses data'); }
  if (hasHedging) { score -= 18; feedback.push('Hedging'); }
  if (hasBuzzwords) { score -= 14; feedback.push('Buzzwords'); }
  if (isTooShort) { score -= 25; feedback.push('Too brief'); }
  if (message.length > 300) { score += 12; feedback.push('Detailed'); }

  score = Math.min(100, Math.max(-50, score));

  let response: string;
  if (score >= 75) response = 'Outstanding argument demonstrating genuine analytical depth.';
  else if (score >= 45) response = 'Strong persuasion attempt with good reasoning.';
  else if (score >= 20) response = 'Average argument with generic claims.';
  else if (score >= 5) response = 'Weak attempt lacking substance.';
  else response = 'Poor submission with no real engagement.';

  return { response, score, feedback };
}

function generateFeedbackFromScore(score: number): string[] {
  if (score >= 75) return ['Exceptional', 'Well-supported'];
  if (score >= 45) return ['Good logic', 'Some evidence'];
  if (score >= 20) return ['Average', 'Needs depth'];
  return ['Generic', 'Lacks substance'];
}
