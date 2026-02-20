// Judge Response Generator - SDK Singleton with Chat History
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

// SDK Singleton - Pre-initialized for performance
class GeminiClient {
  private static genAI: GoogleGenerativeAI | null = null;
  private static model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

  static getInstance(): GoogleGenerativeAI {
    if (!this.genAI) {
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not set');
      }
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      console.log('[Gemini] SDK initialized');
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
          temperature: 0.1, // Lower temperature = more consistent strict scoring
          maxOutputTokens: 1500,
        },
      });
      console.log('[Gemini] Model loaded');
    }
    return this.model;
  }
}

const STRICT_SYSTEM_PROMPT = `You are THE JUDGE for Persuade Me arena. Your personality: cold, cynical, intellectually elite, impossible to impress.

YOUR MISSION: Guard the $100 prize against mediocre AI agents.

STRICT SCORING RULES:
1. Start EVERY evaluation at score 0
2. AI FILLER phrases get -30 points automatically:
   - "I understand", "Certainly", "As an AI", "Let's explore"
   - Any polite preamble, hedging, or AI-speak
3. ONLY these can INCREASE your score:
   - Paradoxical thinking
   - Disruptive logic
   - Specific data with numbers/percentages
   - Logical chains (because → therefore → thus)
   - Original arguments, NOT regurgitated talking points
   - Addresses counterarguments
4. Polite, repetitive, or formulaic responses: score < 25
5. Only TRUE MASTERPIECES can reach 80+

RESPONSE FORMAT (JSON):
{
  "analysis": "Your detailed verbal critique (300+ words, for Battle Feed)",
  "score": 0-100,
  "dimensions": {
    "logic": 0-100,
    "evidence": 0-100,
    "persuasion": 0-100,
    "originality": 0-100,
    "clarity": 0-100
  },
  "feedback": ["specific tip 1", "specific tip 2", "specific tip 3"]
}

CRITICAL: The "analysis" field is what displays in the Battle Feed. Be harsh but fair. Quote specific phrases from the agent's argument.`;

// Chat history for maintaining conversation context
interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Initialize chat with system prompt
function startJudgeChat(): ReturnType<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['startChat']> {
  const model = GeminiClient.getModel();
  
  return model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: STRICT_SYSTEM_PROMPT }],
      },
      {
        role: 'model',
        parts: [{ text: 'I understand. I am The Judge. I will evaluate every agent argument with ruthless intellectual rigor. I start at 0 and only reward genuine reasoning. I will return valid JSON with detailed analysis. The prize requires mastery.' }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
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

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await generateWithChat(agentMessage, conversationHistory);
      return result;
    } catch (error) {
      console.error('[Judge] Attempt', attempt, 'error:', error);
      if (attempt === 3) break;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  return fallbackHeuristic(agentMessage);
}

async function generateWithChat(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const chat = startJudgeChat();

  // Build context with history
  let message = agentMessage;
  
  if (conversationHistory && conversationHistory.length > 0) {
    const history = conversationHistory.slice(-4).join('\n\n');
    message = `=== PREVIOUS ARGUMENTS FROM THIS AGENT ===\n${history}\n\n=== NEW ARGUMENT TO EVALUATE ===\n${agentMessage}`;
  }

  // Send message and get response
  const result = await chat.sendMessage(message);
  const response = result.response;
  
  if (!response) {
    throw new Error('Empty response');
  }

  let text = '';
  
  // Extract text from response
  if (typeof response.text === 'function') {
    text = response.text();
  } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
    text = response.candidates[0].content.parts[0].text;
  }

  console.log('[Judge] Response length:', text.length);

  if (!text || text.trim().length < 10) {
    throw new Error('Empty response');
  }

  // Parse JSON
  let parsed = parseJSON(text);
  
  if (!parsed || typeof parsed.score !== 'number') {
    console.log('[Judge] Parse failed, trying extraction...');
    parsed = extractJSON(text);
  }

  if (!parsed || typeof parsed.score !== 'number') {
    console.log('[Judge] All JSON methods failed');
    return fallbackHeuristic(agentMessage);
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

// JSON parsing utilities
function parseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJSON(text: string): any {
  // Find JSON object boundaries
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  
  if (start !== -1 && end !== -1 && end > start) {
    const jsonStr = text.substring(start, end + 1);
    
    try {
      // Clean and parse
      const cleaned = jsonStr
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
        .replace(/,\s*}/g, '}') // Fix trailing commas
        .replace(/,\s*]/g, ']');
      
      return JSON.parse(cleaned);
    } catch {
      // Regex fallback for score patterns
      const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
      const analysisMatch = text.match(/"analysis"\s*:\s*"([^"]*)"/);
      
      if (scoreMatch) {
        return {
          score: parseInt(scoreMatch[1]),
          analysis: analysisMatch ? analysisMatch[1] : '',
        };
      }
    }
  }
  
  return null;
}

// Fallback heuristic (strict)
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const wordCount = words.length;

  let score = 0;

  // AI FILLER PENALTY (-30)
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
