import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../../lib/auth";
import { deleteDependency } from "../../../../lib/dependencies";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = deleteDependency(id, { userId });

  if (!deleted) {
    return NextResponse.json({ error: "Dependency not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
