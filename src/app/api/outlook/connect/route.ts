import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildOutlookAuthUrl } from "../../../../lib/outlook";
import { getRequestUserId } from "../../../../lib/auth";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const state = randomUUID();
  const url = buildOutlookAuthUrl(state);
  return NextResponse.redirect(url);
}
