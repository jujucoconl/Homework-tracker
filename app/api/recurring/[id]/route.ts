import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateOccurrences, GENERATION_WINDOW_DAYS } from "@/lib/recurrence";
import { INLINE_CALENDAR_SYNC_LIMIT, deleteTaskFromCalendar, pushTaskToCalendar } from "@/lib/googleCalendar";
import type { RecurringTemplate } from "@/lib/types";

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const body = await req.json();

  if (typeof body.active === "boolean") {
    await db.execute({
      sql: "UPDATE recurring_templates SET active = ? WHERE id = ?",
      args: [body.active ? 1 : 0, params.id],
    });

    if (!body.active) {
      // Pausing stops future generation; drop not-yet-due, incomplete instances
      // (and their calendar events, if any were synced).
      const toRemove = await db.execute({
        sql: `SELECT id, google_event_id FROM tasks WHERE recurring_template_id = ? AND completed = 0 AND due_at > ?`,
        args: [params.id, new Date().toISOString()],
      });
      const eventIds = (toRemove.rows as unknown as { google_event_id: string | null }[])
        .map((r) => r.google_event_id)
        .filter((id): id is string => Boolean(id));
      await Promise.all(eventIds.map((eventId) => deleteTaskFromCalendar(eventId)));

      await db.execute({
        sql: `DELETE FROM tasks WHERE recurring_template_id = ? AND completed = 0 AND due_at > ?`,
        args: [params.id, new Date().toISOString()],
      });
    } else {
      // Resuming: top back up to the standard generation window, skipping any
      // occurrences that already exist (e.g. completed ones left over from before pausing).
      const templateResult = await db.execute({
        sql: "SELECT * FROM recurring_templates WHERE id = ?",
        args: [params.id],
      });
      const template = templateResult.rows[0] as unknown as RecurringTemplate | undefined;
      if (template) {
        const today = new Date().toISOString().slice(0, 10);
        const windowEnd = addDays(today, GENERATION_WINDOW_DAYS);
        const occurrences = generateOccurrences(template, today, windowEnd);

        const existing = await db.execute({
          sql: "SELECT due_at FROM tasks WHERE recurring_template_id = ?",
          args: [params.id],
        });
        const existingDueAts = new Set((existing.rows as unknown as { due_at: string }[]).map((r) => r.due_at));

        const now = new Date().toISOString();
        let syncedCount = 0;
        for (const dueAt of occurrences) {
          if (existingDueAts.has(dueAt)) continue;

          const taskId = crypto.randomUUID();
          let googleEventId: string | null = null;
          if (syncedCount < INLINE_CALENDAR_SYNC_LIMIT) {
            googleEventId = await pushTaskToCalendar({
              id: taskId,
              title: template.title,
              subject: template.subject,
              due_at: dueAt,
              estimated_minutes: template.estimated_minutes,
            });
            syncedCount++;
          }

          await db.execute({
            sql: `INSERT INTO tasks
                  (id, title, subject, due_at, notes, completed, recurring_template_id, created_at, estimated_minutes, google_event_id, calendar_synced)
                  VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
            args: [
              taskId,
              template.title,
              template.subject,
              dueAt,
              template.notes,
              template.id,
              now,
              template.estimated_minutes,
              googleEventId,
              googleEventId ? 1 : 0,
            ],
          });
        }
      }
    }
  }

  const result = await db.execute({ sql: "SELECT * FROM recurring_templates WHERE id = ?", args: [params.id] });
  return NextResponse.json({ template: result.rows[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const tasksResult = await db.execute({
    sql: "SELECT id, google_event_id FROM tasks WHERE recurring_template_id = ?",
    args: [params.id],
  });
  const tasks = tasksResult.rows as unknown as { id: string; google_event_id: string | null }[];

  // Clean up calendar events concurrently — deletes are cheap, and once the task
  // rows are gone there's no later chance to find these events again.
  await Promise.all(
    tasks.filter((t) => t.google_event_id).map((t) => deleteTaskFromCalendar(t.google_event_id as string))
  );

  for (const task of tasks) {
    await db.execute({ sql: "DELETE FROM reminder_log WHERE task_id = ?", args: [task.id] });
  }
  await db.execute({ sql: "DELETE FROM tasks WHERE recurring_template_id = ?", args: [params.id] });
  await db.execute({ sql: "DELETE FROM recurring_templates WHERE id = ?", args: [params.id] });
  return NextResponse.json({ ok: true });
}
