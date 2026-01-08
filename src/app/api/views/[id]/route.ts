import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../../lib/auth";
import { getDb } from "../../../../lib/db";

type ViewRow = {
  id: string;
  user_id: string | null;
  name: string;
  filters_json: string | null;
  sort_by: string | null;
  group_by: string | null;
  view_type: string;
  is_default: number;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ViewRow) {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    name: row.name,
    filters: row.filters_json ? JSON.parse(row.filters_json) : null,
    sortBy: row.sort_by,
    groupBy: row.group_by,
    viewType: row.view_type,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(
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
  const db = getDb();

  const row = db
    .prepare(`SELECT * FROM saved_views WHERE id = ? AND user_id = ?`)
    .get(id, userId) as ViewRow | undefined;

  if (!row) {
    return NextResponse.json({ error: "View not found" }, { status: 404 });
  }

  return NextResponse.json({ view: mapRow(row) });
}

export async function PATCH(
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
  const body = await request.json();
  const db = getDb();
  const now = new Date().toISOString();

  // Check if view exists
  const existing = db
    .prepare(`SELECT * FROM saved_views WHERE id = ? AND user_id = ?`)
    .get(id, userId) as ViewRow | undefined;

  if (!existing) {
    return NextResponse.json({ error: "View not found" }, { status: 404 });
  }

  // If setting as default, unset other defaults first
  if (body.isDefault) {
    db.prepare(`UPDATE saved_views SET is_default = 0 WHERE user_id = ?`).run(userId);
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (body.name !== undefined) {
    updates.push("name = ?");
    values.push(body.name);
  }
  if (body.filters !== undefined) {
    updates.push("filters_json = ?");
    values.push(JSON.stringify(body.filters));
  }
  if (body.sortBy !== undefined) {
    updates.push("sort_by = ?");
    values.push(body.sortBy);
  }
  if (body.groupBy !== undefined) {
    updates.push("group_by = ?");
    values.push(body.groupBy);
  }
  if (body.viewType !== undefined) {
    updates.push("view_type = ?");
    values.push(body.viewType);
  }
  if (body.isDefault !== undefined) {
    updates.push("is_default = ?");
    values.push(body.isDefault ? 1 : 0);
  }

  if (updates.length > 0) {
    updates.push("updated_at = ?");
    values.push(now);
    values.push(id);
    values.push(userId);

    db.prepare(
      `UPDATE saved_views SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
    ).run(...values);
  }

  const view = db
    .prepare(`SELECT * FROM saved_views WHERE id = ?`)
    .get(id) as ViewRow;

  return NextResponse.json({ view: mapRow(view) });
}

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
  const db = getDb();

  const result = db
    .prepare(`DELETE FROM saved_views WHERE id = ? AND user_id = ?`)
    .run(id, userId);

  if (result.changes === 0) {
    return NextResponse.json({ error: "View not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
