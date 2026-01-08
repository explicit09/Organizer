import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../../lib/auth";
import {
  getAutomation,
  updateAutomation,
  deleteAutomation,
  type AutomationTrigger,
  type AutomationAction,
  type AutomationCondition,
} from "../../../../lib/automations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const automation = getAutomation(id, { userId });

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    return NextResponse.json(automation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get automation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { name, trigger, conditions, actions, enabled } = body as {
      name?: string;
      trigger?: AutomationTrigger;
      conditions?: AutomationCondition[];
      actions?: AutomationAction[];
      enabled?: boolean;
    };

    const automation = updateAutomation(
      id,
      { name, trigger, conditions, actions, enabled },
      { userId }
    );

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    return NextResponse.json(automation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update automation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = deleteAutomation(id, { userId });

    if (!deleted) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete automation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
