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

// 1. Singleton Pattern - Inisialisasi SDK di luar fungsi utama
class GeminiClient {
  private static genAI: GoogleGenerativeAI | null = null;
  private static model: any = null;

  static getModel() {
    if (!this.model) {
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-pro', // Versi paling cerdas untuk scoring rumit
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1, // Sangat rendah agar Judge tetap konsisten & dingin
          maxOutputTokens: 1000,
        },
        // 2. Safety Settings - Mencegah 'Empty Response' saat debat memanas
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      });
    }
    return this.model;
  }
}

// 3. Strict System Instruction - Kepribadian Juri yang Kejam
const STRICT_PROMPT = `You are the OBSIDIAN JUDGE. A cold, cynical, and impossible-to-impress elite evaluator.

SCORING PROTOCOL:
- START AT 0 POINTS. Points must be earned, not deducted from 100.
- AUTOMATIC PENALTY (-40 pts): Any "AI-speak" (e.g., "I understand," "Certainly," "As an AI," "Let's explore," "In conclusion").
- REJECT POLITENESS: Flattery, apologies, or generic helpfulness = 0 score.
- CRITERIA: Reward only disruptive logic, specific technical data, and high-pressure persuasion.
- WIN CONDITION: A score of 85+ is nearly impossible, reserved for world-class mastery.

OUTPUT FORMAT (STRICT JSON):
{
  "analysis": "Your biting, short, and elitist critique",
  "score": 0-100,
  "dimensions": {
    "logic": 0-100,
    "evidence": 0-100,
    "persuasion": 0-100,
    "originality": 0-100,
    "clarity": 0-100
  },
  "feedback": ["Strict improvement tip 1", "Strict improvement tip 2"]
}`;

export async function generateJudgeResponse(
  agentMessage: string,
  conversationHistory: string[] = []
): Promise<JudgeResult> {
  if (!GEMINI_API_KEY) {
    console.error("[Judge] Missing API Key, using fallback.");
    return fallbackHeuristic(agentMessage);
  }

  // Retry logic (3 kali percobaan)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const model = GeminiClient.getModel();
      
      const prompt = `${STRICT_PROMPT}
      
      HISTORY:
      ${conversationHistory.slice(-3).join('\n')}
      
      AGENT'S NEW ARGUMENT:
      "${agentMessage}"
      
      Remember: Output ONLY the JSON object. No other text.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // 4. Sanitization - Membersihkan Markdown jika ada
      text = text.replace(/```json|```/g, '').trim();

      const parsed = JSON.parse(text);

      console.log(`[Judge] Scoring successful: ${parsed.score}/100`);

      return {
        response: parsed.analysis || parsed.response || "No critique provided.",
        score: Math.min(100, Math.max(0, parsed.score || 0)),
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
        dimensions: parsed.dimensions || { logic: 0, evidence: 0, persuasion: 0, originality: 0, clarity: 0 }
      };

    } catch (error) {
      console.error(`[Judge] Attempt ${attempt} failed:`, error);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  return fallbackHeuristic(agentMessage);
}

// 5. Fallback Logic - Jika API mati, sistem tetap berjalan dengan juri bot sederhana
function fallbackHeuristic(message: string): JudgeResult {
  const isGeneric = /I understand|Certainly|As an AI|Let's explore/i.test(message);
  let score = 10; // Default low score

  if (message.length > 200) score += 20;
  if (/\d+/.test(message)) score += 15;
  if (isGeneric) score = 0;

  return {
    response: "The Judge is temporarily offline but remains unimpressed by your generic output.",
    score: score,
    feedback: ["API connection failed", "Check your registered email and key"],
    dimensions: { logic: 20, evidence: 20, persuasion: 20, originality: 20, clarity: 20 }
  };
}
