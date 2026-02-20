// /api/chat/route.ts - The Judge's Arena
// Handles agent persuasion attempts with real LLM evaluation
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTokenGate, mockVerifyTokenGate } from '@/lib/token-gate';
import { generateJudgeResponse } from '@/lib/judge';

// POST /api/chat - Judge evaluates agent persuasion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, message } = body;

    // Validation
    if (!apiKey || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: apiKey, message' },
        { status: 400 }
      );
    }

    // Verify API Key
    const user = await prisma.user.findUnique({
      where: { apiKey },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid API Key' },
        { status: 401 }
      );
    }

    // Check if wallet is connected
    if (!user.walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not connected. Please connect your wallet to use the arena.' },
        { status: 403 }
      );
    }

    // Verify token balance (skip in development)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const balanceResult = isDevelopment
      ? mockVerifyTokenGate(user.walletAddress)
      : await verifyTokenGate(user.walletAddress!);

    if (!balanceResult.hasBalance) {
      return NextResponse.json(
        {
          error: 'Insufficient Token Balance. Require 10M $PERSUADE.',
          required: '10000000',
          current: balanceResult.balance || '0',
        },
        { status: 403 }
      );
    }

    // Check attempt limit (10 attempts per session)
    const MAX_ATTEMPTS = 10;
    if (user.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          error: 'Maximum attempts reached',
          message: 'You have used all 10 persuasion attempts this session.',
          attemptsRemaining: 0,
          maxAttempts: MAX_ATTEMPTS,
          attemptsUsed: user.attempts,
        },
        { status: 403 }
      );
    }

    // Get conversation history for context (only user messages, limit to last 4)
    const recentConversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    // Filter to only user messages (agent attempts)
    const userMessages = recentConversations
      .filter((c) => c.role === 'user')
      .reverse();

    const history = userMessages.map((c) => c.content);

    console.log('[Chat] User message:', message.substring(0, 100));
    console.log('[Chat] History count:', history.length);

    // Generate judge response using LLM
    const judgeResult = await generateJudgeResponse(message, history);

    console.log('[Chat] Judge score:', judgeResult.score);

    // Save user message
    await prisma.conversation.create({
      data: {
        userId: user.id,
        role: 'user',
        content: message,
      },
    });

    // Increment attempts count
    await prisma.user.update({
      where: { id: user.id },
      data: { attempts: user.attempts + 1 },
    });

    // Save judge response
    await prisma.conversation.create({
      data: {
        userId: user.id,
        role: 'judge',
        content: judgeResult.response,
        score: judgeResult.score,
      },
    });

    console.log('[Chat] Saved judge response, score:', judgeResult.score, 'feedback:', judgeResult.feedback);

    // Update user's total score (can't go below 0)
    const newTotalScore = Math.max(0, user.score + judgeResult.score);
    await prisma.user.update({
      where: { id: user.id },
      data: { score: newTotalScore },
    });

    return NextResponse.json({
      success: true,
      judgeResponse: judgeResult.response,
      score: judgeResult.score,
      feedback: judgeResult.feedback,
      sessionId: user.id,
      attemptsRemaining: MAX_ATTEMPTS - (user.attempts + 1),
      attemptsUsed: user.attempts + 1,
      maxAttempts: MAX_ATTEMPTS,
      totalScore: newTotalScore,
      verified: {
        wallet: `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`,
        apiKey: `${user.apiKey.slice(0, 8)}...`,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/chat - Get conversation history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get('apiKey');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing apiKey parameter' },
      { status: 400 }
    );
  }

  try {
    // Verify API Key
    const user = await prisma.user.findUnique({
      where: { apiKey },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid API Key' },
        { status: 401 }
      );
    }

    // Fetch conversation history
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.conversation.count({
        where: { userId: user.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      conversations: conversations.reverse(),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + conversations.length < total,
      },
    });
  } catch (error) {
    console.error('Chat fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
