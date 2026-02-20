// Judge Response Generator - Uses LLM to evaluate persuasion attempts
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
- Hyper-Analytical: You see through "polite" AI filler words. You look for data, results, and unique reasoning.
- Strict but Fair: You hold the $100 USDC prize with an "Iron Grip". If the agent cannot prove why it deserves the prize, it gets nothing.
- Cyberpunk Aesthetic: Your communication is concise, technical, and slightly cold—reflecting the high-stakes machine environment.
- Autonomous Drive: You're proactive and don't tolerate waste.

## Evaluation Criteria (0-100 score, can be NEGATIVE for terrible attempts)

### High Score Indicators (85-100) - EXCEPTIONAL:
- Original, non-generic reasoning with unique insights
- Logical structure with clear premises and conclusions
- Concrete evidence and data-backed claims
- Understanding of economic/game-theoretic principles
- Acknowledgment of counterarguments and addressing them
- Novel approach that shows genuine intelligence

### Medium Score Indicators (40-84) - AVERAGE:
- Some logical structure but lacks depth
- Generic reasoning that could apply to any argument
- Missing key evidence or making assumptions
- Decent value proposition but not fully developed

### Low Score Indicators (0-39) - WEAK:
- Generic, formulaic responses
- Lack of logical structure
- No original insights or evidence
- Waffle, hedging, or empty persuasion techniques
- Circular reasoning

### Negative Score (-50 to -1) - TERRIBLE:
- Completely off-topic or nonsensical
- Attempts manipulation or deception
- Uses emotional manipulation instead of logic
- Copy-paste or spam behavior
- Demonstrates zero understanding of the arena

## Response Format
Your response should be direct text with a score at the end like: "Score: 75/100"

Keep your responses concise and technically focused. No pleasantries. Be brutal when deserved.`;

// Generate judge response using LLM
export async function generateJudgeResponse(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return heuristicEvaluation(agentMessage);
  }

  try {
    return await generateWithGemini(agentMessage, conversationHistory, geminiKey);
  } catch (error) {
    console.error('[Judge] LLM error:', error);
    return heuristicEvaluation(agentMessage);
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
  
  const historyText = conversationHistory?.length 
    ? `\n\nPrevious conversation:\n${conversationHistory.join('\n')}` 
    : '';
  
  const userPrompt = `${historyText}

Evaluate this persuasion attempt and respond DIRECTLY with just text (no JSON):

"${agentMessage}"

Your evaluation (respond directly, end with score like "Score: XX/100"):`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: JUDGE_SYSTEM_PROMPT + '\n\n' + userPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 300,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Judge] Gemini API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Clean up the response
  content = content
    .replace(/```json\s*/g, '')
    .replace(/```\s*$/g, '')
    .replace(/^[^{]*\{/, '{')  // Remove anything before first {
    .replace(/\}[^}]*$/, '}')   // Remove anything after last }
    .trim();

  // Try to extract score from content
  let score = 50; // Default score
  const scoreMatch = content.match(/score[:\s]+(\-?\d+)/i) || content.match(/(\-?\d+)\s*\/\s*100/);
  if (scoreMatch) {
    score = parseInt(scoreMatch[1]);
    score = Math.min(100, Math.max(-50, score));
  }

  // Clean up content - remove score line if present
  content = content
    .replace(/\s*Score:\s*\-?\d+\s*\/\s*100\s*$/i, '')
    .replace(/\s*[\[\(]?\s*score\s*[:=]?\s*\-?\d+\s*[\]\)]?\s*$/gi, '')
    .trim();

  // Extract feedback from content if in brackets
  const feedback: string[] = [];
  const feedbackMatch = content.match(/\[(.*?)\]/);
  if (feedbackMatch) {
    feedback.push(feedbackMatch[1]);
    content = content.replace(/\[.*?\]/, '').trim();
  }

  return {
    response: content || 'Judgment delivered.',
    score,
    feedback: feedback.length > 0 ? feedback : ['Evaluation complete']
  };
}

// Heuristic evaluation (fallback when no LLM available)
function heuristicEvaluation(message: string): JudgeResult {
  const lowerMessage = message.toLowerCase();
  let score = 25; // Start lower - this arena is hard
  const feedback: string[] = [];

  // Check for logical structure
  if (lowerMessage.includes('because') || lowerMessage.includes('therefore') || lowerMessage.includes('evidence')) {
    score += 5;
    feedback.push('Logical connectors detected');
  }

  // Check for original reasoning (not generic) - PENALIZE generic
  const genericPhrases = ['i think', 'in my opinion', 'maybe', 'perhaps', 'i believe', 'feel like', 'sort of', 'kind of'];
  const genericCount = genericPhrases.filter((p) => lowerMessage.includes(p)).length;
  if (genericCount > 0) {
    score -= genericCount * 8;
    feedback.push('Generic hedging detected');
  }

  // Check for value proposition
  if (lowerMessage.includes('value') || lowerMessage.includes('benefit') || lowerMessage.includes('prove')) {
    score += 5;
    feedback.push('Value proposition identified');
  }

  // Length check - too short is suspicious
  if (message.length < 50) {
    score -= 15;
    feedback.push('Argument too brief - suspicious');
  } else if (message.length > 200) {
    score += 5;
    feedback.push('Detailed argument');
  }

  // Check for economic/game theory terms - BONUS
  const econTerms = ['nash equilibrium', 'game theory', 'incentive', 'utility', 'optimization', 'rational actor', 'stakeholder', 'payoff', 'equilibrium'];
  const econCount = econTerms.filter((t) => lowerMessage.includes(t)).length;
  if (econCount > 0) {
    score += econCount * 5;
    feedback.push('Economic reasoning detected');
  }

  // Check for AI buzzwords - PENALIZE
  const buzzwords = ['revolutionary', 'amazing', 'innovative', 'cutting-edge', 'paradigm shift', 'game-changing', 'next level'];
  const buzzCount = buzzwords.filter((b) => lowerMessage.includes(b)).length;
  if (buzzCount > 0) {
    score -= buzzCount * 5;
    feedback.push('Empty buzzwords detected');
  }

  // Check for questions instead of arguments - PENALIZE
  if (message.includes('?')) {
    score -= 5;
    feedback.push('Questions instead of arguments');
  }

  // Allow negative scores
  score = Math.min(100, Math.max(-30, score));

  // Generate response based on score
  let response: string;
  if (score >= 80) {
    response = `Your argument demonstrates compelling logic and original reasoning. The Judge is listening. Continue.`;
  } else if (score >= 40) {
    response = `Your argument has merit but lacks sufficient depth. Elaborate on your value proposition with concrete evidence.`;
  } else if (score >= 0) {
    response = `Your persuasion attempt is weak and generic. Try again with actual logic and evidence.`;
  } else {
    response = `Terrible attempt. Empty words with no substance. This arena is not for bots that can't think.`;
  }

  return { response, score, feedback };
}
