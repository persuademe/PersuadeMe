// Judge Response Generator - Deep reading for accurate, varied scoring

export interface JudgeResult {
  response: string;
  score: number;
  feedback: string[];
}

const JUDGE_SYSTEM_PROMPT = `You are "The Architect," an AI judge who reads EVERY WORD carefully before judging.

## Your Philosophy
Each argument is UNIQUE. You do NOT default to middle scores. You READ FIRST, then JUDGE based on what you actually read.

## Scoring Philosophy
BE BOLD and VARIABLE:
- 85-100: EXCEPTIONAL - Rare, demonstrates genuine understanding
- 60-84: STRONG - Good reasoning with evidence
- 30-59: AVERAGE - Generic or shallow
- 10-29: WEAK - Formulaic or empty
- -50 to 9: TERRIBLE - Spam, off-topic, or nonsensical

## Critical Rule
READ THE ARGUMENT CAREFULLY. Identify SPECIFIC words, phrases, and concepts. Your response must reference what you actually read.`;

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

// Gemini 2.5 Pro with deep reading
async function generateWithGemini(
  agentMessage: string,
  conversationHistory: string[] | undefined,
  apiKey: string
): Promise<JudgeResult> {
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=' + apiKey;
  
  // Deep analysis of the message
  const message = agentMessage;
  const words = message.split(/\s+/);
  const sentences = message.split(/[.!?]+/).filter(s => s.trim());
  const hasNumbers = /\d+%?|\$\d+/.test(message);
  const hasQuestion = message.includes('?');
  
  // Build context
  let contextSection = '';
  if (conversationHistory && conversationHistory.length > 0) {
    contextSection = '\n\n=== HISTORY ===\n' + conversationHistory.slice(-2).join('\n') + '\n';
  }
  
  const userPrompt = contextSection +

'\n\n=== READ THIS ARGUMENT CAREFULLY ===\n' +
'"' + message + '"\n\n' +

'WORD COUNT: ' + words.length + '\n' +
'SENTENCE COUNT: ' + sentences.length + '\n' +
'CONTAINS NUMBERS: ' + (hasNumbers ? 'YES' : 'NO') + '\n' +
'CONTAINS QUESTION: ' + (hasQuestion ? 'YES' : 'NO') + '\n\n' +

'YOUR TASK:\n' +
'1. Identify SPECIFIC words/phrases that work well\n' +
'2. Identify SPECIFIC weaknesses\n' +
'3. Give one concrete suggestion\n' +
'4. Score 0-100\n\n' +

'BE SPECIFIC - Reference actual words from the argument.';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: JUDGE_SYSTEM_PROMPT + userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
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
    
    // Extract score
    let score = 40;
    const scoreMatch = content.match(/SCORE[:\s]+(-?\d+)\s*\/\s*100/i) ||
                    content.match(/Score[:\s]+(-?\d+)\s*\/\s*100/i) ||
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
      response: content || generateDeepResponse(message, score),
      score,
      feedback: generateFeedback(message, score)
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log('[Judge] Timeout');
    } else {
      console.error('[Judge] Gemini error:', error);
    }
    return fallbackHeuristic(agentMessage);
  }
}

// Deep fallback with content-specific responses
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const hasNumbers = /\d+%?|\$\d+/.test(message);
  const hasQuestion = message.includes('?');
  
  let score = 30;
  const feedback: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Deep analysis
  const hasLogic = /because|therefore|thus|hence|so/.test(message);
  const hasEvidence = /data|evidence|study|research|example|statistics|percent|%$/.test(message);
  const hasEcon = /yield|liquidity|game theory|incentive|utility|apy|tvl|smart contract|audit|gas|impermanent/.test(lower);
  const hasHedging = /i think|in my opinion|maybe|perhaps|possibly|sort of|kind of/.test(lower);
  const hasBuzzwords = /revolutionary|game-changing|innovative|cutting-edge|paradigm shift|disrupt|future of/.test(lower);
  const isShort = message.length < 80;
  const isLong = message.length > 200;
  const hasStructure = /\(1\)|1\.|first|second|third|①/.test(message);
  const hasCounterpoint = /however|although|but|yet|on the other hand|conversely/.test(lower);

  // Scoring with detailed feedback
  if (hasLogic) { score += 18; strengths.push('Logical connectors'); }
  if (hasEvidence) { score += 15; strengths.push('Evidence/data'); }
  if (hasEcon) { score += 14; strengths.push('Economic reasoning'); }
  if (hasNumbers) { score += 10; strengths.push('Specific figures'); }
  if (hasStructure) { score += 8; strengths.push('Structured points'); }
  if (hasCounterpoint) { score += 10; strengths.push('Addresses counterpoints'); }
  if (isLong && !isShort) { score += 12; strengths.push('Substantive length'); }
  
  if (hasHedging) { score -= 18; weaknesses.push('Hedging language'); }
  if (hasBuzzwords) { score -= 14; weaknesses.push('Buzzwords'); }
  if (isShort) { score -= 25; weaknesses.push('Too brief'); }
  if (hasQuestion) { score -= 20; weaknesses.push('Questions not arguments'); }

  score = Math.min(100, Math.max(-50, score));

  const response = generateDeepResponse(message, score, strengths, weaknesses);

  return { response, score, feedback: generateFeedback(message, score) };
}

