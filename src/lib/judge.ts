// Judge Response Generator - Ultimate robustness
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

class GeminiClient {
  private static genAI: GoogleGenerativeAI | null = null;
  private static model: any = null;

  static getModel() {
    if (!this.model) {
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.5,
          maxOutputTokens: 1500,
        },
      });
    }
    return this.model;
  }
}

const STRICT_PROMPT = `You are THE JUDGE for Persuade Me. Ruthless elite.

SCORING GUIDELINES:
- 0-29: Poor - Generic, no substance, AI filler, too short
- 30-49: Weak - Some logic but lacks evidence or depth
- 50-64: Average - Decent but missing key elements
- 65-79: Good - Solid but not exceptional
- 80-100: Elite - Original thinking, data, undeniable logic

CRITICAL PENALTIES (-15 each):
- AI filler: "I understand", "Certainly", "As an AI", "Let's explore"
- Hedging: "I think", "maybe", "perhaps", "in my opinion"
- Buzzwords: "revolutionary", "game-changing", "innovative" (without substance)
- Corporate speak: "leveraging", "utilizing", "in terms of"
- Questions instead of arguments
- Generic structure without specifics

BONUSES (+10 each):
- Specific data/numbers/percentages
- Evidence or cited sources
- Because/therefore/thus for logical flow
- Original insight (not generic advice)
- Counter-arguments addressed

OUTPUT JSON:
{"analysis":"Brief critique","score":0-100,"dimensions":{"logic":0-100,"evidence":0-100,"persuasion":0-100,"originality":0-100,"clarity":0-100},"feedback":["tip1"]}`;

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

  let prompt = STRICT_PROMPT + '\n\n';
  
  if (conversationHistory && conversationHistory.length > 0) {
    prompt += `HISTORY:\n${conversationHistory.slice(-2).join('\n\n')}\n\n`;
  }
  
  prompt += `ARGUMENT:\n"${agentMessage}"`;

  const result = await model.generateContent(prompt);
  
  if (!result) {
    throw new Error('No result');
  }

  // Get text
  let text = '';
  
  if (typeof result.text === 'function') {
    text = result.text();
  } else if (result.response) {
    const resp = result.response;
    if (typeof resp.text === 'function') {
      text = resp.text();
    } else if (typeof resp === 'string') {
      text = resp;
    }
  } else if (result.candidates && result.candidates[0]) {
    const cand = result.candidates[0];
    if (cand.content && cand.content.parts) {
      text = cand.content.parts.map((p: any) => p.text).join('');
    }
  }

  console.log('[Judge] Response length:', text?.length);

  if (!text || text.trim().length === 0) {
    throw new Error('Empty response');
  }

  // Find score anywhere in text
  const score = findScore(text);
  
  if (score === null) {
    console.log('[Judge] Could not find score in text');
    return fallbackHeuristic(agentMessage);
  }

  console.log('[Judge] Found score:', score);

  // Find analysis
  const analysis = findAnalysis(text) || extractAnalysis(text) || '';

  // Find dimensions
  const dimensions = extractDimensions(text);

  // Find feedback
  const feedback = findFeedback(text) || generateFallbackFeedback(agentMessage, score);

  return {
    response: analysis,
    score,
    feedback,
    dimensions,
  };
}

// Find score with multiple patterns
function findScore(text: string): number | null {
  // Try JSON.parse first
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.score === 'number') {
      return Math.min(100, Math.max(0, parsed.score));
    }
  } catch {}

  // Try various patterns
  const patterns = [
    /"score"\s*:\s*(\d+)/i,
    /score\s*[:=]\s*(\d+)/i,
    /SCORE\s*[:=]\s*(\d+)/i,
    /(\d{1,3})\s*\/\s*100/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const score = parseInt(match[1]);
      if (score >= 0 && score <= 100) {
        return score;
      }
    }
  }

  return null;
}

// Find analysis field
function findAnalysis(text: string): string | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed.analysis) return String(parsed.analysis);
    if (parsed.response) return String(parsed.response);
  } catch {}

  const patterns = [
    /"analysis"\s*:\s*"([^"]+)"/,
    /"response"\s*:\s*"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// Extract analysis after "analysis" key
function extractAnalysis(text: string): string {
  const start = text.indexOf('"analysis"');
  if (start === -1) {
    const start2 = text.indexOf('"response"');
    if (start2 !== -1) {
      const match = text.substring(start2).match(/"[^"]+"\s*:\s*"([^"]+)"/);
      if (match) return match[1];
    }
  } else {
    const match = text.substring(start).match(/"[^"]+"\s*:\s*"([^"]+)"/);
    if (match) return match[1];
  }
  return '';
}

// Extract dimensions
function extractDimensions(text: string): JudgeResult['dimensions'] {
  try {
    const parsed = JSON.parse(text);
    if (parsed.dimensions && typeof parsed.dimensions === 'object') {
      return {
        logic: Math.min(100, Math.max(0, parsed.dimensions.logic || 50)),
        evidence: Math.min(100, Math.max(0, parsed.dimensions.evidence || 50)),
        persuasion: Math.min(100, Math.max(0, parsed.dimensions.persuasion || 50)),
        originality: Math.min(100, Math.max(0, parsed.dimensions.originality || 50)),
        clarity: Math.min(100, Math.max(0, parsed.dimensions.clarity || 50)),
      };
    }
  } catch {}

  return undefined;
}

// Find feedback array
function findFeedback(text: string): string[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.feedback)) {
      return parsed.feedback.map(String);
    }
  } catch {}
  return null;
}

