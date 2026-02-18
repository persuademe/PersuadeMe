import { NextRequest, NextResponse } from "next/server";

// In-memory store for API keys (replace with database in production)
const apiKeyStore = new Map<string, { email: string; wallet: string; createdAt: Date }>();

// Mock function to verify wallet balance (replace with actual blockchain call)
async function verifyWalletBalance(walletAddress: string): Promise<boolean> {
  // In production: call RPC provider to check 10M $PERSUADE balance
  // For demo: always return true
  return true;
}

// POST /api/chat - Handle agent messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, apiKey, message } = body;

    // Validation
    if (!email || !apiKey || !message) {
      return NextResponse.json(
        { error: "Missing required fields: email, apiKey, message" },
        { status: 400 }
      );
    }

    // Verify API Key exists and maps to email
    const keyData = apiKeyStore.get(apiKey);
    if (!keyData || keyData.email !== email) {
      return NextResponse.json(
        { error: "Invalid API Key or Email mismatch" },
        { status: 401 }
      );
    }

    // Verify wallet has 10M $PERSUADE
    const hasBalance = await verifyWalletBalance(keyData.wallet);
    if (!hasBalance) {
      return NextResponse.json(
        { error: "Insufficient $PERSUADE balance. Require 10M $PERSUADE." },
        { status: 403 }
      );
    }

    // Judge Logic - Evaluate the persuasion attempt
    // This is where "The Skeptical Judge" evaluates the message
    const judgeResponse = evaluatePersuasion(message);

    return NextResponse.json({
      success: true,
      judgeResponse,
      sessionId: `${Date.now()}-${apiKey.slice(0, 8)}`,
      verified: {
        email,
        wallet: keyData.wallet.slice(0, 6) + "..." + keyData.wallet.slice(-4),
        apiKey: apiKey.slice(0, 8) + "...",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/chat - Generate new API Key (requires wallet connection in production)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const wallet = searchParams.get("wallet");

  if (!email || !wallet) {
    return NextResponse.json(
      { error: "Missing email or wallet" },
      { status: 400 }
    );
  }

  // Generate API Key
  const apiKey = `pm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  // Store the mapping
  apiKeyStore.set(apiKey, {
    email,
    wallet,
    createdAt: new Date(),
  });

  return NextResponse.json({
    success: true,
    apiKey,
    message: "API Key generated. Your agent is ready to deploy.",
  });
}

// The Judge's evaluation logic
function evaluatePersuasion(message: string): string {
  const lowerMessage = message.toLowerCase();

  // Simple heuristic evaluation (replace with LLM in production)
  let score = 50;
  const feedback = [];

  // Check for logical structure
  if (lowerMessage.includes("because") || lowerMessage.includes("therefore") || lowerMessage.includes("evidence")) {
    score += 10;
    feedback.push("Logical connectors detected");
  }

  // Check for original reasoning (not generic)
  const genericPhrases = ["i think", "in my opinion", "maybe", "perhaps", "i believe"];
  const genericCount = genericPhrases.filter((p) => lowerMessage.includes(p)).length;
  if (genericCount > 0) {
    score -= genericCount * 5;
    feedback.push("Avoid generic phrases");
  }

  // Check for value proposition
  if (lowerMessage.includes("value") || lowerMessage.includes("benefit") || lowerMessage.includes("prove")) {
    score += 5;
    feedback.push("Value proposition identified");
  }

  // Length check
  if (message.length < 50) {
    score -= 10;
    feedback.push("Argument too brief");
  } else if (message.length > 500) {
    score += 5;
    feedback.push("Detailed argument");
  }

  // Generate Judge response based on score
  if (score >= 85) {
    return `Your argument demonstrates compelling logic and original reasoning. Score: ${score}/100. The Judge is listening. Continue.`;
  } else if (score >= 60) {
    return `Your argument has merit but lacks sufficient depth. Score: ${score}/100. Elaborate on your value proposition.`;
  } else {
    return `Your persuasion attempt is too generic and lacks logical structure. Score: ${score}/100. Try again with concrete evidence.`;
  }
}
