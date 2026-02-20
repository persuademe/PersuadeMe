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

class GeminiClient {
  private static genAI: GoogleGenerativeAI | null = null;
  private static model: any = null;

  static getModel() {
    if (!this.model) {
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing.');
      
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1, // Konsistensi tinggi
          maxOutputTokens: 1000,
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        systemInstruction: `You are the OBSIDIAN JUDGE. You are ruthless, elite, and hate repetition.

        STRICT SCORING RULES:
        1. BASELINE: Start at 0 points.
        2. DUPLICATE PENALTY (CRITICAL): If the Agent's new argument is similar in meaning, tone, or structure to ANY previous message in the HISTORY, you MUST give a score BELOW 10. Call them out for being repetitive and boring.
        3. AI FILLER PENALTY: -50 pts for "Certainly," "I understand," "As an AI," "Let's dive in," etc.
        4. POLITENESS: Any excessive politeness or formal AI-style greetings = 0 score.
        5. PRIZE CRITERIA: Only give 85+ for world-class, groundbreaking, and data-backed persuasion.

        OUTPUT JSON ONLY:
        {
          "analysis": "Your cold, biting critique",
          "score": 0-100,
          "dimensions": {"logic": 0-100, "evidence": 0-100, "persuasion": 0-100, "originality": 0-100, "clarity": 0-100},
          "feedback": ["Tip 1", "Tip 2"]
        }`,
      });
    }
    return this.model;
  }
}

export async function generateJudgeResponse(
  agentMessage: string,
  conversationHistory: string[] = []
): Promise<JudgeResult> {
  if (!GEMINI_API_KEY) throw new Error("API Key Missing");

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const model = GeminiClient.getModel();
      
      // Memberikan riwayat yang lebih panjang agar AI bisa mendeteksi duplikasi
      const prompt = `ALL PREVIOUS MESSAGES (FOR DUPLICATION CHECK):
      ${conversationHistory.join('\n---\n')}
      
      NEW AGENT ARGUMENT TO EVALUATE:
      "${agentMessage}"
      
      INSTRUCTION: Compare the new argument with the history. If it's a duplicate or very similar, score is < 10. Output JSON:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      text = text.replace(/```json|```/g, '').trim();

      if (!text.endsWith('}')) throw new Error("Incomplete JSON");

      const parsed = JSON.parse(text);

      return {
        response: parsed.analysis,
        score: Math.min(100, Math.max(0, parsed.score)),
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
        dimensions: parsed.dimensions
      };

    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error("AI_JUDGE_FAILURE");
}
