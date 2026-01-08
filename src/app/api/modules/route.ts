import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  createModule,
  listModules,
  listModulesWithProgress,
} from "../../../lib/modules";

export async function GET(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const withProgress = url.searchParams.get("withProgress") === "true";

    if (withProgress) {
      const modules = listModulesWithProgress({
        userId,
        projectId: projectId ?? undefined,
      });
      return NextResponse.json({ modules });
    }

    const modules = listModules({
      userId,
      projectId: projectId ?? undefined,
    });

    return NextResponse.json({ modules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list modules";
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
    const { name, projectId, description, leadId, startDate, targetDate } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const module = createModule(
      { name, projectId, description, leadId, startDate, targetDate },
      { userId }
    );

    return NextResponse.json(module, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create module";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
