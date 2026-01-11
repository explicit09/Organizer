import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth";
import {
  createTrackedRepo,
  getActiveTrackedRepos,
  getTrackedReposForItem,
  deleteTrackedRepo,
  updateTrackedRepo,
} from "@/lib/github";

// GET - List tracked repos (optionally filtered by itemId)
export async function GET(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  try {
    const repos = itemId
      ? getTrackedReposForItem(itemId, userId)
      : getActiveTrackedRepos(userId);

    return NextResponse.json({ repos });
  } catch (error) {
    console.error("Failed to fetch tracked repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracked repos" },
      { status: 500 }
    );
  }
}

// POST - Track a new repo
export async function POST(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { itemId, repoOwner, repoName, branch, trackingCriteria } = body;

    if (!itemId || !repoOwner || !repoName) {
      return NextResponse.json(
        { error: "itemId, repoOwner, and repoName are required" },
        { status: 400 }
      );
    }

    const repo = createTrackedRepo(userId, {
      itemId,
      repoOwner,
      repoName,
      branch,
      trackingCriteria,
    });

    return NextResponse.json({ repo }, { status: 201 });
  } catch (error) {
    console.error("Failed to create tracked repo:", error);
    return NextResponse.json(
      { error: "Failed to track repository" },
      { status: 500 }
    );
  }
}

// PATCH - Update a tracked repo
export async function PATCH(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, trackingCriteria } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Tracked repo id is required" },
        { status: 400 }
      );
    }

    const repo = updateTrackedRepo(id, userId, {
      status,
      trackingCriteria,
    });

    if (!repo) {
      return NextResponse.json(
        { error: "Tracked repo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ repo });
  } catch (error) {
    console.error("Failed to update tracked repo:", error);
    return NextResponse.json(
      { error: "Failed to update tracked repo" },
      { status: 500 }
    );
  }
}

// DELETE - Stop tracking a repo
export async function DELETE(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Tracked repo id is required" },
      { status: 400 }
    );
  }

  const deleted = deleteTrackedRepo(id, userId);
  
  if (!deleted) {
    return NextResponse.json(
      { error: "Tracked repo not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ deleted: true });
}
