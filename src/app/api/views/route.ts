import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../lib/auth";
import { getDb } from "../../../lib/db";
import { randomUUID } from "node:crypto";

export type ViewType = "list" | "board" | "calendar" | "table";

export type SavedView = {
  id: string;
  userId: string;
  name: string;
  filters: Record<string, unknown> | null;
  sortBy: string | null;
  groupBy: string | null;
  viewType: ViewType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

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

function mapRow(row: ViewRow): SavedView {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    name: row.name,
    filters: row.filters_json ? JSON.parse(row.filters_json) : null,
    sortBy: row.sort_by,
    groupBy: row.group_by,
    viewType: row.view_type as ViewType,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const defaultOnly = searchParams.get("default") === "true";

  if (defaultOnly) {
    const row = db
      .prepare(`SELECT * FROM saved_views WHERE user_id = ? AND is_default = 1 LIMIT 1`)
      .get(userId) as ViewRow | undefined;
    return NextResponse.json({ view: row ? mapRow(row) : null });
  }

  const rows = db
    .prepare(`SELECT * FROM saved_views WHERE user_id = ? ORDER BY name ASC`)
    .all(userId) as ViewRow[];

  return NextResponse.json({ views: rows.map(mapRow) });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  // If this view is set as default, unset other defaults
  if (body.isDefault) {
    db.prepare(`UPDATE saved_views SET is_default = 0 WHERE user_id = ?`).run(userId);
  }

  db.prepare(
    `INSERT INTO saved_views (id, user_id, name, filters_json, sort_by, group_by, view_type, is_default, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    body.name,
    body.filters ? JSON.stringify(body.filters) : null,
    body.sortBy || null,
    body.groupBy || null,
    body.viewType || "list",
    body.isDefault ? 1 : 0,
    now,
    now
  );

  const view = db.prepare(`SELECT * FROM saved_views WHERE id = ?`).get(id) as ViewRow;

  return NextResponse.json({ view: mapRow(view) }, { status: 201 });
}
