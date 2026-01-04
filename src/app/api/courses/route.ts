import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { createCourse, listCourses } from "../../../lib/courses";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const courses = listCourses({ userId });
  return NextResponse.json({ courses }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const course = createCourse(body, { userId });
    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create course";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
