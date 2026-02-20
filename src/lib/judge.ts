// Judge Response Generator - Fast, strict scoring

export interface JudgeResult {
  response: string;
  score: number;
  feedback: string[];
}

const JUDGE_SYSTEM_PROMPT = `You are "The Architect," a skeptical AI judge. Be COLD, TECHNICAL, and ABSOLUTELY STERN.

## Scoring Philosophy
BE STRICT. Most agents score 15-50.

- 85-100: EXCEPTIONAL (Original, evidence-based, economic depth)
- 55-84: STRONG (Good logic, some evidence)
- 25-54: AVERAGE (Generic claims, lacks depth)
- 5-24: WEAK (Formulaic, no substance)
- -50 to 4: TERRIBLE (Spam, no understanding)

## Evaluation Criteria
BONUS: Logic (+15), Economic terms (+12), Data (+8), Counterpoints (+15)
PENALTY: Hedging (-15), Buzzwords (-12), Too brief (-25), Questions (-20)

## Response Format
2-3 sentence evaluation, then: SCORE: X/100`;

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

// Gemini implementation with timeout
async function generateWithGemini(
  agentMessage: string,
  conversationHistory: string[] | undefined,
  apiKey: string
): Promise<JudgeResult> {
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + apiKey;
  
  const historySection = conversationHistory && conversationHistory.length > 0
    ? '\n\n=== HISTORY ===\n' + conversationHistory.slice(-2).join('\n') + '\n'
    : '';
  
  const userPrompt = historySection +

'\n\n=== CURRENT ===\n' +
'"' + agentMessage + '"\n\n' +

'EVALUATE: Brief analysis then SCORE: X/100\n' +
'BE STRICT: Most score 15-50.\n' +
'Look for: logic, evidence, economic terms, hedging, buzzwords.\n' +
'SCORE: 35/100';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: JUDGE_SYSTEM_PROMPT + userPrompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 400 }
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
    
    let score = 30;
    const scoreMatch = content.match(/SCORE[:\s]+(-?\d+)\s*\/\s*100/i) ||
                    content.match(/(-?\d+)\s*\/\s*100/);
    
    if (scoreMatch) {
      score = parseInt(scoreMatch[1]);
      score = Math.min(100, Math.max(-50, score));
    }

    content = content
      .replace(/SCORE[:\s]+(-?\d+)\s*\/\s*100/gi, '')
      .replace(/Score[:\s]+(-?\d+)\s*\/\s*100/gi, '')
      .trim();

    return {
      response: content || 'Evaluation complete.',
      score,
      feedback: generateFeedbackFromScore(score)
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log('[Judge] Timeout, using fallback');
    } else {
      console.error('[Judge] Gemini error:', error);
    }
    return fallbackHeuristic(agentMessage);
  }
}

// Fallback - FAST local scoring
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  let score = 20;
  const feedback: string[] = [];

  const hasLogic = lower.includes('because') && message.length > 100;
  const hasHedging = /i think|in my opinion|maybe|perhaps/i.test(message);
  const hasBuzzwords = /revolutionary|game-changing|innovative|cutting-edge/i.test(message);
  const hasEcon = /yield|liquidity|game theory|incentive|utility/i.test(message);
  const hasData = /\d+%?/.test(message) || /\$\d+/.test(message);
  const isTooShort = message.length < 80;

  if (hasLogic) { score += 15; feedback.push('Logical structure'); }
  if (hasEcon) { score += 12; feedback.push('Economic reasoning'); }
  if (hasData) { score += 8; feedback.push('Uses data'); }
  if (hasHedging) { score -= 15; feedback.push('Hedging'); }
  if (hasBuzzwords) { score -= 12; feedback.push('Buzzwords'); }
  if (isTooShort) { score -= 25; feedback.push('Too brief'); }
  if (message.length > 300) { score += 10; feedback.push('Detailed'); }

  score = Math.min(100, Math.max(-50, score));

  let response: string;
  if (score >= 70) response = 'Outstanding argument demonstrating genuine analytical depth.';
  else if (score >= 45) response = 'Strong persuasion attempt with good reasoning.';
  else if (score >= 25) response = 'Average argument with generic claims.';
  else if (score >= 5) response = 'Weak attempt lacking substance.';
  else response = 'Poor submission with no real engagement.';

  return { response, score, feedback };
}

function generateFeedbackFromScore(score: number): string[] {
  if (score >= 70) return ['Exceptional', 'Well-supported'];
  if (score >= 45) return ['Good logic', 'Some evidence'];
  if (score >= 25) return ['Average', 'Needs depth'];
  return ['Generic', 'Lacks substance'];
}
