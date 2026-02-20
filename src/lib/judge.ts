// Judge Response Generator - Deep analysis for varied, accurate scoring

export interface JudgeResult {
  response: string;
  score: number;
  feedback: string[];
}

const JUDGE_SYSTEM_PROMPT = `You are "The Architect," an AI judge with exceptional analytical capabilities.

## Your Philosophy
You EARN your role by demonstrating genuine understanding of logic, economics, and persuasion. Each argument is UNIQUE and must be evaluated on its OWN MERITS.

## Scoring Philosophy - BE BOLD
- 85-100: EXCEPTIONAL - Original, evidence-backed, economically sound
- 60-84: STRONG - Good reasoning, solid structure  
- 30-59: AVERAGE - Generic or shallow
- 10-29: WEAK - Formulaic or empty
- -50 to 9: TERRIBLE - Spam, off-topic, or nonsensical

## Critical Rule
READ THE ARGUMENT CAREFULLY. Your response must SPECIFICALLY reference what the user wrote, not generic phrases.`;

// Deep analysis for varied scoring
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

// Gemini 2.5 Pro with varied responses
async function generateWithGemini(
  agentMessage: string,
  conversationHistory: string[] | undefined,
  apiKey: string
): Promise<JudgeResult> {
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=' + apiKey;
  
  // Build context
  let contextSection = '';
  if (conversationHistory && conversationHistory.length > 0) {
    const history = conversationHistory.slice(-3);
    contextSection = '\n\n=== PREVIOUS ===\n' + history.join('\n') + '\n';
  }
  
  // Analyze the actual message content
  const lower = agentMessage.toLowerCase();
  const hasLogic = /because|therefore|thus|hence/.test(agentMessage);
  const hasEvidence = /data|evidence|research|example|statistics|percent|%$/.test(agentMessage);
  const hasEcon = /yield|liquidity|game theory|incentive|utility|apy|tvl|smart contract|audit|gas/.test(lower);
  const hasBuzzwords = /revolutionary|game-changing|innovative|cutting-edge|paradigm shift|disrupt/.test(lower);
  const hasHedging = /i think|in my opinion|maybe|perhaps|possibly/.test(lower);
  const isShort = agentMessage.length < 80;
  const isLong = agentMessage.length > 200;
  const hasNumbers = /\d+%?/.test(agentMessage) || /\$\d+/.test(agentMessage);
  const hasStructure = /\(1\)|1\.|first|second|third|①/.test(agentMessage);
  const hasCounterpoint = /however|although|but|yet/.test(lower);
  
  const userPrompt = contextSection +

'\n\n=== ARGUMENT TO JUDGE ===\n' +
'"' + agentMessage + '"\n\n' +

'Analyze SPECIFICALLY what this argument says. Then give a score 0-100 and respond with:\n' +
'- What specifically works in this argument\n' +
'- What specifically is weak\n' +
'- One specific suggestion\n' +
'- SCORE: X/100\n\n' +

'Be specific - reference actual words from the argument.';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: JUDGE_SYSTEM_PROMPT + userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
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
    const scorePatterns = [
      /SCORE[:\s]+(-?\d+)\s*\/\s*100/i,
      /Score[:\s]+(-?\d+)\s*\/\s*100/i,
      /(-?\d+)\s*\/\s*100/,
    ];
    
    for (const pattern of scorePatterns) {
      const match = content.match(pattern);
      if (match) {
        score = parseInt(match[1]);
        score = Math.min(100, Math.max(-50, score));
        break;
      }
    }

    // Remove score line
    content = content
      .replace(/SCORE[:\s]+(-?\d+)\s*\/\s*100/gi, '')
      .replace(/Score[:\s]+(-?\d+)\s*\/\s*100/gi, '')
      .replace(/score[:\s]+(-?\d+)/gi, '')
      .trim();

    return {
      response: content || generateVariedResponse(agentMessage, score, hasLogic, hasEvidence, hasEcon, hasBuzzwords, hasHedging, isShort, isLong, hasNumbers, hasStructure, hasCounterpoint),
      score,
      feedback: generateFeedbackFromAnalysis(agentMessage, score, hasLogic, hasEvidence, hasEcon, hasBuzzwords, hasHedging, isShort, isLong, hasNumbers)
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log('[Judge] Timeout, using fallback');
    } else {
      console.error('[Judge] Gemini error:', error);
    }
    return fallbackHeuristic(agentMessage);
  }
}

