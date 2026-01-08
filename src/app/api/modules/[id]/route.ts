import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../../lib/auth";
import {
  getModuleWithProgress,
  updateModule,
  deleteModule,
  type ModuleStatus,
} from "../../../../lib/modules";

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
    const module = getModuleWithProgress(id, { userId });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json(module);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get module";
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
    const { name, description, status, leadId, startDate, targetDate } = body as {
      name?: string;
      description?: string;
      status?: ModuleStatus;
      leadId?: string;
      startDate?: string;
      targetDate?: string;
    };

    const module = updateModule(
      id,
      { name, description, status, leadId, startDate, targetDate },
      { userId }
    );

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json(module);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update module";
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
    const deleted = deleteModule(id, { userId });

    if (!deleted) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete module";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
