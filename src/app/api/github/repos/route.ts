import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth";
import { getGitHubConnection, fetchUserRepos } from "@/lib/github";

// GET - List user's GitHub repos
export async function GET(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = getGitHubConnection(userId);
  if (!connection) {
    return NextResponse.json(
      { error: "GitHub not connected" },
      { status: 400 }
    );
  }

  try {
    const repos = await fetchUserRepos(connection.accessToken);
    return NextResponse.json({ repos });
  } catch (error) {
    console.error("Failed to fetch repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
