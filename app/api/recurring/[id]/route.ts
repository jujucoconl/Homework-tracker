import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const body = await req.json();

  if (typeof body.active === "boolean") {
    await db.execute({
      sql: "UPDATE recurring_templates SET active = ? WHERE id = ?",
      args: [body.active ? 1 : 0, params.id],
    });
    if (!body.active) {
      // Deactivating stops future generation; drop not-yet-due, incomplete instances.
      await db.execute({
        sql: `DELETE FROM tasks WHERE recurring_template_id = ? AND completed = 0 AND due_at > ?`,
        args: [params.id, new Date().toISOString()],
      });
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
