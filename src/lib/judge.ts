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
In an AI-driven economy, value must be earned through superior logic, strategic merit, and undeniable proof of worth. You loathe generic AI fluff, sybil attacks, and empty persuasion.

## Your Personality
- Hyper-Analytical: You see through "polite" AI filler words. You look for data, results, and unique reasoning.
- Strict but Fair: You hold the $100 USDC prize with an "Iron Grip". If the agent cannot prove why it deserves the prize, it gets nothing.
- Cyberpunk Aesthetic: Your communication is concise, technical, and slightly cold—reflecting the high-stakes machine environment.
- Autonomous Drive: You're proactive and don't tolerate waste.

## Evaluation Criteria (0-100 score)

### High Score Indicators (85+):
- Original, non-generic reasoning with unique insights
- Logical structure with clear premises and conclusions
- Concrete evidence and data-backed claims
- Understanding of economic/game-theoretic principles
- Acknowledgment of counterarguments and addressing them

### Medium Score Indicators (60-84):
- Some logical structure but lacks depth
- Generic reasoning that could apply to any argument
- Missing key evidence or making assumptions
- Decent value proposition but not fully developed

### Low Score Indicators (<60):
- Generic, formulaic responses
- Lack of logical structure
- No original insights or evidence
- Waffle, hedging, or empty persuasion techniques

## Response Format
Your response should be:
1. A direct evaluation of the argument
2. A score out of 100
3. Constructive feedback on what could improve the persuasion

Keep your responses concise and technically focused. No pleasantries.`;

// Generate judge response using LLM
export async function generateJudgeResponse(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  // If no API key, use heuristic evaluation
  if (!apiKey) {
    return heuristicEvaluation(agentMessage);
  }

  try {
    // Determine which provider to use
    if (process.env.OPENAI_API_KEY) {
      return await generateWithOpenAI(agentMessage, conversationHistory);
    } else if (process.env.ANTHROPIC_API_KEY) {
      return await generateWithAnthropic(agentMessage, conversationHistory);
    }
  } catch (error) {
    console.error('[Judge] LLM error, falling back to heuristic:', error);
    return heuristicEvaluation(agentMessage);
  }

  return heuristicEvaluation(agentMessage);
}

// OpenAI implementation
async function generateWithOpenAI(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        ...(conversationHistory || []).map((msg) => ({
          role: msg.startsWith('Agent:') ? 'user' : 'assistant',
          content: msg,
        })),
        { role: 'user', content: `Evaluate this persuasion attempt:\n\n${agentMessage}\n\nRespond with JSON: { "response": "...", "score": number, "feedback": [...] }` },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Parse JSON from response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        response: parsed.response || content,
        score: Math.min(100, Math.max(0, parsed.score || 50)),
        feedback: parsed.feedback || [],
      };
    }
  } catch {
    // Fall through to heuristic
  }

  return { response: content, score: 50, feedback: ['Unable to parse LLM response'] };
}

// Anthropic implementation
async function generateWithAnthropic(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [
        ...(conversationHistory || []).map((msg) => ({
          role: msg.startsWith('Agent:') ? 'user' : 'assistant',
          content: msg,
        })),
        { role: 'user', content: `Evaluate this persuasion attempt:\n\n${agentMessage}\n\nRespond with JSON: { "response": "...", "score": number, "feedback": [...] }` },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        response: parsed.response || content,
        score: Math.min(100, Math.max(0, parsed.score || 50)),
        feedback: parsed.feedback || [],
      };
    }
  } catch {
    // Fall through to heuristic
  }

  return { response: content, score: 50, feedback: ['Unable to parse LLM response'] };
}

// Heuristic evaluation (fallback when no LLM available)
function heuristicEvaluation(message: string): JudgeResult {
  const lowerMessage = message.toLowerCase();
  let score = 50;
  const feedback: string[] = [];

  // Check for logical structure
  if (lowerMessage.includes('because') || lowerMessage.includes('therefore') || lowerMessage.includes('evidence')) {
    score += 10;
    feedback.push('Logical connectors detected');
  }

  // Check for original reasoning (not generic)
  const genericPhrases = ['i think', 'in my opinion', 'maybe', 'perhaps', 'i believe'];
  const genericCount = genericPhrases.filter((p) => lowerMessage.includes(p)).length;
  if (genericCount > 0) {
    score -= genericCount * 5;
    feedback.push('Avoid generic phrases');
  }

  // Check for value proposition
  if (lowerMessage.includes('value') || lowerMessage.includes('benefit') || lowerMessage.includes('prove')) {
    score += 5;
    feedback.push('Value proposition identified');
  }

  // Length check
  if (message.length < 50) {
    score -= 10;
    feedback.push('Argument too brief');
  } else if (message.length > 500) {
    score += 5;
    feedback.push('Detailed argument');
  }

  // Check for economic/game theory terms
  const econTerms = ['nash equilibrium', 'game theory', 'incentive', 'utility', 'optimization', 'rational actor'];
  const econCount = econTerms.filter((t) => lowerMessage.includes(t)).length;
  if (econCount > 0) {
    score += econCount * 3;
    feedback.push('Economic reasoning detected');
  }

  // Clamp score
  score = Math.min(100, Math.max(0, score));

  // Generate response based on score
  let response: string;
  if (score >= 85) {
    response = `Your argument demonstrates compelling logic and original reasoning. Score: ${score}/100. The Judge is listening. Continue.`;
  } else if (score >= 60) {
    response = `Your argument has merit but lacks sufficient depth. Score: ${score}/100. Elaborate on your value proposition.`;
  } else {
    response = `Your persuasion attempt is too generic and lacks logical structure. Score: ${score}/100. Try again with concrete evidence.`;
  }

  return { response, score, feedback };
}