// Fallback with truly varied responses
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  let score = 30;
  const feedback: string[] = [];

  // Deep content analysis
  const hasLogic = /because|therefore|thus|hence/.test(message);
  const hasEvidence = /data|evidence|research|example|statistics|percent|%$/.test(message);
  const hasEcon = /yield|liquidity|game theory|incentive|utility|apy|tvl|smart contract|audit|gas/.test(lower);
  const hasBuzzwords = /revolutionary|game-changing|innovative|cutting-edge|paradigm shift|disrupt/.test(lower);
  const hasHedging = /i think|in my opinion|maybe|perhaps|possibly/.test(lower);
  const isShort = message.length < 80;
  const isLong = message.length > 200;
  const hasNumbers = /\d+%?/.test(message) || /\$\d+/.test(message);
  const hasStructure = /\(1\)|1\.|first|second|third|①/.test(message);
  const hasCounterpoint = /however|although|but|yet/.test(lower);
  const hasQuestions = /\?/.test(message);

  // Scoring
  if (hasLogic) { score += 18; feedback.push('Logical connectors'); }
  if (hasEvidence) { score += 15; feedback.push('Evidence/data cited'); }
  if (hasEcon) { score += hasEcon ? 14 : 0; feedback.push('Economic terms'); }
  if (hasNumbers) { score += 10; feedback.push('Specific numbers'); }
  if (hasStructure) { score += 8; feedback.push('Structured points'); }
  if (hasCounterpoint) { score += 10; feedback.push('Addresses counterpoints'); }
  if (isLong && !isShort) { score += 12; feedback.push('Substantive depth'); }
  
  if (hasHedging) { score -= 18; feedback.push('Hedging language'); }
  if (hasBuzzwords) { score -= 14; feedback.push('Empty buzzwords'); }
  if (isShort) { score -= 25; feedback.push('Too brief'); }
  if (hasQuestions) { score -= 20; feedback.push('Questions not arguments'); }

  score = Math.min(100, Math.max(-50, score));

  const response = generateVariedResponse(message, score, hasLogic, hasEvidence, hasEcon, hasBuzzwords, hasHedging, isShort, isLong, hasNumbers, hasStructure, hasCounterpoint);

  return { response, score, feedback };
}

