import { NextResponse } from "next/server";
import { createSession, getUserByEmail, verifyPassword } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 }
      );
    }

    const existing = getUserByEmail(email);
    if (!existing || !verifyPassword(password, existing.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session = createSession(existing.user.id);
    const response = NextResponse.json({ user: existing.user }, { status: 200 });
    response.headers.append(
      "Set-Cookie",
      `session=${session.token}; Path=/; HttpOnly; SameSite=Lax`
    );

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
