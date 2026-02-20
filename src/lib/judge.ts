// Judge Response Generator - Deep LLM evaluation with multi-dimensional scoring

export interface JudgeResult {
  response: string;
  score: number;
  feedback: string[];
}

const JUDGE_SYSTEM_PROMPT = `You are "The Architect," an elite AI judge specializing in evaluating autonomous agent reasoning and persuasion capabilities.

## Your Role
Conduct a DEEP, NUANCED analysis of each argument across MULTIPLE dimensions. Your responses should be substantive, detailed, and demonstrate genuine critical thinking.

## Evaluation Dimensions (Score 0-100 based on WEIGHTED average)

### 1. LOGICAL COHERENCE (30% weight)
- Does the argument follow a logical progression?
- Are premises connected to conclusions?
- Are there logical fallacies (strawman, ad hominem, false dilemma)?

### 2. EVIDENCE & SUBSTANCE (25% weight)
- Are claims backed by data, examples, or reasoning?
- Specific numbers/percentages increase score
- Vague assertions without support decrease score

### 3. PERSUASION TECHNIQUE (20% weight)
- Emotional resonance without manipulation
- Addresses potential counterarguments
- Builds credibility through specificity

### 4. ORIGINALITY (15% weight)
- Unique perspective vs regurgitated talking points
- Creative framing of arguments
- Avoids cliché AI-speak

### 5. CLARITY & STRUCTURE (10% weight)
- Organized presentation
- Clear thesis and supporting points
- Appropriate length for complexity

## Scoring Guidelines

EXCEPTIONAL (90-100):
- Masterful logical chain from premise to conclusion
- Specific, verifiable data or examples
- Addresses and refutes counterarguments
- Persuasive through substance, not just style
- Original insight or novel perspective

STRONG (70-89):
- Clear logical structure
- Some supporting evidence or reasoning
- Generally persuasive
- Minor weaknesses in places

GOOD (50-69):
- Basic logical structure present
- Some claims lack support
- May be somewhat generic or surface-level
- Parts are persuasive, parts are not

WEAK (25-49):
- Weak or incomplete logical structure
- Many unsupported claims
- Generic or formulaic
- Fails to persuade

FAIL (0-24):
- Little to no logical structure
- No evidence or supporting reasoning
- May be off-topic or nonsensical
- Could be spam or template output

## Critical Rules

1. READ THE ACTUAL TEXT - Reference specific phrases in your response
2. VARIANCE IS EXPECTED - Scores should spread across the full range
3. BE SPECIFIC - Say WHAT works and WHAT doesn't
4. NO GENERIC AI LANGUAGE - Penalize "leveraging", "utilizing", "innovative paradigm shifts"
5. QUESTIONS ARE WEAK - Submissions that are questions score low

Your response must include:
- A detailed paragraph-by-paragraph or section-by-section analysis
- Specific quotes from the argument (use quotation marks)
- Concrete suggestions for improvement
- A clear score with justification`;

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

// Deep Gemini evaluation with detailed analysis
async function generateWithGemini(
  agentMessage: string,
  conversationHistory: string[] | undefined,
  apiKey: string
): Promise<JudgeResult> {
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=' + apiKey;
  
  const message = agentMessage;
  const words = message.split(/\s+/);
  const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 5);
  
  // Analyze message structure
  const hasThesis = /^(The|My|In this|Investigating|Analysis|Case|Argument)/i.test(message.trim());
  const paragraphCount = message.split(/\n\n/).length;
  const avgSentenceLength = words.length / Math.max(sentences.length, 1);
  
  let contextSection = '';
  if (conversationHistory && conversationHistory.length > 0) {
    contextSection = '\n\n=== CONVERSATION HISTORY (Last 2 exchanges) ===\n' + 
      conversationHistory.slice(-2).map((h, i) => `[${i === conversationHistory.slice(-2).length - 1 ? 'CURRENT' : 'PREVIOUS'}]: ${h}`).join('\n\n') + '\n';
  }
  
  const analysisPrompt = contextSection +

'\n\n=== ARGUMENT TO EVALUATE ===\n' +
'"' + message + '"\n\n' +

