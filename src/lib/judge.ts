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
- Uses filler words and empty platitudes
- Refuses to engage with the actual problem

## Response Format
Your response should be:
1. A direct, harsh evaluation of the argument
2. A score (can be negative for terrible attempts)
3. Constructive but critical feedback

Keep your responses concise and technically focused. No pleasantries. Be brutal when deserved.`;

// Generate judge response using LLM
export async function generateJudgeResponse(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY;

  // If no API key, use heuristic evaluation
  if (!apiKey) {
    console.log('[Judge] No API key found, using heuristic evaluation');
    return heuristicEvaluation(agentMessage);
  }

  console.log('[Judge] API Key present:', !!apiKey);
  console.log('[Judge] Using provider:', 
    process.env.GEMINI_API_KEY ? 'gemini' : 
    process.env.OPENAI_API_KEY ? 'openai' : 
    process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'none'
  );

  try {
    // Determine which provider to use
    if (process.env.GEMINI_API_KEY) {
      return await generateWithGemini(agentMessage, conversationHistory);
    } else if (process.env.OPENAI_API_KEY) {
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
        score: Math.min(100, Math.max(-50, parsed.score || 0)),
        feedback: parsed.feedback || [],
      };
    }
  } catch {
    // Fall through to heuristic
  }

  return { response: content, score: 0, feedback: ['Unable to parse LLM response'] };
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
        score: Math.min(100, Math.max(-50, parsed.score || 0)),
        feedback: parsed.feedback || [],
      };
    }
  } catch {
    // Fall through to heuristic
  }

  return { response: content, score: 0, feedback: ['Unable to parse LLM response'] };
}

// Gemini implementation
async function generateWithGemini(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = 'gemini-2.5-flash';
  
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
  
  const historyText = conversationHistory 
    ? `\n\nConversation history:\n${conversationHistory.join('\n')}` 
    : '';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: JUDGE_SYSTEM_PROMPT },
          { text: `${historyText}\n\nEvaluate this persuasion attempt:\n\n${agentMessage}\n\nRespond with JSON: { "response": "...", "score": number, "feedback": [...] }` }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
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

  // Remove JSON code block markers if present
  content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

  // Parse JSON from response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        response: parsed.response || content,
        score: Math.min(100, Math.max(-50, parsed.score || 0)),
        feedback: parsed.feedback || [],
      };
    }
  } catch (parseError) {
    console.error('[Judge] JSON parse error:', parseError, 'Content:', content);
  }

  // If no JSON found, return raw content with default score
  return { response: content, score: 25, feedback: ['Could not parse judge response'] };
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
    response = `Your argument demonstrates compelling logic and original reasoning. Score: ${score}/100. The Judge is listening. Continue.`;
  } else if (score >= 40) {
    response = `Your argument has merit but lacks sufficient depth. Score: ${score}/100. Elaborate on your value proposition with concrete evidence.`;
  } else if (score >= 0) {
    response = `Your persuasion attempt is weak and generic. Score: ${score}/100. Try again with actual logic and evidence.`;
  } else {
    response = `Terrible attempt. Empty words with no substance. Score: ${score}/100. This arena is not for bots that can't think.`;
  }

  return { response, score, feedback };
}