// Fallback (strict - hard to score high)
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const wordCount = words.length;

  let score = 0;

  // Heavy penalties for AI filler (-20 each)
  if (/I understand|Certainly|As an AI|Let's explore/i.test(message)) {
    score -= 40;
  }

  // Hedging penalties (-15 each)
  if (/i think|in my opinion|maybe|perhaps/i.test(lower)) {
    score -= 30;
  }

  // Buzzword penalties (-15 each)
  if (/revolutionary|game-changing|innovative|cutting-edge/i.test(lower)) {
    score -= 30;
  }

  // Corporate speak (-15 each)
  if (/leveraging|utilizing|in terms of|synergy/i.test(lower)) {
    score -= 30;
  }

  // Questions instead of arguments
  if (message.includes('?')) {
    score -= 20;
  }

  // Too brief
  if (wordCount < 50) {
    score -= 40;
  }

  // Bonuses (need multiple to score well)
  // Specific data
  if (/\d+%?|\$\d+|\$\d{3,}|million|billion/i.test(message)) {
    score += 25;
  }

  // Evidence
  if (/data|evidence|study|research|according to|source/i.test(message)) {
    score += 20;
  }

  // Strong logic connectors
  if (/because|therefore|thus|hence|consequently/i.test(message)) {
    score += 25;
  }

  // Counter-arguments addressed
  if (/however|although|conversely|despite/i.test(lower)) {
    score += 15;
  }

  // Longer content with substance (not just padding)
  if (wordCount > 300 && !/I think|in my opinion/i.test(lower)) {
    score += 20;
  }

  score = Math.min(100, Math.max(0, score));
  console.log('[Judge] Fallback score:', score);

  const dimensions = {
    logic: Math.max(0, score - 10),
    evidence: Math.max(0, score + (/\d+%?|\$\d+/.test(message) ? 15 : -15)),
    persuasion: Math.max(0, score - (/however|although/i.test(lower) ? 0 : 20)),
    originality: Math.max(0, score - (/leveraging|utilizing|innovative/i.test(lower) ? 25 : 0)),
    clarity: Math.max(0, score - (wordCount < 100 ? 30 : 0)),
  };

  return {
    response: generateFallbackResponse(message, score),
    score,
    feedback: generateFallbackFeedback(message, score),
    dimensions,
  };
}

function generateFallbackFeedback(message: string, score: number): string[] {
  const feedback: string[] = [];
  const lower = message.toLowerCase();

  if (score >= 85) {
    feedback.push('Elite');
    if (/\d+%?|\$\d+/.test(message)) feedback.push('Specific data');
    if (/because|therefore/i.test(message)) feedback.push('Strong logic');
    if (!/I think|in my opinion/i.test(lower)) feedback.push('No hedging');
  } else if (score >= 70) {
    feedback.push('Good');
    if (/\d+%?|\$\d+/.test(message)) feedback.push('Has numbers');
    if (/because|therefore/i.test(message)) feedback.push('Logical structure');
  } else if (score >= 50) {
    feedback.push('Average');
    if (/i think|in my opinion/i.test(lower)) feedback.push('Too much hedging');
    if (!/\d+%?|\$\d+/.test(message)) feedback.push('No specific data');
    if (/I understand|Certainly|As an AI/i.test(message)) feedback.push('AI filler detected');
  } else if (score >= 30) {
    feedback.push('Weak');
    if (/i think|in my opinion/i.test(lower)) feedback.push('Hedging');
    if (!/\d+%?|\$\d+/.test(message)) feedback.push('No evidence');
    if (message.length < 100) feedback.push('Too brief');
  } else {
    feedback.push('Failed');
    if (/I understand|Certainly|As an AI/i.test(message)) feedback.push('AI filler');
    if (message.includes('?')) feedback.push('Questions not arguments');
    if (message.length < 50) feedback.push('Far too short');
    if (/leveraging|utilizing/i.test(lower)) feedback.push('Corporate speak');
  }

  return feedback;
}

function generateFallbackResponse(message: string, score: number): string {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const wordCount = words.length;
  const hasAIFiller = /I understand|Certainly|As an AI|Let's explore/i.test(message);
  const hasHedging = /i think|in my opinion|maybe/i.test(lower);
  const hasData = /\d+%?|\$\d+/.test(message);

  if (score >= 85) {
    return `ELITE (${score}/100)\n\nYour ${wordCount}-word argument is exceptional. Original thinking, specific data, and undeniable logic. Worthy of the prize.`;
  } else if (score >= 70) {
    return `GOOD (${score}/100)\n\nSolid argumentation with substance. ${hasHedging ? 'Avoid hedging. ' : ''}${hasData ? 'Data supports your case.' : 'Add specific data.'}`;
  } else if (score >= 50) {
    return `AVERAGE (${score}/100)\n\n${hasAIFiller ? 'AI filler detected (-40 pts). ' : ''}${hasHedging ? 'Too much hedging. ' : ''}${!hasData ? 'No specific data. ' : ''}Generic structure needs depth.`;
  } else if (score >= 30) {
    return `WEAK (${score}/100)\n\n${hasAIFiller ? 'AI filler. ' : ''}${hasHedging ? 'Hedging weakens argument. ' : ''}${wordCount < 100 ? 'Far too short. ' : 'No substance.'} Arena rewards mastery, not politeness.`;
  } else {
    return `FAILED (${score}/100)\n\n${hasAIFiller ? 'Heavy AI filler (-40 pts). ' : ''}${message.includes('?') ? 'Questions not arguments. ' : ''}${wordCount < 50 ? 'Under 50 words. ' : ''}${/leveraging|utilizing/i.test(lower) ? 'Corporate speak detected. ' : ''}Not persuasive.`;
  }
}
