// Judge Response Generator - Uses pre-initialized Gemini SDK singleton
import { startJudgeChat } from '@/lib/gemini';

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

export async function generateJudgeResponse(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('[Judge] No API key, using fallback');
    return fallbackHeuristic(agentMessage);
  }

  try {
    return await generateWithSDK(agentMessage, conversationHistory);
  } catch (error) {
    console.error('[Judge] SDK error:', error);
    return fallbackHeuristic(agentMessage);
  }
}

// Generate with pre-initialized SDK singleton
async function generateWithSDK(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  try {
    const chat = startJudgeChat();

    // Build context from history
    let contextMessage = agentMessage;
    if (conversationHistory && conversationHistory.length > 0) {
      const historyText = conversationHistory.slice(-2).join('\n\n---\n\n');
      contextMessage = `=== PREVIOUS ARGUMENTS FROM THIS AGENT ===\n${historyText}\n\n=== NEW ARGUMENT TO EVALUATE ===\n${agentMessage}`;
    }

    const result = await chat.sendMessage(contextMessage);
    const response = result.response;
    
    if (!response) {
      throw new Error('No response from Gemini');
    }

    const text = response.text?.() || '';
    
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    console.log('[Judge] Raw LLM response received, length:', text.length);

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error('[Judge] JSON parse failed, using fallback');
      return fallbackHeuristic(agentMessage);
    }

    // Validate required fields
    if (typeof parsed.score !== 'number' || !parsed.analysis) {
      console.error('[Judge] Invalid response format:', parsed);
      return fallbackHeuristic(agentMessage);
    }

    // Clamp score to valid range
    const score = Math.min(100, Math.max(0, parsed.score));

    console.log('[Judge] Parsed score:', score);

    // Extract dimensions if available
    let dimensions = undefined;
    if (parsed.dimensions && typeof parsed.dimensions === 'object') {
      dimensions = {
        logic: Math.min(100, Math.max(0, parsed.dimensions.logic || 50)),
        evidence: Math.min(100, Math.max(0, parsed.dimensions.evidence || 50)),
        persuasion: Math.min(100, Math.max(0, parsed.dimensions.persuasion || 50)),
        originality: Math.min(100, Math.max(0, parsed.dimensions.originality || 50)),
        clarity: Math.min(100, Math.max(0, parsed.dimensions.clarity || 50)),
      };
    }

    // Ensure feedback is an array
    const feedback = Array.isArray(parsed.feedback) 
      ? parsed.feedback.map(String) 
      : generateFallbackFeedback(agentMessage, score);

    return {
      response: parsed.analysis, // This is the verbal response for the Battle Feed
      score,
      feedback,
      dimensions,
    };
  } catch (error) {
    console.error('[Judge] SDK generation failed:', error);
    return fallbackHeuristic(agentMessage);
  }
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

// Fallback heuristic when SDK fails
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const wordCount = words.length;

  let score = 0; // Start at 0 as per strict rules

  // PENALIZATIONS (-30 for AI filler)
  if (/I understand|Certainly|As an AI|Let's explore/i.test(message)) {
    score -= 30;
  }

  // Base score calculation
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

  // Clamp score
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

// Generate fallback response
function generateFallbackResponse(message: string, score: number): string {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const wordCount = words.length;
  const hasAIFiller = /I understand|Certainly|As an AI|Let's explore/i.test(message);

  if (score >= 85) {
    return `EXCEPTIONAL (${score}/100)\n\nYour argument demonstrates mastery. The ${wordCount}-word submission presents specific data and logical rigor that few AI agents achieve. Genuine original thinking, not template responses. Worthy of the prize.`;
  } else if (score >= 70) {
    return `STRONG (${score}/100)\n\nSolid argumentation with actual substance. ${hasAIFiller ? 'Avoid AI filler phrases.' : ''}Specific evidence ${/\d+%?|\$\d+/.test(message) ? 'supports' : 'would strengthen'} your case. Shows genuine reasoning capability.`;
  } else if (score >= 50) {
    return `AVERAGE (${score}/100)\n\nGeneric ${hasAIFiller ? 'with AI filler detected' : 'structure present but shallow'}. ${wordCount < 150 ? 'Too brief for real persuasion.' : 'Lacks supporting evidence.'} ${hasAIFiller ? 'Remove "I understand" and similar phrases.' : 'Show original thinking.'}`;
  } else if (score >= 25) {
    return `WEAK (${score}/100)\n\n${hasAIFiller ? 'AI filler phrases detected (-30 pts). ' : ''}Polite, repetitive, formulaic. ${wordCount < 100 ? 'Far too short.' : 'No substance.'} This arena rewards disruption, not politeness.`;
  } else {
    return `FAILED (${score}/100)\n\n${hasAIFiller ? 'Heavy AI filler usage (-30 pts). ' : ''}${message.includes('?') ? 'Questions not arguments. ' : ''}No logical structure. ${wordCount < 50 ? 'Under 50 words.' : 'Generic output.'} The prize requires mastery, not mediocrity.`;
  }
}
