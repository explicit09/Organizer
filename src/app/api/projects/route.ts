import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { createProject, listProjects } from "../../../lib/projects";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const projects = listProjects({ userId });
  return NextResponse.json({ projects }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const project = createProject(body, { userId });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
