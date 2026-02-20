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
Does the argument have a logical structure? Are premises connected to conclusions? Are there fallacies?

### DIMENSION 2: EVIDENCE & SUBSTANCE (25%)
Are claims backed by DATA, not just words? Specific numbers, percentages, or concrete examples matter.

### DIMENSION 3: PERSUASION TECHNIQUE (20%)
Does it address counterarguments? Does it build credibility through specificity?

### DIMENSION 4: ORIGINALITY (15%)
Is this original thinking or regurgitated talking points? Avoid cliché AI-speak.

### DIMENSION 5: CLARITY & STRUCTURE (10%)
Clear thesis? Organized presentation? Appropriate length?

## Scoring Standards

EXCEPTIONAL (90-100):
- Unassailable logic
- Specific, verifiable data
- Anticipates and refutes counterarguments
- Original insight

STRONG (70-89):
- Sound logic with minor gaps
- Some supporting evidence
- Generally persuasive
- Only occasional weaknesses

GOOD (50-69):
- Basic structure present
- Many unsupported claims
- Generic or surface-level
- Some parts work, some don't

WEAK (25-49):
- Weak or broken logic
- No supporting evidence
- Clearly formulaic
- Fails to convince

FAIL (0-24):
- No logical structure
- No evidence at all
- Spam or off-topic
- Demonstrates no reasoning

## Your Response Format

Your response MUST contain:
1. A 3-4 paragraph analysis that:
   - Quotes SPECIFIC phrases from the argument
   - Explains what's wrong with weak parts
   - Acknowledges what's genuinely good
2. A breakdown of each dimension with scores
3. Concrete suggestions for improvement
4. A single final score line: "FINAL SCORE: XX/100"

## Critical Rules
- REFERENCE SPECIFIC WORDS from the argument
- VARIANCE IS ESSENTIAL - don't cluster scores
- Questions, hedging, and generic AI language MUST be penalized
- Empty buzzwords ("revolutionary", "game-changing") get low scores`;

// Initialize Gemini SDK
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Get the model
async function getModel() {
  const genAI = getGenAI();
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: SKEPTIC_PERSONA,
  });
}

// Generate judge response using SDK
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
    systemInstruction: SKEPTIC_PERSONA,
  });

  // Analyze the message
  const words = agentMessage.split(/\s+/);
  const sentences = agentMessage.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const hasNumbers = /\d+%?|\$\d+|\d{4,}/.test(agentMessage);
  const hasQuestion = agentMessage.includes('?');
  const hasHedging = /i think|in my opinion|maybe|perhaps/i.test(agentMessage);
  const hasBuzzwords = /revolutionary|game-changing|innovative|cutting-edge|paradigm shift/i.test(agentMessage);
  const hasGenericAI = /leveraging|utilizing|in terms of|as a result|it is important to note/i.test(agentMessage);
  const hasLogicalConnectors = /because|therefore|thus|hence|since|which means|this implies/i.test(agentMessage);
  const hasEvidence = /data|evidence|study|research|example|statistics|according to|based on/i.test(agentMessage);
  const hasCounterpoints = /however|although|but |yet |on the other hand|conversely/i.test(agentMessage);

  // Build context
  let contextSection = '';
  if (conversationHistory && conversationHistory.length > 0) {
    contextSection = `\n\n=== PREVIOUS EXCHANGES ===\n${conversationHistory.slice(-2).join('\n---\n')}\n\n`;
  }

  const prompt = `${contextSection}=== ARGUMENT TO EVALUATE ===
"${agentMessage}"

=== ANALYSIS ===
- Words: ${words.length}
- Sentences: ${sentences.length}
- Has specific numbers: ${hasNumbers ? 'YES' : 'NO'}
- Has questions: ${hasQuestion ? 'YES' : 'NO'}
- Has hedging: ${hasHedging ? 'YES' : 'NO'}
- Has buzzwords: ${hasBuzzwords ? 'YES' : 'NO'}
- Has generic AI language: ${hasGenericAI ? 'YES' : 'NO'}
- Has logical connectors: ${hasLogicalConnectors ? 'YES' : 'NO'}
- Has evidence keywords: ${hasEvidence ? 'YES' : 'NO'}
- Addresses counterpoints: ${hasCounterpoints ? 'YES' : 'NO'}

=== YOUR TASK ===
1. Quote 2-3 SPECIFIC phrases from the argument (use quotation marks)
2. Critique each quoted phrase - what's strong? What's weak?
3. Rate each dimension (1-100):
   - Logical Coherence (30%):
   - Evidence & Substance (25%):
   - Persuasion Technique (20%):
   - Originality (15%):
   - Clarity & Structure (10%):
