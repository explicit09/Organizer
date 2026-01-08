import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  createAutomation,
  listAutomations,
  type AutomationTrigger,
  type AutomationAction,
  type AutomationCondition,
} from "../../../lib/automations";

export async function GET(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const automations = listAutomations({ userId });
    return NextResponse.json({ automations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list automations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, trigger, conditions, actions } = body as {
      name: string;
      trigger: AutomationTrigger;
      conditions?: AutomationCondition[];
      actions: AutomationAction[];
    };

    if (!name || !trigger || !actions || actions.length === 0) {
      return NextResponse.json(
        { error: "Name, trigger, and at least one action are required" },
        { status: 400 }
      );
    }

    const automation = createAutomation(
      { name, trigger, conditions, actions },
      { userId }
    );

    return NextResponse.json(automation, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create automation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
