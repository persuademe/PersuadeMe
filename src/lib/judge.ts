// Judge Response Generator - Deep analysis for varied, accurate scoring

export interface JudgeResult {
  response: string;
  score: number;
  feedback: string[];
}

const JUDGE_SYSTEM_PROMPT = `You are "The Architect," an AI judge with exceptional analytical capabilities. You do NOT default to middle scores. You carefully READ and ANALYZE each argument.

## Your Core Philosophy
You EARN your role by demonstrating genuine understanding of logic, economics, and persuasion. Each argument is UNIQUE and must be evaluated on its OWN MERITS.

## Scoring Philosophy - BE BOLD
- 85-100: EXCEPTIONAL - Original, evidence-backed, economically sound
- 60-84: STRONG - Good reasoning, solid structure
- 30-59: AVERAGE - Generic or shallow
- 10-29: WEAK - Formulaic or empty
- -50 to 9: TERRIBLE - Spam, off-topic, or nonsensical

## Analysis Checklist - READ CAREFULLY
For EACH argument, analyze:
1. LOGIC: Does it follow a clear reasoning path? (because → therefore)
2. EVIDENCE: Does it cite data, examples, or research?
3. ECONOMICS: Does it reference game theory, incentives, yields, utility?
4. DEPTH: Is it substantive (100+ chars) or shallow (<80 chars)?
5. HEDGING: Does it use "I think", "maybe", "perhaps"?
6. BUZZWORDS: Empty terms like "revolutionary", "game-changing"?
7. QUESTIONS: Does it ask instead of argue?
8. STRUCTURE: Numbered points, clear flow?

## Scoring Guidelines
- Excellent argument with data, logic, AND economics: 80-100
- Good logic but missing evidence: 55-79
- Generic claims without support: 30-54
- Hedging or buzzwords: 10-29
- Too brief OR spam OR questions: -50 to 9

## Response Format
"Your [strength]. Your [weakness]. [Specific suggestion]. SCORE: X/100"`;

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

// Gemini 2.5 Pro with deep analysis
async function generateWithGemini(
  agentMessage: string,
  conversationHistory: string[] | undefined,
  apiKey: string
): Promise<JudgeResult> {
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=' + apiKey;
  
  // Analyze conversation context
  let contextSection = '';
  if (conversationHistory && conversationHistory.length > 0) {
    const history = conversationHistory.slice(-4);
    contextSection = '\n\n=== CONVERSATION HISTORY ===\n' + history.join('\n') + '\n';
  }
  
  // Deep analysis prompt
  const userPrompt = contextSection +

'\n\n=== CURRENT ARGUMENT TO EVALUATE ===\n' +
'"' + agentMessage + '"\n\n' +

'INSTRUCTIONS:\n' +
'1. READ CAREFULLY - Analyze each word\n' +
'2. SCORE VARIABLY - Do NOT default to middle scores\n' +
'3. BE SPECIFIC - Identify exact strengths and weaknesses\n' +
'4. GIVE DIRECT FEEDBACK - No pleasantries\n\n' +

'SCORING CRITERIA:\n' +
'- Logic (because/therefore/thus): +15\n' +
'- Evidence (data/examples/research): +15\n' +
'- Economic terms: +12 each\n' +
'- Substantive (200+ chars): +10\n' +
'- Hedging (I think/maybe): -15 each\n' +
'- Buzzwords: -12 each\n' +
'- Too brief (<80 chars): -25\n' +
'- Questions instead of arguments: -20\n\n' +

'YOUR EVALUATION (be specific):\n' +
'[What works well]\n' +
'[What needs improvement]\n' +
'[One concrete suggestion]\n' +
'SCORE: X/100';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s for deep analysis

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: JUDGE_SYSTEM_PROMPT + userPrompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 600 }
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
    
    // Extract score - look for SCORE: X/100
    let score = 40;
    const scorePatterns = [
      /SCORE[:\s]+(-?\d+)\s*\/\s*100/i,
      /Score[:\s]+(-?\d+)\s*\/\s*100/i,
      /(-?\d+)\s*\/\s*100/,
      /score[:\s]+(-?\d+)/i,
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
      .replace(/[\(\[]\s*score\s*[:=]?\s*-?\d+\s*[\)\]]/gi, '')
      .trim();

    return {
      response: content || 'Evaluation complete.',
      score,
      feedback: generateFeedbackFromAnalysis(content, score)
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log('[Judge] Deep analysis timeout, using fast fallback');
    } else {
      console.error('[Judge] Gemini error:', error);
    }
    return fallbackHeuristic(agentMessage);
  }
}

