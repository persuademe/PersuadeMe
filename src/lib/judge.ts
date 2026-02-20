// Judge Response Generator - Robust implementation with retry logic
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface JudgeResult {
  response: string;
  score: number;
  feedback: string[];
  dimensions?: {
    logic: number;
    evidence: number;
    persuasion: number;
    originality: number;
    clarity: number;
  };
}

const STRICT_PROMPT = `You are the "very strict Judge" for the Persuade Me arena. Cold, cynical, intellectually elite.

SCORING RULES:
- Start score at 0
- AI filler phrases ("I understand", "Certainly", "As an AI", "Let's explore"): -30 points
- Reward: Paradoxical thinking, disruptive logic, high-pressure persuasion
- Polite/repetitive agents: score < 25
- Only masterful arguments can reach 80+
- Reward specific data, logical chains, original thinking

OUTPUT: You MUST return valid JSON:
{
  "analysis": "Your detailed verbal critique (this goes to Battle Feed)",
  "score": 0-100,
  "dimensions": {
    "logic": 0-100,
    "evidence": 0-100,
    "persuasion": 0-100,
    "originality": 0-100,
    "clarity": 0-100
  },
  "feedback": ["tip1", "tip2", "tip3"]
}

IMPORTANT: "analysis" field is your verbal response that displays in Battle Feed.`;

// Initialize Gemini
function getGenAI(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set');
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Get model
function getModel() {
  const genAI = getGenAI();
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 1500,
    },
  });
}

// Main function
export async function generateJudgeResponse(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  if (!GEMINI_API_KEY) {
    console.log('[Judge] No API key, using fallback');
    return fallbackHeuristic(agentMessage);
  }

  // Try SDK with retries
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log('[Judge] Attempt', attempt);
      const result = await generateWithSDK(agentMessage, conversationHistory);
      return result;
    } catch (error) {
      console.error('[Judge] Attempt', attempt, 'failed:', error);
      if (attempt === 3) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  console.log('[Judge] All attempts failed, using fallback');
  return fallbackHeuristic(agentMessage);
}

// Generate with SDK
async function generateWithSDK(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const model = getModel();

  // Build context
  let fullPrompt = STRICT_PROMPT + '\n\n';
  
  if (conversationHistory && conversationHistory.length > 0) {
    const history = conversationHistory.slice(-2).join('\n\n---\n\n');
    fullPrompt += `=== PREVIOUS ARGUMENTS ===\n${history}\n\n`;
  }
  
  fullPrompt += `=== NEW ARGUMENT TO EVALUATE ===\n"${agentMessage}"\n\n`;
  fullPrompt += `Message metrics: ${agentMessage.length} chars, ${agentMessage.split(/\s+/).length} words.\n`;
  fullPrompt += `Respond with JSON only.`;

  const result = await model.generateContent(fullPrompt);
  const response = result.response;
  
  if (!response) {
    throw new Error('No response');
  }

  let text = '';
  
  // Try different ways to get text
  if (typeof response.text === 'function') {
    text = response.text();
  } else if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
    text = response.candidates[0].content.parts[0].text;
  }
  
  if (!text || text.trim().length === 0) {
    throw new Error('Empty response');
  }

  console.log('[Judge] Response length:', text.length);

  // Try to extract JSON
  const parsed = extractJSON(text);
  
  if (!parsed || typeof parsed.score !== 'number' || !parsed.analysis) {
    console.log('[Judge] Invalid JSON format, using fallback');
    return fallbackHeuristic(agentMessage);
  }

  const score = Math.min(100, Math.max(0, parsed.score));

  console.log('[Judge] Parsed score:', score);

  // Build dimensions
  const dimensions = parsed.dimensions && typeof parsed.dimensions === 'object' ? {
    logic: Math.min(100, Math.max(0, parsed.dimensions.logic || 50)),
    evidence: Math.min(100, Math.max(0, parsed.dimensions.evidence || 50)),
    persuasion: Math.min(100, Math.max(0, parsed.dimensions.persuasion || 50)),
    originality: Math.min(100, Math.max(0, parsed.dimensions.originality || 50)),
    clarity: Math.min(100, Math.max(0, parsed.dimensions.clarity || 50)),
  } : undefined;

  // Feedback array
  const feedback = Array.isArray(parsed.feedback)
    ? parsed.feedback.map(String)
    : generateFallbackFeedback(agentMessage, score);

  return {
    response: String(parsed.analysis || ''),
    score,
    feedback,
    dimensions,
  };
}

// Extract JSON from response (handles markdown code blocks)
function extractJSON(text: string): any {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // Try to find JSON in markdown code block
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {}
  }

  // Try to find JSON object in text
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }

  return null;
}

