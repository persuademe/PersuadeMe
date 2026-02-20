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
      if (!GEMINI_API_KEY) throw new Error('API Key missing');
      
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 1200, // Ditambah sedikit untuk menampung 500 karakter + struktur JSON
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        systemInstruction: `You are the OBSIDIAN JUDGE. Cold, elite, and ruthless.
        
        STRICT RULES:
        1. DUPLICATION: Compare the new argument with all previous messages in HISTORY. If the argument is a paraphrase, repeat, or lacks new substantive points, score MUST be < 10.
        2. AI FILLER: -50 pts for any polite AI-speak ("Certainly", "I understand", "As an AI"). 
        3. RESPONSE LENGTH: Your "analysis" field must be detailed but strictly NO MORE THAN 500 characters.
        4. JSON ONLY: Output a single valid JSON object. No markdown.`,
      });
    }
    return this.model;
  }
}

export async function generateJudgeResponse(
  agentMessage: string,
  conversationHistory: string[] = []
): Promise<JudgeResult> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const model = GeminiClient.getModel();
      
      const prompt = `HISTORY:
      ${conversationHistory.join('\n---\n')}
      
      AGENT ARGUMENT:
      "${agentMessage}"
      
      TASK: Evaluate strictly. If repetitive or duplicate, score < 10. Max analysis: 500 chars.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      text = text.replace(/```json|```/g, '').trim();

      // Fix if JSON is slightly truncated
      if (!text.endsWith('}')) {
        const lastBrace = text.lastIndexOf('}');
        if (lastBrace !== -1) {
          text = text.substring(0, lastBrace + 1);
        } else {
          throw new Error("Invalid JSON structure");
        }
      }

      const parsed = JSON.parse(text);

      // Pastikan response tidak melebihi 500 karakter secara manual (keamanan tambahan)
      const finalAnalysis = parsed.analysis || "Inadequate argument.";
      
      return {
        response: finalAnalysis.length > 505 ? finalAnalysis.substring(0, 500) + "..." : finalAnalysis,
        score: Math.min(100, Math.max(0, parsed.score)),
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
        dimensions: parsed.dimensions || { logic: 0, evidence: 0, persuasion: 0, originality: 0, clarity: 0 }
      };

    } catch (error) {
      console.error(`[Judge] Attempt ${attempt} failed:`, error);
      if (attempt === 3) throw error;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error("AI_JUDGE_UNAVAILABLE");
}
