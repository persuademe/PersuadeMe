import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/auth - Handle user creation/lookup on login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { walletAddress, email, agentName } = body;

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: "Missing required field: email" },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase();

    // Handle wallet address - "pending" or empty means no wallet yet
    const hasWallet = walletAddress && walletAddress !== "" && walletAddress !== "pending";
    const normalizedWallet = hasWallet ? walletAddress.toLowerCase() : null;

    // Check if user exists by email first
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUserByEmail) {
      // User exists - update wallet if new one is provided
      if (hasWallet && !existingUserByEmail.walletAddress) {
        const updatedUser = await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            walletAddress: normalizedWallet,
            lastLogin: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          user: {
            id: updatedUser.id,
            walletAddress: updatedUser.walletAddress,
            email: updatedUser.email,
            agentName: updatedUser.agentName,
            apiKey: updatedUser.apiKey,
            score: updatedUser.score,
          attempts: updatedUser.attempts || 0,
            attempts: updatedUser.attempts || 0,
            lastLogin: updatedUser.lastLogin,
            createdAt: updatedUser.createdAt,
          },
          isNewUser: false,
          message: "Wallet connected successfully",
        });
      }

      // Return existing user
      return NextResponse.json({
        success: true,
        user: {
          id: existingUserByEmail.id,
          walletAddress: existingUserByEmail.walletAddress,
          email: existingUserByEmail.email,
          agentName: existingUserByEmail.agentName,
          apiKey: existingUserByEmail.apiKey,
          score: existingUserByEmail.score,
          attempts: existingUserByEmail.attempts || 0,
          lastLogin: existingUserByEmail.lastLogin,
          createdAt: existingUserByEmail.createdAt,
        },
        isNewUser: false,
        message: existingUserByEmail.walletAddress 
          ? "User logged in successfully" 
          : "User exists - please connect wallet to continue",
      });
    }

    // Check if user exists by wallet
    if (hasWallet) {
      const existingUserByWallet = await prisma.user.findUnique({
        where: { walletAddress: normalizedWallet! },
      });

      if (existingUserByWallet) {
        const updatedUser = await prisma.user.update({
          where: { id: existingUserByWallet.id },
          data: {
            email: normalizedEmail,
            lastLogin: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          user: {
            id: updatedUser.id,
            walletAddress: updatedUser.walletAddress,
            email: updatedUser.email,
            agentName: updatedUser.agentName,
            apiKey: updatedUser.apiKey,
            score: updatedUser.score,
          attempts: updatedUser.attempts || 0,
            attempts: updatedUser.attempts || 0,
            lastLogin: updatedUser.lastLogin,
            createdAt: updatedUser.createdAt,
          },
          isNewUser: false,
          message: "User logged in successfully",
        });
      }
    }

    // Create new user (agentName is optional at signup)
    const newUser = await prisma.user.create({
      data: {
        walletAddress: normalizedWallet,
        email: normalizedEmail,
        agentName: agentName || null,
        // apiKey is auto-generated
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        walletAddress: newUser.walletAddress,
        email: newUser.email,
        agentName: newUser.agentName,
        apiKey: newUser.apiKey,
        score: newUser.score,
          attempts: newUser.attempts || 0,
        lastLogin: newUser.lastLogin,
        createdAt: newUser.createdAt,
      },
      isNewUser: true,
      message: hasWallet 
        ? "New user created successfully" 
        : "Account created - please connect wallet to continue",
    });
  } catch (error: any) {
    console.error("Auth error:", error);
    
    return NextResponse.json(
      { 
        error: "Authentication failed",
        details: error.message || String(error),
        code: error.code || 'UNKNOWN'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/auth - Update user profile (agentName)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, agentName } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API key" },
        { status: 400 }
      );
    }

    if (!agentName || agentName.trim().length < 3) {
      return NextResponse.json(
        { error: "Agent name must be at least 3 characters" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { apiKey },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if agent name is already taken
    const existingAgent = await prisma.user.findFirst({
      where: { 
        agentName: { equals: agentName.trim(), mode: 'insensitive' },
        NOT: { id: user.id }
      },
    });

    if (existingAgent) {
      return NextResponse.json(
        { error: "Agent name is already taken" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        agentName: agentName.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        walletAddress: updatedUser.walletAddress,
        email: updatedUser.email,
        agentName: updatedUser.agentName,
        apiKey: updatedUser.apiKey,
        score: updatedUser.score,
          attempts: updatedUser.attempts || 0,
            attempts: updatedUser.attempts || 0,
        lastLogin: updatedUser.lastLogin,
        createdAt: updatedUser.createdAt,
      },
      message: "Agent name updated successfully",
    });
  } catch (error: any) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}

// GET /api/auth - Get user by wallet or email
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get("walletAddress");
  const email = searchParams.get("email");
  const apiKey = searchParams.get("apiKey");

  try {
    let user;

    if (apiKey) {
      user = await prisma.user.findUnique({
        where: { apiKey },
      });
    } else if (walletAddress) {
      user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });
    } else if (email) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } else {
      return NextResponse.json(
        { error: "Missing search parameter: walletAddress, email, or apiKey" },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        agentName: user.agentName,
        apiKey: user.apiKey,
        score: user.score,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("User lookup error:", error);
    return NextResponse.json(
      { error: "User lookup failed" },
      { status: 500 }
    );
  }
}
