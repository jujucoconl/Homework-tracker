import { NextResponse } from "next/server";
import { disconnectCalendar } from "@/lib/googleCalendar";

export async function POST() {
  await disconnectCalendar();
  return NextResponse.json({ ok: true });
}
