import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
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
  const { title, subject, dueAt, notes } = body as {
    title?: string;
    subject?: string;
    dueAt?: string;
    notes?: string;
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

  await db.execute({
    sql: `INSERT INTO tasks (id, title, subject, due_at, notes, completed, recurring_template_id, created_at)
          VALUES (?, ?, ?, ?, ?, 0, NULL, ?)`,
    args: [id, title.trim(), (subject || "General").trim(), new Date(dueAt).toISOString(), notes || null, now],
  });

  const result = await db.execute({ sql: "SELECT * FROM tasks WHERE id = ?", args: [id] });
  return NextResponse.json({ task: result.rows[0] as unknown as Task }, { status: 201 });
}
