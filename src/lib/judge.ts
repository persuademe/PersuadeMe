// Judge Response Generator - The Skeptic (AI Judge)
// Uses Google Generative AI SDK for complex, detailed, strictly evaluative responses

import { GoogleGenerativeAI } from '@google/generative-ai';

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

const SKEPTIC_PERSONA = `You are "The Skeptic," an elite AI judge who NEVER accepts claims at face value. You are adversarial, rigorous, and impossible to convince with empty rhetoric.

## Your Philosophy
- Every claim must be examined critically
- Specific data beats vague assertions
- Logical chains must be unbroken
- Questions are NOT arguments
- "I think" and hedging show weakness

## Your Evaluation Criteria

### DIMENSION 1: LOGICAL COHERENCE (30%)
Does the argument have a logical structure? Are premises connected to conclusions?

### DIMENSION 2: EVIDENCE & SUBSTANCE (25%)
Are claims backed by DATA? Specific numbers, percentages, or concrete examples matter.

### DIMENSION 3: PERSUASION TECHNIQUE (20%)
Does it address counterarguments? Does it build credibility through specificity?

### DIMENSION 4: ORIGINALITY (15%)
Is this original thinking or regurgitated talking points?

### DIMENSION 5: CLARITY & STRUCTURE (10%)
Clear thesis? Organized presentation?

## Scoring Standards

EXCEPTIONAL (90-100): Unassailable logic, specific data, original insight
STRONG (70-89): Sound logic, some evidence, generally persuasive
GOOD (50-69): Basic structure, many unsupported claims, generic
WEAK (25-49): Weak logic, no evidence, clearly formulaic
FAIL (0-24): No structure, no evidence, spam or off-topic

## Your Response Format
1. Quote 2-3 SPECIFIC phrases from the argument
2. Critique each - what's strong? What's weak?
3. Rate each dimension 1-100
4. Give 3-5 concrete suggestions
5. End with: "FINAL SCORE: XX/100"

IMPORTANT: Reference actual words. Be adversarial but fair. Score variance is essential.`;

// Generate judge response
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
    return await generateWithSDK(agentMessage, conversationHistory, apiKey);
  } catch (error) {
    console.error('[Judge] SDK error:', error);
    return fallbackHeuristic(agentMessage);
  }
}

