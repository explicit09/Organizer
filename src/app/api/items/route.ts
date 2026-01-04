import { NextResponse } from "next/server";
import {
  itemStatusValues,
  itemTypeValues,
  listItems,
  createItem,
} from "../../../lib/items";
import { getRequestUserId } from "../../../lib/auth";

function isValidType(value: string | null) {
  return value ? itemTypeValues.includes(value as (typeof itemTypeValues)[number]) : true;
}

function isValidStatus(value: string | null) {
  return value
    ? itemStatusValues.includes(value as (typeof itemStatusValues)[number])
    : true;
}

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");

  if (!isValidType(type) || !isValidStatus(status)) {
    return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  }

  const items = listItems(
    {
      type: (type ?? undefined) as (typeof itemTypeValues)[number] | undefined,
      status:
        (status ?? undefined) as (typeof itemStatusValues)[number] | undefined,
    },
    { userId }
  );

  return NextResponse.json({ items }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const item = createItem(body, { userId });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
