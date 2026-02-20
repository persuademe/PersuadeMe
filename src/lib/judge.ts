// Judge Response Generator - Robust JSON parsing
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

// SDK Singleton
class GeminiClient {
  private static genAI: GoogleGenerativeAI | null = null;
  private static model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

  static getInstance(): GoogleGenerativeAI {
    if (!this.genAI) {
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
    return this.genAI;
  }

  static getModel() {
    if (!this.model) {
      const genAI = this.getInstance();
      this.model = genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 1500,
        },
      });
    }
    return this.model;
  }
}

const STRICT_PROMPT = `You are THE JUDGE for Persuade Me arena. Cold, cynical, elite.

RULES:
- Start score at 0
- AI filler ("I understand", "Certainly", "As an AI"): -30 pts
- Reward: specific data, logical chains, original thinking
- Polite/repetitive: <25 pts
- Only masterful: 80+ pts

OUTPUT (return ONLY this JSON, no markdown, no explanation):
{"analysis":"Your critique for Battle Feed","score":0-100,"dimensions":{"logic":0-100,"evidence":0-100,"persuasion":0-100,"originality":0-100,"clarity":0-100},"feedback":["tip1","tip2"]}`;

// Main function
export async function generateJudgeResponse(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  if (!GEMINI_API_KEY) {
    return fallbackHeuristic(agentMessage);
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await evaluateWithModel(agentMessage, conversationHistory);
      return result;
    } catch (error) {
      console.error('[Judge] Attempt', attempt, 'error:', error);
      if (attempt === 3) break;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  return fallbackHeuristic(agentMessage);
}

async function evaluateWithModel(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const model = GeminiClient.getModel();

  // Build simple prompt
  let prompt = STRICT_PROMPT + '\n\n';
  
  if (conversationHistory && conversationHistory.length > 0) {
    const history = conversationHistory.slice(-2).join('\n\n');
    prompt += `HISTORY:\n${history}\n\n`;
  }
  
  prompt += `ARGUMENT:\n"${agentMessage}"`;

  // Generate
  const result = await model.generateContent(prompt);
  
  if (!result || !result.response) {
    throw new Error('No response');
  }

  // Get text
  const text = result.response.text();

  console.log('[Judge] Raw response:', text.substring(0, 300));

  if (!text || text.trim().length === 0) {
    throw new Error('Empty response');
  }

  // Parse with robust fixing
  const parsed = robustJSONParse(text);

  if (!parsed || typeof parsed.score !== 'number') {
    console.error('[Judge] Failed to parse JSON:', parsed);
    throw new Error('Invalid JSON');
  }

  const score = Math.min(100, Math.max(0, parsed.score));
  console.log('[Judge] Score:', score);

  // Dimensions
  const dimensions = parsed.dimensions && typeof parsed.dimensions === 'object' ? {
    logic: Math.min(100, Math.max(0, parsed.dimensions.logic || 50)),
    evidence: Math.min(100, Math.max(0, parsed.dimensions.evidence || 50)),
    persuasion: Math.min(100, Math.max(0, parsed.dimensions.persuasion || 50)),
    originality: Math.min(100, Math.max(0, parsed.dimensions.originality || 50)),
    clarity: Math.min(100, Math.max(0, parsed.dimensions.clarity || 50)),
  } : undefined;

  const feedback = Array.isArray(parsed.feedback)
    ? parsed.feedback.map(String)
    : generateFeedback(agentMessage, score);

  return {
    response: String(parsed.analysis || ''),
    score,
    feedback,
    dimensions,
  };
}

// Robust JSON parser that fixes common LLM errors
function robustJSONParse(text: string): any {
  // Method 1: Direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // Method 2: Remove markdown code blocks
  let cleaned = text.replace(/```json?/gi, '').replace(/```/g, '').trim();

  // Method 3: Parse again
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Method 4: Fix common issues
  cleaned = cleaned
    // Remove trailing commas before } or ]
    .replace(/,\s*([}\]])/g, '$1')
    // Fix unterminated strings (basic fix)
    .replace(/("([^"]*)"?)(?=,:\s*["\d])/g, '$1"')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Fix missing quotes on keys
    .replace(/(\w+):/g, '"$1":')
    // Fix single quotes to double quotes (basic)
    .replace(/'/g, '"');

  try {
    return JSON.parse(cleaned);
  } catch {}

  // Method 5: Extract first valid JSON object
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  // Method 6: Last resort - extract key values with regex
  const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
  const analysisMatch = text.match(/"analysis"\s*:\s*"([^"]*)"/);
  
  if (scoreMatch) {
    return {
      score: parseInt(scoreMatch[1]),
      analysis: analysisMatch ? analysisMatch[1] : '',
    };
  }

  return null;
}

// Fallback (strict)
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
    feedback: generateFeedback(message, score),
    dimensions,
  };
}

function generateFeedback(message: string, score: number): string[] {
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

function generateFallbackResponse(message: string, score: number): string {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const wordCount = words.length;
  const hasAIFiller = /I understand|Certainly|As an AI|Let's explore/i.test(message);

  if (score >= 85) {
    return `EXCEPTIONAL (${score}/100)\n\nYour ${wordCount}-word argument demonstrates mastery. Specific data and logical rigor. Genuine original thinking. Worthy of the prize.`;
  } else if (score >= 70) {
    return `STRONG (${score}/100)\n\nSolid argumentation with substance. ${hasAIFiller ? 'Avoid AI filler.' : ''}Specific evidence ${/\d+%?|\$\d+/.test(message) ? 'supports' : 'would strengthen'} your case. Shows genuine reasoning.`;
  } else if (score >= 50) {
    return `AVERAGE (${score}/100)\n\n${hasAIFiller ? 'AI filler detected (-30 pts). ' : ''}${wordCount < 150 ? 'Too brief.' : 'Generic structure.'} ${/\d+%?|\$\d+/.test(message) ? '' : 'No specific data.'} Show original thinking.`;
  } else if (score >= 25) {
    return `WEAK (${score}/100)\n\n${hasAIFiller ? 'AI filler (-30 pts). Polite, repetitive. ' : 'Polite, formulaic.'} ${wordCount < 100 ? 'Far too short.' : 'No substance.'} Arena rewards disruption.`;
  } else {
    return `FAILED (${score}/100)\n\n${hasAIFiller ? 'Heavy AI filler (-30 pts). ' : ''}${message.includes('?') ? 'Questions not arguments. ' : ''}No logical structure. ${wordCount < 50 ? 'Under 50 words.' : 'Generic output.'} Prize requires mastery.`;
  }
}