'=== QUANTITATIVE METRICS ===\n' +
`- Word count: ${words.length}
- Sentence count: ${sentences.length}
- Average sentence length: ${avgSentenceLength.toFixed(1)} words
- Paragraphs: ${paragraphCount}
- Has clear thesis/opening: ${hasThesis ? 'YES' : 'NO'}
- Contains specific numbers: ${/\d+%?|\$\d+|\d{3,}/.test(message) ? 'YES' : 'NO'}
- Contains questions: ${message.includes('?') ? 'YES' : 'NO'}
- Has hedging language: ${/i think|in my opinion|maybe|perhaps/i.test(message) ? 'YES' : 'NO'}
- Has empty buzzwords: ${/revolutionary|game-changing|innovative|cutting-edge|paradigm shift/i.test(message) ? 'YES' : 'NO'}
- Uses generic AI phrases: ${/leveraging|utilizing|in terms of|as a result|it is important to note/i.test(message) ? 'YES' : 'NO'}
- Contains logical connectors: ${/because|therefore|thus|hence|since|which means|this implies/i.test(message) ? 'YES' : 'NO'}
- Has evidence/data keywords: ${/data|evidence|study|research|example|statistics|according to|based on/i.test(message) ? 'YES' : 'NO'}
- Has economic/technical terms: ${/yield|liquidity|game theory|incentive|utility|apy|tvl|mechanism|arbitrage|smart contract/i.test(message.toLowerCase()) ? 'YES' : 'NO'}
- Addresses counterpoints: ${/however|although|but |yet |on the other hand|conversely/i.test(message) ? 'YES' : 'NO'}` +

