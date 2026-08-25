import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT id FROM push_subscriptions WHERE endpoint = ?",
    args: [sub.endpoint],
  });

  if (existing.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), sub.endpoint, sub.keys.p256dh, sub.keys.auth, new Date().toISOString()],
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const endpoint = body?.endpoint;
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM push_subscriptions WHERE endpoint = ?", args: [endpoint] });
  return NextResponse.json({ ok: true });
}
