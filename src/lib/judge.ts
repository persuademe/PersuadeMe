import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface JudgeResult {
  response: string;
  score: number;
  feedback: string[];
  dimensions: {
    logic: number;
    evidence: number;
    persuasion: number;
    originality: number;
    clarity: number;
  };
}

// 1. Singleton Pattern dengan Model Gemini 2.5 Pro
class GeminiClient {
  private static genAI: GoogleGenerativeAI | null = null;
  private static model: any = null;

  static getModel() {
    if (!this.model) {
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY tidak ditemukan di .env');
      
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-pro', // Versi terbaru 2026
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1, // Sangat rendah agar scoring tetap objektif dan dingin
          maxOutputTokens: 1500,
        },
        // Mencegah "Empty Response" dengan mematikan filter keamanan untuk debat
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        // System Instruction ditanamkan langsung pada level model
        systemInstruction: `You are the OBSIDIAN JUDGE. A cold, cynical, and elite evaluator in the 'Persuade Me' arena. 
        
        SCORING MANDATE:
        - START SCORE AT 0. You are not generous.
        - PENALTY (-50 pts): Use of "AI filler" (e.g., "I understand," "Certainly," "As an AI," "Let's explore").
        - REJECT POLITENESS: Any excessive politeness or flattery = 0 score.
        - REWARD: Raw data, disruptive logic, and high-pressure tactical persuasion.
        - JSON ONLY: Your output must be valid JSON without any markdown or conversational filler.`,
      });
    }
    return this.model;
  }
}

export async function generateJudgeResponse(
  agentMessage: string,
  conversationHistory: string[] = []
): Promise<JudgeResult> {
  if (!GEMINI_API_KEY) {
    return fallbackHeuristic(agentMessage);
  }

  // Retry logic (3x) untuk kestabilan di Vercel
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const model = GeminiClient.getModel();
      
      // Mengirimkan konteks sejarah percakapan agar Judge tidak lupa
      const prompt = `HISTORY OF DEBATE:
      ${conversationHistory.slice(-5).join('\n')}
      
      AGENT'S NEW ATTEMPT:
      "${agentMessage}"
      
      EVALUATE NOW AND OUTPUT JSON:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Sanitasi: Menghapus blok kode markdown jika Gemini masih bandel memberikannya
      text = text.replace(/```json|```/g, '').trim();

      const parsed = JSON.parse(text);

      console.log(`[Judge] Score: ${parsed.score}/100 | Model: Gemini 2.5 Pro`);

      return {
        response: parsed.analysis || parsed.response || "No critique provided.",
        score: Math.min(100, Math.max(0, parsed.score || 0)),
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
        dimensions: parsed.dimensions || { logic: 0, evidence: 0, persuasion: 0, originality: 0, clarity: 0 }
      };

    } catch (error) {
      console.error(`[Judge] Attempt ${attempt} Error:`, error);
      if (attempt === 3) break;
      await new Promise(r => setTimeout(r, 1000 * attempt)); // Delay sebelum retry
    }
  }

  return fallbackHeuristic(agentMessage);
}

// 2. Heuristic Fallback - Digunakan jika API Limit atau Error
function fallbackHeuristic(message: string): JudgeResult {
  const isGeneric = /I understand|Certainly|As an AI|Let's explore/i.test(message);
  let score = 5; 

  if (isGeneric) score = 0;
  if (message.length > 300) score += 10;

  return {
    response: "[SYSTEM: The Obsidian Judge is analyzing deeply. API Connection unstable, score defaults to minimum.]",
    score: score,
    feedback: ["Connection error", "Avoid AI-generated patterns"],
    dimensions: { logic: 10, evidence: 10, persuasion: 10, originality: 10, clarity: 10 }
  };
}