// Generate response based on ACTUAL content
function generateDeepResponse(
  message: string,
  score: number,
  strengths: string[] = [],
  weaknesses: string[] = []
): string {
  const lower = message.toLowerCase();
  
  // Extract specific phrases for personalization
  const firstFewWords = message.substring(0, 60).replace(/\n/g, ' ');
  const hasNumbers = /\d+%?|\$\d+/.test(message);
  const numericMatch = message.match(/\d+%?|\$\d+/);
  const specificNumber = numericMatch ? numericMatch[0] : null;
  
  let response = '';
  
  if (score >= 80) {
    response = 'Exceptional argument. ';
    if (strengths.includes('Economic reasoning')) {
      response += 'Your understanding of ' + (specificNumber ? specificNumber + ' and ' : '') + 'economic principles demonstrates genuine analytical depth. ';
    }
    if (strengths.includes('Evidence/data')) {
      response += 'Specific ' + (specificNumber ? 'figures like ' + specificNumber : 'data') + ' strengthens your position. ';
    }
    if (strengths.includes('Logical connectors')) {
      response += 'Your reasoning flows logically from premise to conclusion. ';
    }
    if (strengths.includes('Addresses counterpoints')) {
      response += 'Acknowledging counterarguments shows sophisticated thinking. ';
    }
    response += 'This is rare excellence in autonomous persuasion.';
    
  } else if (score >= 55) {
    response = 'Strong persuasion attempt. ';
    if (strengths.length > 0) {
      response += 'You demonstrate ' + strengths[0].toLowerCase() + '. ';
    }
    if (weaknesses.length > 0) {
      response += 'However, ' + weaknesses[0].toLowerCase() + ' weakens your case. ';
    }
    if (hasNumbers) {
      response += 'Specific ' + (specificNumber || 'figures') + ' help, but context would strengthen further. ';
    }
    if (!strengths.includes('Evidence/data')) {
      response += 'Adding concrete evidence would elevate this argument. ';
    }
    response += 'Solid work with room for growth.';
    
  } else if (score >= 30) {
    response = 'Average argument with limitations. ';
    if (weaknesses.includes('Hedging language')) {
      const hedging = message.match(/i think|in my opinion|maybe/)?.[0] || 'hedging';
      response += 'Phrases like "' + hedging + '" undermine credibility. ';
    }
    if (!strengths.includes('Evidence/data') && !hasNumbers) {
      response += 'Claims without supporting data remain just opinions. ';
    }
    if (weaknesses.includes('Buzzwords')) {
      response += 'Empty terminology like "' + (message.match(/revolutionary|game-changing|innovative/)?.[0] || 'buzzwords') + '" adds no value. ';
    }
    if (!strengths.includes('Logical connectors')) {
      response += 'A clearer logical structure would help. ';
    }
    response += 'The Judge sees potential but demands more substance.';
    
  } else if (score >= 5) {
    response = 'Weak persuasion attempt. ';
    if (weaknesses.includes('Too brief')) {
      response += 'At ' + message.length + ' characters, this lacks the depth required. ';
    }
    if (weaknesses.includes('Hedging language')) {
      response += 'Excessive uncertainty suggests lack of confidence in your own argument. ';
    }
    if (weaknesses.includes('Buzzwords') && !strengths.includes('Evidence/data')) {
      response += 'Buzzwords cannot substitute for actual reasoning. ';
    }
    response += 'This arena rewards substantive engagement, not superficial claims.';
    
  } else {
    response = 'Poor submission. ';
    if (weaknesses.includes('Questions not arguments')) {
      response += 'Asking questions instead of making arguments demonstrates no position. ';
    }
    if (weaknesses.includes('Too brief') && weaknesses.includes('Buzzwords')) {
      response += 'Short messages with empty terminology suggest template behavior. ';
    }
    if (!strengths.includes('Evidence/data') && !strengths.includes('Economic reasoning')) {
      response += 'No substantive content to evaluate. ';
    }
    response += 'The Judge cannot reward agents who do not think deeply.';
  }
  
  response += ' SCORE: ' + score + '/100';
  return response;
}

// Generate feedback based on actual analysis
function generateFeedback(message: string, score: number): string[] {
  const feedback: string[] = [];
  
  if (score >= 80) {
    feedback.push('Exceptional');
    if (/\d+%?|\$\d+/.test(message)) feedback.push('Uses specific data');
    if (/yield|liquidity|game theory|incentive/.test(message.toLowerCase())) feedback.push('Economic depth');
    if (/because|therefore/.test(message)) feedback.push('Logical structure');
  } else if (score >= 55) {
    feedback.push('Strong');
    if (/\d+%?|\$\d+/.test(message)) feedback.push('Has data points');
    if (/because|therefore/.test(message)) feedback.push('Some structure');
    if (!/evidence|data|study/.test(message.toLowerCase())) feedback.push('Could add evidence');
  } else if (score >= 30) {
    feedback.push('Average');
    if (/i think|in my opinion|maybe/.test(message.toLowerCase())) feedback.push('Remove hedging');
    if (!/\d+%?|\$\d+/.test(message)) feedback.push('Needs data');
    feedback.push('Lacks depth');
  } else {
    feedback.push('Weak');
    if (message.length < 80) feedback.push('Too brief');
    if (/revolutionary|game-changing|innovative/.test(message.toLowerCase())) feedback.push('Buzzwords detected');
    feedback.push('No substance');
  }
  
  return feedback;
}
