import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth";
import {
  getGitHubConnection,
  saveGitHubConnection,
  removeGitHubConnection,
} from "@/lib/github";

// GET - Get GitHub connection status
export async function GET(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = getGitHubConnection(userId);
  
  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    username: connection.username,
    avatarUrl: connection.avatarUrl,
    connectedAt: connection.createdAt,
  });
}

// POST - Connect GitHub account (using personal access token for simplicity)
export async function POST(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    // Verify the token by fetching user info
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Invalid GitHub access token" },
        { status: 400 }
      );
    }

    const userData = await response.json();
    
    const connection = saveGitHubConnection(
      userId,
      accessToken,
      userData.login,
      userData.avatar_url
    );

    return NextResponse.json({
      connected: true,
      username: connection.username,
      avatarUrl: connection.avatarUrl,
    });
  } catch (error) {
    console.error("GitHub connection error:", error);
    return NextResponse.json(
      { error: "Failed to connect GitHub account" },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect GitHub account
export async function DELETE(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const removed = removeGitHubConnection(userId);
  
  return NextResponse.json({ disconnected: removed });
}
