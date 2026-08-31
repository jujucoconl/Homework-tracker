import { NextRequest, NextResponse } from "next/server";
import { googleCredentialsConfigured, getRedirectUri } from "@/lib/googleCalendar";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(req: NextRequest) {
  if (!googleCredentialsConfigured()) {
    return NextResponse.json(
      { error: "Google Calendar isn't configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: getRedirectUri(req),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(`${AUTH_URL}?${params.toString()}`);
}
