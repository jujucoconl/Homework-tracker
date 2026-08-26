import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const taskId = body?.taskId;
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const db = await getDb();
  const task = await db.execute({ sql: "SELECT id FROM tasks WHERE id = ?", args: [taskId] });
  if (task.rows.length === 0) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  const fireAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await db.execute({
    sql: "INSERT INTO snoozes (id, task_id, fire_at, sent, created_at) VALUES (?, ?, ?, 0, ?)",
    args: [crypto.randomUUID(), taskId, fireAt, new Date().toISOString()],
  });

  return NextResponse.json({ ok: true, fireAt });
}
