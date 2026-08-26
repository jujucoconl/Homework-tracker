import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateOccurrences, GENERATION_WINDOW_DAYS } from "@/lib/recurrence";
import type { RecurringTemplate } from "@/lib/types";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export async function GET() {
  const db = await getDb();
  const result = await db.execute("SELECT * FROM recurring_templates ORDER BY active DESC, created_at DESC");
  return NextResponse.json({ templates: result.rows as unknown as RecurringTemplate[] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, subject, weekdays, dueTime, timezone, startDate, endDate, notes } = body as {
    title?: string;
    subject?: string;
    weekdays?: number[];
    dueTime?: string;
    timezone?: string;
    startDate?: string;
    endDate?: string | null;
    notes?: string;
  };

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    return NextResponse.json({ error: "at least one weekday is required" }, { status: 400 });
  }
  if (!dueTime || !/^\d{2}:\d{2}$/.test(dueTime)) {
    return NextResponse.json({ error: "dueTime must be HH:MM" }, { status: 400 });
  }

  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const start = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : todayStr();
  const tz = timezone && timezone.trim() ? timezone.trim() : "UTC";

  await db.execute({
    sql: `INSERT INTO recurring_templates
          (id, title, subject, weekdays, due_time, timezone, start_date, end_date, notes, active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    args: [
      id,
      title.trim(),
      (subject || "General").trim(),
      weekdays.join(","),
      dueTime,
      tz,
      start,
      endDate || null,
      notes || null,
      now,
    ],
  });

  const windowEnd = addDays(todayStr(), GENERATION_WINDOW_DAYS);
  const occurrences = generateOccurrences(
    { weekdays: weekdays.join(","), due_time: dueTime, timezone: tz, start_date: start, end_date: endDate || null },
    start,
    windowEnd
  );

  for (const dueAt of occurrences) {
    const taskId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO tasks (id, title, subject, due_at, notes, completed, recurring_template_id, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      args: [taskId, title.trim(), (subject || "General").trim(), dueAt, notes || null, id, now],
    });
  }

  const result = await db.execute({ sql: "SELECT * FROM recurring_templates WHERE id = ?", args: [id] });
  return NextResponse.json(
    { template: result.rows[0] as unknown as RecurringTemplate, generated: occurrences.length },
    { status: 201 }
  );
}
