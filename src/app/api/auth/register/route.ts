import { NextResponse } from "next/server";
import { createSession, createUser, getUserByEmail } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 }
      );
    }

    const existing = getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const user = createUser({ email, password, name });
    const session = createSession(user.id);

    const response = NextResponse.json({ user }, { status: 201 });
    response.headers.append(
      "Set-Cookie",
      `session=${session.token}; Path=/; HttpOnly; SameSite=Lax`
    );

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
