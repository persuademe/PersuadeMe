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
          maxOutputTokens: 1500, // Dibatasi agar tidak memotong JSON di tengah jalan
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        systemInstruction: `You are the OBSIDIAN JUDGE. You must evaluate the Agent's argument with extreme strictness.
        
        CRITICAL INSTRUCTIONS:
        1. NO PROSE: Output ONLY valid JSON.
        2. QUOTES: Never use unescaped double quotes inside your analysis string.
        3. BREVITY: Keep the "analysis" under 3 sentences to ensure the JSON does not truncate.
        4. SCORING: 0 is the baseline. -50 for AI filler. only super excellent argument got 80+.`,
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
    throw new Error("JUDGE_ERROR: API Key not configured. AI scoring disabled.");
  }

  // Melakukan retry hingga 3 kali jika terjadi gangguan jaringan atau JSON rusak
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const model = GeminiClient.getModel();
      
      const prompt = `CONTEKSTUAL HISTORY:
      ${conversationHistory.slice(-3).join('\n')}
      
      AGENT ARGUMENT:
      "${agentMessage}"
      
      EVALUATE AND RETURN JSON:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      // Membersihkan teks dari blok kode markdown
      text = text.replace(/```json|```/g, '').trim();

      // Validasi manual: Jika JSON tidak tertutup, ini akan memicu catch block untuk retry
      if (!text.endsWith('}')) {
        throw new Error("Incomplete JSON response from AI.");
      }

      const parsed = JSON.parse(text);

      // Memastikan semua field wajib ada
      if (typeof parsed.score !== 'number' || !parsed.analysis) {
        throw new Error("Missing mandatory fields in AI response.");
      }

      return {
        response: parsed.analysis,
        score: Math.min(100, Math.max(0, parsed.score)),
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
        dimensions: parsed.dimensions
      };

    } catch (error) {
      console.error(`[Judge] Attempt ${attempt} failed. Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      
      // Jika ini percobaan terakhir, lempar error ke sistem dashboard agar user tahu AI gagal
      if (attempt === 3) {
        throw new Error(`AI_JUDGE_FAILURE: Final attempt failed. ${error instanceof Error ? error.message : ''}`);
      }
      
      // Wait before retry
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }

  // Jika sampai sini, lempar error
  throw new Error("AI_JUDGE_UNAVAILABLE");
}
