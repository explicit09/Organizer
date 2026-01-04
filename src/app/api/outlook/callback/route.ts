import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "../../../../lib/outlook";
import { getRequestUserId } from "../../../../lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const userId = getRequestUserId(req);

  if (error) {
    return NextResponse.redirect(
      new URL(`/integrations?status=error&reason=${encodeURIComponent(error)}`, url.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/integrations?status=missing_code", url.origin)
    );
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  try {
    await exchangeCodeForTokens(code, userId);
    return NextResponse.redirect(new URL("/integrations?status=connected", url.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "token_exchange_failed";
    return NextResponse.redirect(
      new URL(`/integrations?status=error&reason=${encodeURIComponent(message)}`, url.origin)
    );
  }
}
