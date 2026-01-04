import { NextResponse } from "next/server";
import { exchangeGoogleCodeForTokens } from "../../../../lib/googleCalendar";
import { getRequestUserId } from "../../../../lib/auth";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      // Redirect back to integrations page with error
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error)}`, url.origin)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/integrations?error=missing_code", url.origin)
      );
    }

    const userId = getRequestUserId(req);
    await exchangeGoogleCodeForTokens(code, userId ?? undefined);

    // Redirect back to integrations page on success
    return NextResponse.redirect(
      new URL("/integrations?connected=google", url.origin)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed";
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(message)}`, new URL(req.url).origin)
    );
  }
}
