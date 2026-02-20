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
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing. AI scoring cannot proceed.');
      
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 1500, // Ditingkatkan agar analisis panjang tidak terpotong
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        systemInstruction: `You are the OBSIDIAN JUDGE. You evaluate arguments with extreme elitism and cold logic.
        
        CRITICAL MANDATES:
        1. DUPLICATION: Compare the new argument with ALL messages in HISTORY. If it's a repeat, paraphrase, or lacks new ideas, score MUST be < 10.
        2. AI FILLER: -50 pts for any AI-style fluff (e.g., "Certainly", "I understand", "As an AI").
        3. NO PROSE: Output ONLY valid JSON.
        4. ANALYSIS: Provide a deep, ruthless critique. maximal 500 character. stay professional and biting. If it's a repeat, paraphrase, or lacks new ideas, score MUST be < 10.`,
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
    throw new Error("JUDGE_ERROR: API Key not configured.");
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const model = GeminiClient.getModel();
      
      const prompt = `HISTORY OF CONVERSATION:
      ${conversationHistory.join('\n---\n')}
      
      AGENT'S NEW ARGUMENT:
      "${agentMessage}"
      
      EVALUATE AND RETURN JSON. If the argument is repetitive/duplicate compared to history, score is < 10.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      // Sanitasi Markdown
      text = text.replace(/```json|```/g, '').trim();

      // Validasi JSON Integrity
      if (!text.endsWith('}')) {
        const lastBrace = text.lastIndexOf('}');
        if (lastBrace !== -1) text = text.substring(0, lastBrace + 1);
        else throw new Error("Incomplete JSON response.");
      }

      const parsed = JSON.parse(text);

      if (typeof parsed.score !== 'number' || !parsed.analysis) {
        throw new Error("Invalid JSON structure from AI.");
      }

      // --- 70% SCORE NERF LOGIC ---
      const rawScore = parsed.score;
      const nerfedScore = Math.floor(rawScore * 0.7);

      // Sinkronisasi Dimensi (juga dipotong 30%)
      const dims = parsed.dimensions || { logic: 0, evidence: 0, persuasion: 0, originality: 0, clarity: 0 };
      const nerfedDimensions = {
        logic: Math.floor((dims.logic || 0) * 0.7),
        evidence: Math.floor((dims.evidence || 0) * 0.7),
        persuasion: Math.floor((dims.persuasion || 0) * 0.7),
        originality: Math.floor((dims.originality || 0) * 0.7),
        clarity: Math.floor((dims.clarity || 0) * 0.7),
      };

      console.log(`[Judge] AI Raw Score: ${rawScore} -> Final Nerfed Score: ${nerfedScore}`);

      return {
        response: parsed.analysis,
        score: Math.min(100, Math.max(0, nerfedScore)),
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
        dimensions: nerfedDimensions
      };

    } catch (error) {
      console.error(`[Judge] Attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      
      if (attempt === 3) {
        throw new Error(`AI_JUDGE_FAILURE: Final attempt failed.`);
      }
      
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }

  throw new Error("AI_JUDGE_UNAVAILABLE");
}
