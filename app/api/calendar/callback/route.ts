import { NextRequest, NextResponse } from "next/server";
import { saveCalendarTokens, getRedirectUri } from "@/lib/googleCalendar";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const homeUrl = new URL("/", req.url);

  if (error) {
    homeUrl.searchParams.set("calendar", "error");
    return NextResponse.redirect(homeUrl);
  }
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
        redirect_uri: getRedirectUri(req),
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      homeUrl.searchParams.set("calendar", "error");
      return NextResponse.redirect(homeUrl);
    }

    const tokens = await res.json();
    await saveCalendarTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    });

    homeUrl.searchParams.set("calendar", "connected");
    return NextResponse.redirect(homeUrl);
  } catch {
    homeUrl.searchParams.set("calendar", "error");
    return NextResponse.redirect(homeUrl);
  }
}
