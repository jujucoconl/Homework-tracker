import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const result = await db.execute(
    `SELECT subject FROM tasks WHERE subject IS NOT NULL AND subject != ''
     UNION
     SELECT subject FROM recurring_templates WHERE subject IS NOT NULL AND subject != ''
     ORDER BY subject COLLATE NOCASE ASC`
  );
  const subjects = (result.rows as unknown as { subject: string }[]).map((r) => r.subject);
  return NextResponse.json({ subjects });
}