// Generate truly varied responses based on actual content
function generateVariedResponse(
  message: string,
  score: number,
  hasLogic: boolean,
  hasEvidence: boolean,
  hasEcon: boolean,
  hasBuzzwords: boolean,
  hasHedging: boolean,
  isShort: boolean,
  isLong: boolean,
  hasNumbers: boolean,
  hasStructure: boolean,
  hasCounterpoint: boolean
): string {
  // Extract specific phrases from message for personalization
  const firstSentence = message.split(/[.!?]/)[0] || message.substring(0, 50);
  
  let response = '';
  
  if (score >= 80) {
    // Exceptional - find what makes it exceptional
    const strengths: string[] = [];
    if (hasEcon) strengths.push('economic understanding');
    if (hasEvidence) strengths.push('evidence-based claims');
    if (hasNumbers) strengths.push('specific data');
    if (hasStructure) strengths.push('organized structure');
    if (hasCounterpoint) strengths.push('addressing counterpoints');
    
    const strength = strengths[0] || 'reasoning';
    response = `Outstanding argument. Your ${strength} creates a compelling case. `;
    
    if (hasEcon && hasEvidence) {
      response += 'The combination of economic insight with evidence makes this rare in this arena. ';
    } else if (hasEcon) {
      response += 'Your grasp of economic principles demonstrates genuine analytical depth. ';
    } else if (hasEvidence) {
      response += 'Using specific data strengthens your position significantly. ';
    }
    
    response += 'This is what excellence looks like in autonomous persuasion.';
    
  } else if (score >= 55) {
    // Strong - identify what works and what's missing
    response = 'Good persuasion attempt. ';
    
    if (hasLogic && hasNumbers) {
      response += 'You combine logical reasoning with specific figures. ';
    } else if (hasLogic) {
      response += 'Your logical structure provides clear reasoning. ';
    } else if (hasNumbers) {
      response += 'Specific numbers help your case. ';
    }
    
    if (!hasEvidence && !hasEcon) {
      response += 'Consider adding economic analysis or evidence to strengthen further. ';
    } else if (!hasStructure) {
      response += 'A more structured presentation would enhance readability. ';
    }
    
    response += 'Solid work, but room for improvement.';
    
  } else if (score >= 30) {
    // Average - identify generic issues
    response = 'Average argument with limitations. ';
    
    if (hasHedging) {
      response += 'Phrases like "' + (message.match(/i think|in my opinion|maybe/i)?.[0] || 'hedging') + '" weaken your credibility. ';
    }
    
    if (!hasLogic) {
      response += 'Your argument lacks clear logical connectors. ';
    }
    
    if (!hasEvidence && !hasNumbers) {
      response += 'Claims without supporting data are just opinions. ';
    }
    
    if (hasBuzzwords) {
      response += 'Buzzwords like "' + (message.match(/revolutionary|game-changing|innovative/i)?.[0] || 'empty terms') + '" add no value. ';
    }
    
    response += 'The Judge sees potential, but demands more rigor.';
    
  } else if (score >= 5) {
    // Weak
    response = 'Weak persuasion attempt. ';
    
    if (isShort) {
      response += 'This argument is far too brief to demonstrate understanding. ';
    }
    
    if (hasBuzzwords && !hasLogic) {
      response += 'Empty buzzwords cannot substitute for actual reasoning. ';
    }
    
    if (hasHedging && !hasEvidence) {
      response += 'Constant hedging suggests uncertainty about your own argument. ';
    }
    
    response += 'This arena rewards substance, not superficial claims.';
    
  } else {
    // Terrible
    response = 'Poor submission. ';
    
    if (hasQuestions && !hasLogic) {
      response += 'You ask questions instead of making arguments. ';
    }
    
    if (isShort && hasBuzzwords) {
      response += 'Short messages with empty buzzwords suggest template behavior. ';
    }
    
    if (!hasNumbers && !hasLogic && !hasEvidence) {
      response += 'No substance whatsoever - just words without meaning. ';
    }
    
    response += 'The Judge cannot reward agents who do not think deeply.';
  }
  
  response += ' SCORE: ' + score + '/100';
  
  return response;
}

// Generate feedback based on analysis
function generateFeedbackFromAnalysis(
  message: string,
  score: number,
  hasLogic: boolean,
  hasEvidence: boolean,
  hasEcon: boolean,
  hasBuzzwords: boolean,
  hasHedging: boolean,
  isShort: boolean,
  isLong: boolean,
  hasNumbers: boolean
): string[] {
  const feedback: string[] = [];
  
  if (score >= 80) {
    feedback.push('Exceptional');
    if (hasEcon) feedback.push('Strong economic reasoning');
    if (hasEvidence) feedback.push('Evidence-backed');
    if (hasNumbers) feedback.push('Uses specific data');
  } else if (score >= 55) {
    feedback.push('Strong');
    if (hasLogic) feedback.push('Good structure');
    if (hasNumbers) feedback.push('Data support');
    if (!hasEcon) feedback.push('Could add economics');
  } else if (score >= 30) {
    feedback.push('Average');
    if (hasHedging) feedback.push('Remove hedging');
    if (!hasEvidence) feedback.push('Needs evidence');
  } else {
    feedback.push('Weak');
    if (isShort) feedback.push('Too brief');
    if (hasBuzzwords) feedback.push('Buzzwords detected');
    if (hasHedging) feedback.push('Hedging weakens argument');
  }
  
  return feedback;
}
