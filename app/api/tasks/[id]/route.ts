import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Task } from "@/lib/types";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const body = await req.json();
  const existing = await db.execute({ sql: "SELECT * FROM tasks WHERE id = ?", args: [params.id] });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const args: unknown[] = [];

  if (typeof body.completed === "boolean") {
    updates.push("completed = ?");
    args.push(body.completed ? 1 : 0);
    updates.push("completed_at = ?");
    args.push(body.completed ? new Date().toISOString() : null);
  }
  if (typeof body.title === "string" && body.title.trim()) {
    updates.push("title = ?");
    args.push(body.title.trim());
  }
  if (typeof body.subject === "string" && body.subject.trim()) {
    updates.push("subject = ?");
    args.push(body.subject.trim());
  }
  if (typeof body.dueAt === "string" && !isNaN(Date.parse(body.dueAt))) {
    updates.push("due_at = ?");
    args.push(new Date(body.dueAt).toISOString());
  }
  if (typeof body.notes === "string") {
    updates.push("notes = ?");
    args.push(body.notes);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  args.push(params.id);
  await db.execute({ sql: `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, args: args as any[] });

  // If the due date changed, clear any already-sent reminders so they can re-fire correctly.
  if (typeof body.dueAt === "string") {
    await db.execute({ sql: "DELETE FROM reminder_log WHERE task_id = ?", args: [params.id] });
  }

  const result = await db.execute({ sql: "SELECT * FROM tasks WHERE id = ?", args: [params.id] });
  return NextResponse.json({ task: result.rows[0] as unknown as Task });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM reminder_log WHERE task_id = ?", args: [params.id] });
  await db.execute({ sql: "DELETE FROM tasks WHERE id = ?", args: [params.id] });
  return NextResponse.json({ ok: true });
}