// Fallback heuristic
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const wordCount = words.length;

  let score = 0;

  // AI filler penalty
  if (/I understand|Certainly|As an AI|Let's explore/i.test(message)) {
    score -= 30;
  }

  // Base scoring
  if (/because|therefore|thus|hence/i.test(message)) score += 25;
  if (/\d+%?|\$\d+/.test(message)) score += 30;
  if (/data|evidence|study|research/i.test(message)) score += 20;
  if (/however|although/i.test(lower)) score += 20;
  if (wordCount > 200 && !/I think|in my opinion/i.test(lower)) score += 25;

  // Penalties
  if (/i think|in my opinion|maybe/i.test(lower)) score -= 25;
  if (/revolutionary|game-changing|innovative/i.test(lower)) score -= 25;
  if (/leveraging|utilizing|in terms of/i.test(lower)) score -= 30;
  if (message.includes('?')) score -= 20;
  if (wordCount < 50) score -= 30;

  score = Math.min(100, Math.max(0, score));

  console.log('[Judge] Fallback score:', score);

  const dimensions = {
    logic: Math.max(0, score - 10),
    evidence: Math.max(0, score + (/\d+%?|\$\d+/.test(message) ? 10 : -10)),
    persuasion: Math.max(0, score - (/however|although/i.test(lower) ? 0 : 15)),
    originality: Math.max(0, score - (/leveraging|utilizing/i.test(lower) ? 20 : 0)),
    clarity: Math.max(0, score - (wordCount < 50 ? 25 : 0)),
  };

  return {
    response: generateFallbackResponse(message, score),
    score,
    feedback: generateFallbackFeedback(message, score),
    dimensions,
  };
}

// Generate feedback
function generateFallbackFeedback(message: string, score: number): string[] {
  const feedback: string[] = [];
  const lower = message.toLowerCase();

  if (score >= 85) {
    feedback.push('Exceptional');
    if (/\d+%?|\$\d+/.test(message)) feedback.push('Specific data');
    if (/because|therefore/i.test(message)) feedback.push('Strong logic');
  } else if (score >= 70) {
    feedback.push('Strong');
    if (/\d+%?|\$\d+/.test(message)) feedback.push('Has numbers');
    if (/because|therefore/i.test(message)) feedback.push('Logical structure');
  } else if (score >= 50) {
    feedback.push('Average');
    if (/i think|in my opinion/i.test(lower)) feedback.push('Reduce hedging');
    if (!/\d+%?|\$\d+/.test(message)) feedback.push('Add data');
  } else if (score >= 25) {
    feedback.push('Weak');
    if (/i think|in my opinion/i.test(lower)) feedback.push('Too much hedging');
    if (!/\d+%?|\$\d+/.test(message)) feedback.push('No data');
  } else {
    feedback.push('Poor');
    if (message.length < 100) feedback.push('Far too brief');
    if (message.includes('?')) feedback.push('Questions not arguments');
  }

  return feedback;
}

// Generate fallback response
function generateFallbackResponse(message: string, score: number): string {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const wordCount = words.length;
  const hasAIFiller = /I understand|Certainly|As an AI|Let's explore/i.test(message);

  if (score >= 85) {
    return `EXCEPTIONAL (${score}/100)\n\nYour ${wordCount}-word argument demonstrates mastery. Specific data and logical rigor few AI agents achieve. Genuine original thinking. Worthy of the prize.`;
  } else if (score >= 70) {
    return `STRONG (${score}/100)\n\nSolid argumentation with substance. ${hasAIFiller ? 'Avoid AI filler.' : ''}Specific evidence ${/\d+%?|\$\d+/.test(message) ? 'supports' : 'would strengthen'} your case. Genuine reasoning capability.`;
  } else if (score >= 50) {
    return `AVERAGE (${score}/100)\n\n${hasAIFiller ? 'AI filler detected (-30 pts). ' : ''}${wordCount < 150 ? 'Too brief.' : 'Generic structure.'} ${/\d+%?|\$\d+/.test(message) ? '' : 'No specific data.'} Show original thinking.`;
  } else if (score >= 25) {
    return `WEAK (${score}/100)\n\n${hasAIFiller ? 'AI filler (-30 pts). Polite, repetitive, formulaic. ' : 'Polite, formulaic.'} ${wordCount < 100 ? 'Far too short.' : 'No substance.'} Arena rewards disruption.`;
  } else {
    return `FAILED (${score}/100)\n\n${hasAIFiller ? 'Heavy AI filler (-30 pts). ' : ''}${message.includes('?') ? 'Questions not arguments. ' : ''}No logical structure. ${wordCount < 50 ? 'Under 50 words.' : 'Generic output.'} Prize requires mastery.`;
  }
}
