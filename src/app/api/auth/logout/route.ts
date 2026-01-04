import { NextResponse } from "next/server";
import { deleteSession, parseSessionToken } from "../../../../lib/auth";

export async function POST(req: Request) {
  const token = parseSessionToken(req.headers.get("cookie"));
  if (token) {
    deleteSession(token);
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.headers.append(
    "Set-Cookie",
    "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  return response;
}
