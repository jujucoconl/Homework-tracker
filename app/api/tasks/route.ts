import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pushTaskToCalendar } from "@/lib/googleCalendar";
import type { Task } from "@/lib/types";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const includeCompleted = req.nextUrl.searchParams.get("includeCompleted") === "1";
  const sql = includeCompleted
    ? "SELECT * FROM tasks ORDER BY due_at ASC"
    : "SELECT * FROM tasks WHERE completed = 0 ORDER BY due_at ASC";
  const result = await db.execute(sql);
  return NextResponse.json({ tasks: result.rows as unknown as Task[] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, subject, dueAt, notes, estimatedMinutes } = body as {
    title?: string;
    subject?: string;
    dueAt?: string;
    notes?: string;
    estimatedMinutes?: number | null;
  };

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!dueAt || isNaN(Date.parse(dueAt))) {
    return NextResponse.json({ error: "a valid dueAt is required" }, { status: 400 });
  }

  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const isoDueAt = new Date(dueAt).toISOString();
  const cleanTitle = title.trim();
  const cleanSubject = (subject || "General").trim();
  const minutes = estimatedMinutes && estimatedMinutes > 0 ? Math.round(estimatedMinutes) : null;

  await db.execute({
    sql: `INSERT INTO tasks (id, title, subject, due_at, notes, completed, recurring_template_id, created_at, estimated_minutes)
          VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
    args: [id, cleanTitle, cleanSubject, isoDueAt, notes || null, now, minutes],
  });

  const googleEventId = await pushTaskToCalendar({
    id,
    title: cleanTitle,
    subject: cleanSubject,
    due_at: isoDueAt,
    estimated_minutes: minutes,
  });
  if (googleEventId) {
    await db.execute({
      sql: "UPDATE tasks SET google_event_id = ?, calendar_synced = 1 WHERE id = ?",
      args: [googleEventId, id],
    });
  }

  const result = await db.execute({ sql: "SELECT * FROM tasks WHERE id = ?", args: [id] });
  return NextResponse.json({ task: result.rows[0] as unknown as Task }, { status: 201 });
}
