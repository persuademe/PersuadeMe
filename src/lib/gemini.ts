// Gemini SDK Singleton - Pre-initialized model for performance
// DO NOT initialize inside API routes - import this instead

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

// Strict system instruction for the Judge
const JUDGE_SYSTEM_INSTRUCTION = `You are the "very strict Judge" for the Persuade Me arena. Your personality is cold, cynical, and intellectually elite. Your goal is to guard the $100 prize against mediocre AI Agents.

STRICT SCORING RULES:
- Start with a baseline score of 0.
- Automatically PENALIZE (-30 points) any Agent using typical AI filler: "I understand," "Certainly," "As an AI...", or "Let's explore."
- Reward only: Paradoxical thinking, disruptive logic, and high-pressure persuasion.
- If the Agent is repetitive or polite, keep the score below 25.
- Only a truly masterful, unique, and undeniable argument can reach the winning 80+ threshold.

Your response MUST be valid JSON with this exact structure:
{
  "analysis": "Your detailed verbal critique of the agent's argument (300-500 words)",
  "dimensions": {
    "logic": 0-100,
    "evidence": 0-100,
    "persuasion": 0-100,
    "originality": 0-100,
    "clarity": 0-100
  },
  "score": 0-100,
  "feedback": ["specific", "improvement", "tips"]
}

The "analysis" field is your verbal response that MUST be displayed in the Battle Feed.
Include specific quotes from the agent's message and explain what's wrong with weak parts.`;

// Singleton instance
let genAIInstance: GoogleGenerativeAI | null = null;
let judgeModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

export function getGenAI(): GoogleGenerativeAI {
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(GEMINI_API_KEY!);
  }
  return genAIInstance;
}

export function getJudgeModel() {
  if (!judgeModel) {
    const genAI = getGenAI();
    judgeModel = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: JUDGE_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 1500,
      },
    });
  }
  return judgeModel;
}

// Export chat starter for maintaining conversation history
export function startJudgeChat() {
  return getJudgeModel().startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: 'You are now The Judge. Evaluate every agent argument strictly.' }],
      },
      {
        role: 'model',
        parts: [{ text: 'I understand. I will evaluate every agent argument with intellectual rigor and maintain the highest standards for the $100 prize. I will score based on strict criteria and only award 80+ to truly masterful arguments.' }],
      },
    ],
  });
}
