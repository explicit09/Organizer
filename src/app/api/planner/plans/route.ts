import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../../lib/auth";
import {
  createPlan,
  getPlan,
  listPlans,
  updatePlan,
  deletePlan,
  calculatePlanProgress,
  type PlanStatus,
  type PlanMode,
} from "../../../../lib/plans";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const userId = session ? getSessionUserId(session) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as PlanStatus | null;
    const mode = searchParams.get("mode") as PlanMode | null;
    const id = searchParams.get("id");

    // Get single plan by ID
    if (id) {
      const plan = getPlan(id, { userId });
      if (!plan) {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }
      const progress = calculatePlanProgress(plan);
      return NextResponse.json({ plan: { ...plan, progress } });
    }

    // List plans with filters
    const plans = listPlans(
      {
        status: status || undefined,
        mode: mode || undefined,
      },
      { userId }
    );

    return NextResponse.json({
      plans: plans.map((plan) => {
        const progress = calculatePlanProgress(plan);
        return {
          id: plan.id,
          title: plan.title,
          mode: plan.mode,
          status: plan.status,
          stepsCompleted: progress.completedSteps,
          totalSteps: progress.totalSteps,
          percentage: progress.percentage,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        };
      }),
    });
  } catch (error) {
    console.error("Error listing plans:", error);
    return NextResponse.json({ error: "Failed to list plans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const userId = session ? getSessionUserId(session) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const plan = createPlan(body, { userId });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Error creating plan:", error);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const userId = session ? getSessionUserId(session) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const plan = updatePlan(id, updates, { userId });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const userId = session ? getSessionUserId(session) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const deleted = deletePlan(id, { userId });
    if (!deleted) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