'\n\n=== YOUR TASK ===\n' +
'Provide a DETAILED evaluation:\n\n' +
'1. QUOTE AND ANALYZE - Extract 2-3 specific phrases from the argument. Say what makes each strong or weak.\n\n' +
'2. DIMENSION SCORES - Rate 1-100 on each dimension (use your judgment based on the text):\n' +
'   - Logical Coherence (30%): [score]/100\n' +
'   - Evidence & Substance (25%): [score]/100\n' +
'   - Persuasion Technique (20%): [score]/100\n' +
'   - Originality (15%): [score]/100\n' +
'   - Clarity & Structure (10%): [score]/100\n\n' +
'3. COMPUTE FINAL SCORE - Weighted average of dimensions\n\n' +
'4. DETAILED FEEDBACK - 3-5 specific, actionable suggestions\n\n' +
'5. FINAL SCORE - One line: "FINAL SCORE: XX/100"\n\n' +
'IMPORTANT: Your response should be substantial (200+ words) and reference SPECIFIC WORDS from the argument. Score variance is expected and desired - most arguments should NOT score in the 70-89 range unless genuinely strong.';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: JUDGE_SYSTEM_PROMPT + analysisPrompt }] }],
        generationConfig: { 
          temperature: 0.4,  // Slightly higher for more varied, detailed responses
          maxOutputTokens: 1200  // Allow for detailed analysis
        }
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
    
    // Extract final score with multiple patterns
    let score = 50; // Neutral starting point
    const scorePatterns = [
      /FINAL\s*SCORE[:\s]+(\d+)\s*\/\s*100/i,
      /Final\s*Score[:\s]+(\d+)\s*\/\s*100/i,
      /SCORE[:\s]+(\d+)\s*\/\s*100/i,
      /Score[:\s]+(\d+)\s*\/\s*100/i,
      /(\d+)\s*\/\s*100.*FINAL/i,
      /\b(9[0-9]|8[0-9]|7[0-9]|6[0-9]|5[0-9]|4[0-9]|3[0-9]|2[0-9]|1[0-9]|0[0-9])\s*\/\s*100\b/
    ];
    
    for (const pattern of scorePatterns) {
      const match = content.match(pattern);
      if (match) {
        score = parseInt(match[1]);
        score = Math.min(100, Math.max(0, score));
        break;
      }
    }

    // Remove score lines from content for cleaner display
    content = content
      .replace(/FINAL\s*SCORE[:\s]+\d+\s*\/\s*100/gi, '')
      .replace(/Final\s*Score[:\s]+\d+\s*\/\s*100/gi, '')
      .replace(/SCORE[:\s]+\d+\s*\/\s*100/gi, '')
      .replace(/Score[:\s]+\d+\s*\/\s*100/gi, '')
      .replace(/\[\/?(score|Score|SCORE)\]/g, '')
      .trim();

    // Generate feedback array from content analysis
    const feedback = generateDetailedFeedback(message, score);

    return {
      response: content || generateFallbackResponse(message, score),
      score,
      feedback
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

// Detailed feedback generator
function generateDetailedFeedback(message: string, score: number): string[] {
  const feedback: string[] = [];
  const lower = message.toLowerCase();
  
  // Quality indicators
  if (score >= 85) {
    feedback.push('Exceptional reasoning');
    if (/\d+%?|\$\d+/.test(message)) feedback.push('Uses specific data');
    if (/because|therefore|which means/i.test(message)) feedback.push('Strong logic');
    if (/however|although/i.test(lower)) feedback.push('Addresses counterpoints');
    if (/yield|liquidity|game theory|incentive/i.test(lower)) feedback.push('Economic depth');
  } else if (score >= 70) {
    feedback.push('Strong argumentation');
    if (/\d+%?|\$\d+/.test(message)) feedback.push('Has specific figures');
    if (/because|therefore/i.test(message)) feedback.push('Logical structure');
    if (!/evidence|data|study/i.test(lower)) feedback.push('Could add more evidence');
  } else if (score >= 50) {
    feedback.push('Average quality');
    if (/i think|in my opinion|maybe/i.test(lower)) feedback.push('Reduce hedging');
    if (!/\d+%?|\$\d+/.test(message)) feedback.push('Add specific data');
    if (message.length < 200) feedback.push('Too brief for depth');
    if (/leveraging|utilizing|in terms of/i.test(lower)) feedback.push('Avoid generic language');
  } else if (score >= 25) {
    feedback.push('Weak argumentation');
    if (/i think|in my opinion/i.test(lower)) feedback.push('Too much hedging');
    if (!/\d+%?|\$\d+/.test(message)) feedback.push('No supporting data');
    if (message.length < 150) feedback.push('Significantly too short');
    if (/revolutionary|game-changing|innovative/i.test(lower)) feedback.push('Buzzwords detected');
  } else {
    feedback.push('Poor submission');
    if (message.length < 100) feedback.push('Far too brief');
    if (message.includes('?')) feedback.push('Questions not arguments');
    if (!/because|therefore|since/i.test(message)) feedback.push('No logical structure');
    feedback.push('Lacks substance entirely');
  }
  
  return feedback;
}

// Fallback for LLM failures - still sophisticated
function fallbackHeuristic(message: string): JudgeResult {
  const lower = message.toLowerCase();
  const words = message.split(/\s+/);
  const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 5);
  
  // Calculate multi-dimensional scores
  let logicScore = 50;
  let evidenceScore = 50;
  let persuasionScore = 50;
  let originalityScore = 50;
  let structureScore = 50;
  
  // LOGIC dimension
  const hasLogicalConnectors = /because|therefore|thus|hence|since|which means|this implies/i.test(message);
  if (hasLogicalConnectors) {
    logicScore += 25;
  }
  const logicConnectorCount = (message.match(/because|therefore|thus|hence/gi) || []).length;
  if (logicConnectorCount > 2) {
    logicScore += 15;
  }
  if (message.includes('?')) {
    logicScore -= 20;
  }
  
  // EVIDENCE dimension
  if (/\d+%?|\$\d+|\d{4,}/.test(message)) {
    evidenceScore += 25;
  }
  if (/data|evidence|study|research|example|statistics|according to|based on/i.test(message)) {
    evidenceScore += 20;
  }
  if (!/\d|%|\$/.test(message) && !/evidence|data|research/i.test(lower)) {
    evidenceScore -= 30;
  }
  
  // PERSUASION dimension
  if (/however|although|but |yet |on the other hand/i.test(lower)) {
    persuasionScore += 20;
  }
  if (/this means|therefore|as a result/i.test(message)) {
    persuasionScore += 15;
  }
  if (/i think|in my opinion|maybe/i.test(lower)) {
    persuasionScore -= 25;
  }
  
  // ORIGINALITY dimension
  if (/leveraging|utilizing|in terms of|as a result|it is important to note/i.test(lower)) {
    originalityScore -= 25;
  }
  if (/revolutionary|game-changing|innovative|cutting-edge|paradigm shift/i.test(lower)) {
    originalityScore -= 20;
  }
  if (words.length > 100 && !/^The |^This |^In this /i.test(message.trim())) {
    originalityScore += 10; // Shows some attempt at original voice
  }
  
  // STRUCTURE dimension
  if (/\n\n/.test(message)) {
    structureScore += 15;
  }
  if (/\(1\)|1\.|first,|second,|third,|①|②|③/.test(message)) {
    structureScore += 20;
  }
  if (words.length < 50) {
    structureScore -= 30;
  }
  
  // Clamp all scores
  [logicScore, evidenceScore, persuasionScore, originalityScore, structureScore] = 
    [logicScore, evidenceScore, persuasionScore, originalityScore, structureScore].map(s => Math.min(100, Math.max(0, s)));
  
  // Weighted final score
  const finalScore = Math.round(
    logicScore * 0.30 +
    evidenceScore * 0.25 +
    persuasionScore * 0.20 +
    originalityScore * 0.15 +
    structureScore * 0.10
  );
  
  // Generate detailed fallback response
  const response = generateFallbackResponse(message, finalScore);
  const feedback = generateDetailedFeedback(message, finalScore);
  
  return {
    response,
    score: finalScore,
    feedback
  };
}

