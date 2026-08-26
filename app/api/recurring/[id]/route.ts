import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateOccurrences, GENERATION_WINDOW_DAYS } from "@/lib/recurrence";
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
      // Pausing stops future generation; drop not-yet-due, incomplete instances.
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
        for (const dueAt of occurrences) {
          if (existingDueAts.has(dueAt)) continue;
          await db.execute({
            sql: `INSERT INTO tasks (id, title, subject, due_at, notes, completed, recurring_template_id, created_at)
                  VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
            args: [crypto.randomUUID(), template.title, template.subject, dueAt, template.notes, template.id, now],
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
  const taskIds = await db.execute({
    sql: "SELECT id FROM tasks WHERE recurring_template_id = ?",
    args: [params.id],
  });
  for (const row of taskIds.rows) {
    await db.execute({ sql: "DELETE FROM reminder_log WHERE task_id = ?", args: [(row as any).id] });
  }
  await db.execute({ sql: "DELETE FROM tasks WHERE recurring_template_id = ?", args: [params.id] });
  await db.execute({ sql: "DELETE FROM recurring_templates WHERE id = ?", args: [params.id] });
  return NextResponse.json({ ok: true });
}
