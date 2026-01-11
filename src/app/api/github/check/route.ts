import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth";
import {
  runDailyCheck,
  createFollowUpNotifications,
  getGitHubConnection,
  fetchRepoActivity,
  evaluateCriteria,
  getTrackedRepo,
} from "@/lib/github";

// GET - Run daily check for all tracked repos
export async function GET(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runDailyCheck(userId);
    
    // Create notifications for repos that need follow-up
    const needsFollowUp = results.filter(r => r.needsFollowUp);
    if (needsFollowUp.length > 0) {
      await createFollowUpNotifications(needsFollowUp);
    }

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        withActivity: results.filter(r => r.hasActivity).length,
        needsFollowUp: needsFollowUp.length,
        completed: results.filter(r => r.meetsCriteria).length,
      },
    });
  } catch (error) {
    console.error("Daily check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Daily check failed" },
      { status: 500 }
    );
  }
}

// POST - Check a specific tracked repo
export async function POST(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { repoId } = body;

    if (!repoId) {
      return NextResponse.json(
        { error: "repoId is required" },
        { status: 400 }
      );
    }

    const connection = getGitHubConnection(userId);
    if (!connection) {
      return NextResponse.json(
        { error: "GitHub not connected" },
        { status: 400 }
      );
    }

    const trackedRepo = getTrackedRepo(repoId, userId);
    if (!trackedRepo) {
      return NextResponse.json(
        { error: "Tracked repo not found" },
        { status: 404 }
      );
    }

    const activity = await fetchRepoActivity(
      connection.accessToken,
      trackedRepo.repoOwner,
      trackedRepo.repoName,
      trackedRepo.lastCheckedAt,
      trackedRepo.branch
    );

    const meetsCriteria = evaluateCriteria(activity, trackedRepo.trackingCriteria);
    activity.meetsCriteria = meetsCriteria;

    return NextResponse.json({
      activity,
      meetsCriteria,
      hasActivity: activity.hasActivity,
    });
  } catch (error) {
    console.error("Repo check error:", error);
    return NextResponse.json(
      { error: "Failed to check repository" },
      { status: 500 }
    );
  }
}