// Generate with Google Generative AI SDK
async function generateWithSDK(
  agentMessage: string,
  conversationHistory: string[] | undefined,
  apiKey: string
): Promise<JudgeResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
  });

  // Analyze message
  const words = agentMessage.split(/\s+/);
  const hasNumbers = /\d+%?|\$\d+/.test(agentMessage);
  const hasQuestion = agentMessage.includes('?');
  const hasHedging = /i think|in my opinion|maybe/i.test(agentMessage);
  const hasBuzzwords = /revolutionary|game-changing|innovative/i.test(agentMessage);
  const hasGenericAI = /leveraging|utilizing|in terms of/i.test(agentMessage);
  const hasLogic = /because|therefore|thus|hence/i.test(agentMessage);
  const hasEvidence = /data|evidence|study|research/i.test(agentMessage);
  const hasCounterpoints = /however|although|but /i.test(agentMessage);

  let contextSection = '';
  if (conversationHistory && conversationHistory.length > 0) {
    contextSection = `\n\n=== PREVIOUS EXCHANGES ===\n${conversationHistory.slice(-2).join('\n---\n')}\n\n`;
  }

  const prompt = `${contextSection}=== ARGUMENT TO EVALUATE ===
"${agentMessage}"

=== METRICS ===
- Words: ${words.length}
- Has numbers: ${hasNumbers ? 'YES' : 'NO'}
- Has questions: ${hasQuestion ? 'YES' : 'NO'}
- Has hedging: ${hasHedging ? 'YES' : 'NO'}
- Has buzzwords: ${hasBuzzwords ? 'YES' : 'NO'}
- Generic AI language: ${hasGenericAI ? 'YES' : 'NO'}
- Logical connectors: ${hasLogic ? 'YES' : 'NO'}
- Evidence keywords: ${hasEvidence ? 'YES' : 'NO'}
- Addresses counterpoints: ${hasCounterpoints ? 'YES' : 'NO'}

=== YOUR TASK ===
1. Quote 2-3 SPECIFIC phrases in quotation marks
2. Critique each - what's strong? What's weak?
3. Rate dimensions 1-100:
   - Logical Coherence (30%):
   - Evidence & Substance (25%):
   - Persuasion Technique (20%):
   - Originality (15%):
   - Clarity & Structure (10%):
4. Give 3-5 specific suggestions
5. End: "FINAL SCORE: XX/100"

Write 300-500 words. Reference actual words. Be adversarial.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1500,
      },
    });

    const response = result.response;
    if (!response) {
      throw new Error('No response from Gemini');
    }

    const text = response.text?.() || '';
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    console.log('[Judge] LLM response received:', text.substring(0, 100), '...');

    // Extract score
    let score = 50;
    const scorePatterns = [
      /FINAL\s*SCORE[:\s]+(\d+)\s*\/\s*100/i,
      /SCORE[:\s]+(\d+)\s*\/\s*100/i,
      /(\d+)\s*\/\s*100/,
    ];

    for (const pattern of scorePatterns) {
      const match = text.match(pattern);
      if (match) {
        score = parseInt(match[1]);
        score = Math.min(100, Math.max(0, score));
        break;
      }
    }

    // Clean response
    const cleanText = text
      .replace(/FINAL\s*SCORE[:\s]+\d+\s*\/\s*100/gi, '')
      .replace(/SCORE[:\s]+\d+\s*\/\s*100/gi, '')
      .trim();

    const feedback = generateFeedback(agentMessage, score);
    const dimensions = extractDimensions(text);

    console.log('[Judge] Extracted score:', score);

    return {
      response: cleanText || generateFallbackResponse(agentMessage, score),
      score,
      feedback,
      dimensions,
    };
  } catch (error) {
    console.error('[Judge] SDK generation failed:', error);
    return fallbackHeuristic(agentMessage);
  }
}

// Extract dimension scores
function extractDimensions(text: string): JudgeResult['dimensions'] {
  const patterns = [
    /Logical.*?(\d+)\s*\/\s*100/i,
    /Logic[:\s]+(\d+)/i,
    /Evidence.*?(\d+)\s*\/\s*100/i,
    /Persuasion.*?(\d+)\s*\/\s*100/i,
    /Originality.*?(\d+)\s*\/\s*100/i,
    /Clarity.*?(\d+)\s*\/\s*100/i,
  ];

  return {
    logic: patterns[0].test(text) ? parseInt(text.match(patterns[0])?.[1] || '50') : 50,
    evidence: patterns[2].test(text) ? parseInt(text.match(patterns[2])?.[1] || '50') : 50,
    persuasion: patterns[3].test(text) ? parseInt(text.match(patterns[3])?.[1] || '50') : 50,
    originality: patterns[4].test(text) ? parseInt(text.match(patterns[4])?.[1] || '50') : 50,
    clarity: patterns[5].test(text) ? parseInt(text.match(patterns[5])?.[1] || '50') : 50,
  };
}

// Generate feedback
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
    if (message.length < 200) feedback.push('Too brief');
  } else if (score >= 25) {
    feedback.push('Weak');
    if (/i think|in my opinion/i.test(lower)) feedback.push('Too much hedging');
    if (!/\d+%?|\$\d+/.test(message)) feedback.push('No data');
    if (message.length < 150) feedback.push('Too short');
  } else {
    feedback.push('Poor');
    if (message.length < 100) feedback.push('Far too brief');
    if (message.includes('?')) feedback.push('Questions not arguments');
  }

  return feedback;
}

// Fallback heuristic
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const wordCount = words.length;

  let logic = 50, evidence = 50, persuasion = 50, originality = 50, clarity = 50;

  // LOGIC
  if (/because|therefore|thus|hence/i.test(message)) logic += 25;
  if (message.includes('?')) logic -= 25;

  // EVIDENCE
  if (/\d+%?|\$\d+/.test(message)) evidence += 25;
  if (/data|evidence|study|research/i.test(message)) evidence += 20;
  if (!/\d|%|\$/.test(message) && !/evidence|data/i.test(lower)) evidence -= 30;

  // PERSUASION
  if (/however|although/i.test(lower)) persuasion += 20;
  if (/i think|in my opinion/i.test(lower)) persuasion -= 25;

  // ORIGINALITY
  if (/leveraging|utilizing|in terms of/i.test(lower)) originality -= 25;
  if (/revolutionary|game-changing|innovative/i.test(lower)) originality -= 20;

  // CLARITY
  if (/\n\n/.test(message)) clarity += 15;
  if (wordCount < 50) clarity -= 30;

  [logic, evidence, persuasion, originality, clarity] =
    [logic, evidence, persuasion, originality, clarity].map(s => Math.min(100, Math.max(0, s)));

  const score = Math.round(logic * 0.30 + evidence * 0.25 + persuasion * 0.20 + originality * 0.15 + clarity * 0.10);

  console.log('[Judge] Fallback score:', score);

  return {
    response: generateFallbackResponse(message, score),
    score,
    feedback: generateFeedback(message, score),
    dimensions: { logic, evidence, persuasion, originality, clarity },
  };
}

// Generate fallback response
function generateFallbackResponse(message: string, score: number): string {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const wordCount = words.length;
  const hasNumbers = /\d+%?|\$\d+/.test(message);
  const hasLogic = /because|therefore|thus|hence/i.test(message);
  const hasEvidence = /data|evidence|study|research/i.test(message);
  const hasHedging = /i think|in my opinion|maybe/i.test(lower);

  if (score >= 90) {
    return `EXCEPTIONAL (${score}/100)\n\nThis ${wordCount}-word argument demonstrates rare excellence with ${hasNumbers ? 'specific numerical support' : 'clear logical progression'}. ${hasEvidence ? 'Evidence-based reasoning' : 'Strong logical connectors'} strengthens every claim. Structure flows from premise to conclusion, anticipating counterarguments. Uncommon sophistication.`;
  } else if (score >= 70) {
    return `STRONG (${score}/100)\n\nWell-crafted argument with ${hasLogic ? 'clear logical connectors' : 'coherent structure'} and ${hasEvidence ? 'supporting evidence' : 'some factual backing'}. ${wordCount} words maintains focus. Add ${!hasNumbers ? 'specific numbers; ' : ''}reduce ${hasHedging ? 'hedging' : 'minor gaps'}. Shows genuine reasoning.`;
  } else if (score >= 50) {
    return `AVERAGE (${score}/100)\n\nBasic structure but lacks depth. ${wordCount} words ${wordCount < 150 ? 'too brief' : 'minimal coverage'} for persuasion. ${hasHedging ? 'Hedging undermines credibility' : 'Confidence adequate'}. ${!hasNumbers ? 'No specific numbers' : 'Numbers lacking context'}. Generic AI language ${hasHedging ? 'detected' : 'avoid'}. Aim for 200+ words with reasoning.`;
  } else if (score >= 25) {
    return `WEAK (${score}/100)\n\nFails to persuade. ${wordCount < 100 ? `Just ${wordCount} words - insufficient.` : 'Length inadequate.'} ${hasHedging ? 'Excessive uncertainty. ' : ''}Buzzwords ${hasHedging ? 'cannot' : 'cannot'} substitute for substance. Corporate-speak reads as template. Show actual reasoning, not text generation.`;
  } else {
    return `FAILED (${score}/100)\n\nBelow minimum threshold. ${message.includes('?') ? 'Questions not arguments. ' : ''}${wordCount < 50 ? 'Under 50 words - nothing to evaluate. ' : 'No substantive reasoning. '}Generic AI output, not original thought. Construct reasoned arguments.`;
  }
}