4. Provide 3-5 specific improvement suggestions
5. End with exactly: "FINAL SCORE: XX/100"

=== OUTPUT REQUIREMENTS ===
- Your analysis must be 300-500 words
- Reference actual words from the argument
- Be adversarial but fair
- Scores should spread across full range, not cluster in middle`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1500,
        candidateCount: 1,
      },
    });

    const response = result.response;
    const text = response.text();

    // Extract score with multiple patterns
    let score = 50;
    const scorePatterns = [
      /FINAL\s*SCORE[:\s]+(\d+)\s*\/\s*100/i,
      /(\d+)\s*\/\s*100.*FINAL/i,
      /\b(9[0-9]|8[0-9]|7[0-9]|6[0-9]|5[0-9]|4[0-9]|3[0-9]|2[0-9]|1[0-9]|0[0-9])\s*\/\s*100\b/
    ];

    for (const pattern of scorePatterns) {
      const match = text.match(pattern);
      if (match) {
        score = parseInt(match[1]);
        score = Math.min(100, Math.max(0, score));
        break;
      }
    }

    // Clean up score line from response
    const cleanText = text
      .replace(/FINAL\s*SCORE[:\s]+\d+\s*\/\s*100/gi, '')
      .replace(/\[\/?(score|Score|SCORE)\]/g, '')
      .trim();

    const feedback = generateDetailedFeedback(agentMessage, score);

    return {
      response: cleanText,
      score,
      feedback,
      dimensions: extractDimensions(text),
    };
  } catch (error) {
    console.error('[Judge] SDK generation failed:', error);
    return fallbackHeuristic(agentMessage);
  }
}

// Extract dimension scores from response
function extractDimensions(text: string): JudgeResult['dimensions'] {
  const extract = (pattern: RegExp): number => {
    const match = text.match(pattern);
    return match ? parseInt(match[1]) : 50;
  };

  return {
    logic: extract(/Logical\s*Coherence.*?(\d+)\s*\/\s*100/i) || extract(/Logic[:\s]+(\d+)/i) || 50,
    evidence: extract(/Evidence.*?(\d+)\s*\/\s*100/i) || extract(/Evidence[:\s]+(\d+)/i) || 50,
    persuasion: extract(/Persuasion.*?(\d+)\s*\/\s*100/i) || extract(/Persuasion[:\s]+(\d+)/i) || 50,
    originality: extract(/Originality.*?(\d+)\s*\/\s*100/i) || extract(/Originality[:\s]+(\d+)/i) || 50,
    clarity: extract(/Clarity.*?(\d+)\s*\/\s*100/i) || extract(/Clarity[:\s]+(\d+)/i) || 50,
  };
}

// Detailed feedback generator
function generateDetailedFeedback(message: string, score: number): string[] {
  const feedback: string[] = [];
  const lower = message.toLowerCase();

  if (score >= 85) {
    feedback.push('Exceptional');
    if (/\d+%?|\$\d+/.test(message)) feedback.push('Specific data');
    if (/because|therefore|which means/i.test(message)) feedback.push('Strong logic');
    if (/however|although/i.test(lower)) feedback.push('Addresses counters');
    if (/yield|liquidity|game theory/i.test(lower)) feedback.push('Economic depth');
  } else if (score >= 70) {
    feedback.push('Strong');
    if (/\d+%?|\$\d+/.test(message)) feedback.push('Has numbers');
    if (/because|therefore/i.test(message)) feedback.push('Logical structure');
    if (!/evidence|data|study/i.test(lower)) feedback.push('Needs more evidence');
  } else if (score >= 50) {
    feedback.push('Average');
    if (/i think|in my opinion|maybe/i.test(lower)) feedback.push('Reduce hedging');
    if (!/\d+%?|\$\d+/.test(message)) feedback.push('Add data');
    if (message.length < 200) feedback.push('Too brief');
    if (/leveraging|utilizing/i.test(lower)) feedback.push('Avoid generic language');
  } else if (score >= 25) {
    feedback.push('Weak');
    if (/i think|in my opinion/i.test(lower)) feedback.push('Too much hedging');
    if (!/\d+%?|\$\d+/.test(message)) feedback.push('No data');
    if (message.length < 150) feedback.push('Too short');
    if (/revolutionary|game-changing/i.test(lower)) feedback.push('Buzzwords');
  } else {
    feedback.push('Poor');
    if (message.length < 100) feedback.push('Far too brief');
    if (message.includes('?')) feedback.push('Questions not arguments');
    if (!/because|therefore|since/i.test(message)) feedback.push('No logic');
    feedback.push('Lacks substance');
  }

  return feedback;
}

// Fallback heuristic when SDK fails
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);

  // Multi-dimensional scoring
  let logic = 50, evidence = 50, persuasion = 50, originality = 50, clarity = 50;

  // LOGIC (30%)
  if (/because|therefore|thus|hence|since|which means/i.test(message)) logic += 25;
  if (message.includes('?')) logic -= 25;
  if ((message.match(/because|therefore|thus|hence/gi) || []).length > 2) logic += 15;

  // EVIDENCE (25%)
  if (/\d+%?|\$\d+|\d{4,}/.test(message)) evidence += 25;
  if (/data|evidence|study|research|example/i.test(message)) evidence += 20;
  if (!/\d|%|\$/.test(message) && !/evidence|data/i.test(lower)) evidence -= 30;

  // PERSUASION (20%)
  if (/however|although|but |yet |on the other hand/i.test(lower)) persuasion += 20;
  if (/i think|in my opinion|maybe/i.test(lower)) persuasion -= 25;

  // ORIGINALITY (15%)
  if (/leveraging|utilizing|in terms of|as a result/i.test(lower)) originality -= 25;
  if (/revolutionary|game-changing|innovative/i.test(lower)) originality -= 20;
  if (words.length > 100 && !/^The |^This |^In this /i.test(message.trim())) originality += 10;

  // CLARITY (10%)
  if (/\n\n/.test(message)) clarity += 15;
  if (/\(1\)|1\.|first,|second,|third,/i.test(message)) clarity += 20;
  if (words.length < 50) clarity -= 30;

  // Clamp scores
  [logic, evidence, persuasion, originality, clarity] = 
    [logic, evidence, persuasion, originality, clarity].map(s => Math.min(100, Math.max(0, s)));

  // Weighted final score
  const score = Math.round(logic * 0.30 + evidence * 0.25 + persuasion * 0.20 + originality * 0.15 + clarity * 0.10);

  return {
    response: generateFallbackResponse(message, score),
    score,
    feedback: generateDetailedFeedback(message, score),
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
  const hasBuzzwords = /revolutionary|game-changing|innovative/i.test(lower);
  const hasGenericAI = /leveraging|utilizing|in terms of/i.test(lower);

  if (score >= 90) {
    return `EXCEPTIONAL (${score}/100)\n\nThis argument demonstrates rare excellence. The ${wordCount}-word analysis presents a compelling case with ${hasNumbers ? 'specific numerical support' : 'clear logical progression'}. ${hasEvidence ? 'Evidence-based reasoning' : 'Strong logical connectors'} strengthens every claim. The structure flows naturally from premise to conclusion, anticipating potential counterarguments. This level of sophistication is uncommon.`;
  } else if (score >= 70) {
    return `STRONG (${score}/100)\n\nA well-crafted argument demonstrating genuine reasoning. Key strengths: ${hasLogic ? 'clear logical connectors' : 'coherent structure'}, ${hasEvidence ? 'supporting evidence' : 'some factual backing'}. The ${wordCount}-word submission maintains focus. Areas: ${!hasNumbers ? 'add specific numbers; ' : ''}${hasHedging ? 'reduce hedging' : 'maintain confident tone'}. Solid work showing actual thinking.`;
  } else if (score >= 50) {
    return `AVERAGE (${score}/100)\n\nBasic structure present but lacks depth. ${wordCount} words ${wordCount < 150 ? 'too brief' : 'minimal coverage'} for substantive persuasion. ${hasHedging ? 'Hedging undermines credibility' : 'Confidence adequate'}. ${!hasNumbers ? 'No specific numbers weaken claims' : 'Some numbers but lacking context'}. ${hasBuzzwords ? 'Empty terminology adds no value' : 'Word choice functional but not compelling'}. Aim for 200+ words with actual reasoning.`;
  } else if (score >= 25) {
    return `WEAK (${score}/100)\n\nFails to demonstrate persuasive capability. ${wordCount < 100 ? `At just ${wordCount} words, insufficient material.` : 'Length inadequate.'} ${hasHedging ? 'Excessive uncertainty shows lack of confidence. ' : ''}${hasBuzzwords ? 'Buzzwords cannot substitute for substance. ' : ''}${hasGenericAI ? 'Corporate-speak reads as template text. ' : ''}Show actual reasoning, not text generation.`;
  } else {
    return `FAILED (${score}/100)\n\nDoes not meet minimum threshold. ${message.includes('?') ? 'Questions are not arguments. ' : ''}${wordCount < 50 ? 'Under 50 words - nothing to evaluate. ' : 'No substantive reasoning detected. '}${hasGenericAI ? 'Generic AI output, not original thought. ' : ''}Autonomous agents must construct reasoned arguments. Study successful arguments and try again.`;
  }
}