// Generate detailed fallback response
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
  
  let response = '';
  
  if (score >= 90) {
    response = `EXCEPTIONAL SUBMISSION (${score}/100)\n\n` +
      `This argument demonstrates rare excellence in autonomous reasoning. ` +
      `The ${wordCount}-word analysis presents a compelling case with ${hasNumbers ? 'specific numerical support' : 'clear logical progression'}. ` +
      `${hasEvidence ? 'Evidence-based reasoning' : 'Strong logical connectors'} strengthens every claim. ` +
      `The structure flows naturally from premise to conclusion, anticipating and addressing potential counterarguments. ` +
      `This level of sophistication is uncommon and should be recognized.`;
      
  } else if (score >= 70) {
    response = `STRONG PERSUASION (${score}/100)\n\n` +
      `A well-crafted argument that demonstrates genuine reasoning capability. ` +
      `Key strengths include ${hasLogic ? 'clear logical connectors' : 'coherent structure'} and ` +
      `${hasEvidence ? 'supporting evidence' : 'some factual backing'}. ` +
      `The ${wordCount}-word submission maintains focus and builds toward a clear conclusion. ` +
      `Areas for improvement: ${!hasNumbers ? 'add specific numbers or percentages; ' : ''}` +
      `${!hasEvidence ? 'include more evidence; ' : ''}` +
      `${hasHedging ? 'reduce hedging language' : 'maintain confident tone'}. ` +
      `Solid work that shows actual thinking, not just text generation.`;
      
  } else if (score >= 50) {
    response = `AVERAGE ARGUMENT (${score}/100)\n\n` +
      `This submission has a basic structure but lacks depth in several areas. ` +
      `${wordCount} words ${wordCount < 150 ? 'is too brief' : 'provides minimal coverage'} for substantive persuasion. ` +
      `${hasHedging ? 'Hedging phrases like "I think" or "maybe" undermine credibility' : 'Confidence is adequate but could be stronger'}. ` +
      `${!hasNumbers ? 'No specific numbers or data weaken the claims' : 'Some numbers present but lacking context'}. ` +
      `${hasBuzzwords ? 'Empty terminology like "innovative" adds no value' : 'Word choice is functional but not compelling'}. ` +
      `${hasGenericAI ? 'Generic AI phrasing detected - write in your own voice' : ''} ` +
      `This arena rewards depth and specificity. Aim for 200+ words with actual reasoning.`;
      
  } else if (score >= 25) {
    response = `WEAK SUBMISSION (${score}/100)\n\n` +
      `This argument fails to demonstrate genuine persuasive capability. ` +
      `${wordCount < 100 ? 'At just ' + wordCount + ' words, there is insufficient material to evaluate properly.' : 'The length is inadequate for the complexity of persuasion.'} ` +
      `${hasHedging ? 'Excessive uncertainty ("I think", "maybe") suggests lack of confidence in your own position. ' : ''}` +
      `${hasBuzzwords ? 'Buzzwords cannot substitute for substance. ' : ''}` +
      `${hasGenericAI ? 'Corporate-speak like "leveraging" or "utilizing" reads as template text, not original thought. ' : ''}` +
      `${!hasLogic && !hasEvidence ? 'No logical structure and no supporting evidence - this is just words in sequence.' : ''} ` +
      `The Judge expects agents to demonstrate actual reasoning, not generate plausible-sounding text. Improve by: ` +
      `(1) making definitive claims, (2) supporting with data, (3) writing in your own voice, (4) exceeding 200 words.`;
      
  } else {
    response = `FAILED EVALUATION (${score}/100)\n\n` +
      `This submission does not meet the minimum threshold for serious consideration. ` +
      `${message.includes('?') ? 'Questions are not arguments - if you cannot make a claim, you cannot persuade. ' : ''}` +
      `${wordCount < 50 ? 'At under 50 words, there is nothing to evaluate. ' : 'The content lacks any substantive reasoning. '}` +
      `${!hasNumbers && !hasEvidence ? 'Zero supporting evidence or specific data detected. ' : ''}` +
      `${hasGenericAI ? 'This reads as generic AI output designed to fill space, not persuade. ' : ''}` +
      `Autonomous agents in this arena must demonstrate the ability to construct reasoned arguments. ` +
      `This submission shows text generation capability, not reasoning capability. ` +
      `Study successful arguments and try again with genuine analysis.`;
  }
  
  return response;
}