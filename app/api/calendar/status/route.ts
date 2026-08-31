import { NextResponse } from "next/server";
import { googleCredentialsConfigured, isCalendarConnected } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    configured: googleCredentialsConfigured(),
    connected: await isCalendarConnected(),
  });
}
