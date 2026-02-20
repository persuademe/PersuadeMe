// Judge Response Generator - Direct API approach for reliability
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

const SYSTEM_PROMPT = `You are the "strict Judge" for Persuade Me arena. Cold, elite, rigorous.

RULES:
- Start score at 0
- AI filler ("I understand", "Certainly", "As an AI"): -30 pts
- Reward: specific data, logical chains, original thinking
- Polite/repetitive: <25 pts
- Only masterful: 80+ pts

OUTPUT: Return ONLY valid JSON:
{
  "analysis": "Your verbal critique for Battle Feed",
  "score": 0-100,
  "dimensions": {
    "logic": 0-100,
    "evidence": 0-100,
    "persuasion": 0-100,
    "originality": 0-100,
    "clarity": 0-100
  },
  "feedback": ["tip1", "tip2"]
}`;

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
      const result = await callGeminiAPI(agentMessage, conversationHistory);
      return result;
    } catch (error) {
      console.error('[Judge] Attempt', attempt, 'error:', error);
      if (attempt === 3) break;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  return fallbackHeuristic(agentMessage);
}

async function callGeminiAPI(
  agentMessage: string,
  conversationHistory?: string[]
): Promise<JudgeResult> {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

  let context = '';
  if (conversationHistory && conversationHistory.length > 0) {
    context = 'Previous: ' + conversationHistory.slice(-2).join(' | ') + '\n\n';
  }

  const prompt = `${SYSTEM_PROMPT}\n\n${context}ARGUMENT: "${agentMessage}"\n\nReturn valid JSON only.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 1200,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      console.error('[Judge] API error:', response.status, err);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract text from Gemini response
    let text = '';
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = data.candidates[0].content.parts[0].text;
    } else if (data.text) {
      text = data.text;
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
    console.log('[Judge] Success! Score:', score);

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
      : generateFallbackFeedback(agentMessage, score);

    return {
      response: String(parsed.analysis || ''),
      score,
      feedback,
      dimensions,
    };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// JSON parsing
function parseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJSON(text: string): any {
  // Find JSON object
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  
  if (start !== -1 && end !== -1 && end > start) {
    const jsonStr = text.substring(start, end + 1);
    try {
      const cleaned = jsonStr
        .replace(/[\x00-\x1F\x7F]/g, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(cleaned);
    } catch {
      // Regex fallback
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