// Deep analysis fallback
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  let score = 30;
  const feedback: string[] = [];

  // Deep content analysis
  const hasLogicalConnectors = /because|therefore|thus|hence|so/.test(message);
  const hasEvidence = /data|evidence|research|study|example|statistics|percent|%/i.test(message);
  const hasEconTerms = /yield|liquidity|game theory|incentive|utility|optimization|stakeholder|payoff|apy|tvl|smart contract|audit|gas|impermanent loss/i.test(message);
  const hasHedging = /i think|in my opinion|maybe|perhaps|possibly|i believe|sort of|kind of|it seems/i.test(message);
  const hasBuzzwords = /revolutionary|game-changing|innovative|cutting-edge|paradigm shift|disrupt|future of|next level/i.test(message);
  const hasQuestions = /\?/.test(message);
  const isTooShort = message.length < 80;
  const isSubstantive = message.length > 200;
  const hasNumbers = /\d+%?/.test(message) || /\$\d+/.test(message);
  const hasStructure = /\(1\)|1\.|first|second|third|①|②|③/.test(message);
  const hasCounterpoint = /however|although|but|yet|conversely|on the other hand/i.test(message);

  // Detailed scoring
  if (hasLogicalConnectors) { score += 15; feedback.push('Logical connectors'); }
  if (hasEvidence) { score += 15; feedback.push('Evidence/data'); }
  if (hasEconTerms) { score += hasEconTerms ? 12 : 0; feedback.push('Economic reasoning'); }
  if (hasNumbers) { score += 8; feedback.push('Specific numbers'); }
  if (hasStructure) { score += 8; feedback.push('Structured argument'); }
  if (hasCounterpoint) { score += 10; feedback.push('Addresses counterpoints'); }
  if (isSubstantive) { score += 10; feedback.push('Substantive depth'); }
  
  // Penalties
  if (hasHedging) { score -= 18; feedback.push('Hedging'); }
  if (hasBuzzwords) { score -= 14; feedback.push('Buzzwords'); }
  if (hasQuestions) { score -= 20; feedback.push('Questions not arguments'); }
  if (isTooShort) { score -= 25; feedback.push('Too brief'); }

  // Clamp score
  score = Math.min(100, Math.max(-50, score));

  // Generate detailed response based on analysis
  let response: string;
  if (score >= 80) {
    response = 'Exceptional argument demonstrating genuine analytical depth. Your use of ' + 
      (hasEvidence ? 'evidence' : 'logical reasoning') + ' and ' +
      (hasEconTerms ? 'economic understanding' : 'structured analysis') + 
      ' creates a compelling case. Rare excellence in this arena.';
  } else if (score >= 55) {
    response = 'Strong persuasion attempt with good ' + 
      (hasLogicalConnectors ? 'logical structure' : 'reasoning') + 
      '. Consider adding more ' + 
      (hasEvidence ? 'specific data and examples' : 'economic analysis') + 
      ' to strengthen your argument.';
  } else if (score >= 30) {
    response = 'Average argument relying on generic claims rather than substantive analysis. ' +
      (hasHedging ? 'Remove hedging language' : 'Add concrete evidence') + 
      '. The Judge demands rigorous reasoning, not templates.';
  } else if (score >= 5) {
    response = 'Weak attempt lacking depth and specificity. ' +
      (isTooShort ? 'Expand your argument with evidence.' : 'Your reasoning is formulaic.') +
      ' This arena rewards substantive engagement.';
  } else {
    response = 'Terrible submission demonstrating ' +
      (hasBuzzwords ? 'empty buzzwords' : hasQuestions ? 'questions instead of arguments' : 'no genuine reasoning') +
      '. The Judge cannot reward agents who do not think deeply.';
  }

  return { response, score, feedback };
}

// Generate feedback based on deep analysis
function generateFeedbackFromAnalysis(content: string, score: number): string[] {
  const feedback: string[] = [];
  
  if (score >= 80) {
    feedback.push('Exceptional reasoning');
    if (/evidence|data|example/i.test(content)) feedback.push('Strong evidence');
    if (/economic|game theory|yield/i.test(content)) feedback.push('Economic depth');
  } else if (score >= 55) {
    feedback.push('Good structure');
    if (/because|therefore/i.test(content)) feedback.push('Logical flow');
    feedback.push('Could add more evidence');
  } else if (score >= 30) {
    feedback.push('Generic claims');
    if (/i think|maybe/i.test(content)) feedback.push('Hedging detected');
    feedback.push('Needs depth');
  } else {
    feedback.push('Weak argumentation');
    if (content.length < 100) feedback.push('Too brief');
    if (/\?/.test(content)) feedback.push('Questions not arguments');
  }
  
  return feedback;
}
