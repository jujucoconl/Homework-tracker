import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendPushToAll, sendTestEmail, vapidConfigured, emailConfigured } from "@/lib/notifications";
import type { PushSubscriptionRow } from "@/lib/types";

export async function POST() {
  const db = await getDb();
  const subsResult = await db.execute("SELECT * FROM push_subscriptions");
  const subs = subsResult.rows as unknown as PushSubscriptionRow[];

  const pushResults = await sendPushToAll(subs, {
    title: "Test reminder",
    body: "This is what a homework reminder looks like.",
    url: "/",
  });
  for (const r of pushResults) {
    if (r.gone) {
      await db.execute({ sql: "DELETE FROM push_subscriptions WHERE endpoint = ?", args: [r.endpoint] });
    }
  }

  const emailSent = await sendTestEmail();

  return NextResponse.json({
    pushConfigured: vapidConfigured(),
    pushSubscriberCount: subs.length,
    pushSentCount: pushResults.filter((r) => r.ok).length,
    emailConfigured: emailConfigured(),
    emailSent,
  });
}
