import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendPushToAll, sendReminderEmail } from "@/lib/notifications";
import { generateOccurrences, GENERATION_WINDOW_DAYS, TOPUP_THRESHOLD_DAYS } from "@/lib/recurrence";
import { isCalendarConnected, pushTaskToCalendar } from "@/lib/googleCalendar";
import type { PushSubscriptionRow, RecurringTemplate, ReminderType, SnoozeRow, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

const WINDOWS: { type: ReminderType; hours: number }[] = [
  { type: "24h", hours: 24 },
  { type: "8h", hours: 8 },
  { type: "1h", hours: 1 },
];

// How late the cron runner is allowed to be (GitHub Actions cron is best-effort,
// and this endpoint may only be polled every ~15 min) before a window is missed.
const CATCH_UP_MINUTES = 20;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const queryParam = req.nextUrl.searchParams.get("secret");
  return bearer === secret || queryParam === secret;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

async function topUpRecurringInstances() {
  const db = await getDb();
  const templates = await db.execute("SELECT * FROM recurring_templates WHERE active = 1");
  const today = new Date().toISOString().slice(0, 10);
  const topUpBoundary = addDays(today, TOPUP_THRESHOLD_DAYS);
  const windowEnd = addDays(today, GENERATION_WINDOW_DAYS);

  let totalGenerated = 0;

  for (const row of templates.rows as unknown as RecurringTemplate[]) {
    const maxDue = await db.execute({
      sql: "SELECT MAX(due_at) as maxDue FROM tasks WHERE recurring_template_id = ?",
      args: [row.id],
    });
    const maxDueAt = (maxDue.rows[0] as any)?.maxDue as string | null;
    const lastGeneratedDate = maxDueAt ? maxDueAt.slice(0, 10) : row.start_date;

    if (lastGeneratedDate >= topUpBoundary) continue;
    if (row.end_date && lastGeneratedDate >= row.end_date) continue;

    const genStart = addDays(lastGeneratedDate, 1);
    const occurrences = generateOccurrences(row, genStart, windowEnd);
    const now = new Date().toISOString();

    for (const dueAt of occurrences) {
      const taskId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO tasks (id, title, subject, due_at, notes, completed, recurring_template_id, created_at, estimated_minutes)
              VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        args: [taskId, row.title, row.subject, dueAt, row.notes, row.id, now, row.estimated_minutes],
      });
      totalGenerated++;
    }
  }

  return totalGenerated;
}

async function sendDueReminders() {
  const db = await getDb();
  const now = new Date();
  const horizon = new Date(now.getTime() + 25 * 3600 * 1000);

  const dueSoon = await db.execute({
    sql: "SELECT * FROM tasks WHERE completed = 0 AND due_at > ? AND due_at <= ? ORDER BY due_at ASC",
    args: [now.toISOString(), horizon.toISOString()],
  });

  const tasks = dueSoon.rows as unknown as Task[];
  if (tasks.length === 0) return { checked: 0, sent: 0 };

  const subsResult = await db.execute("SELECT * FROM push_subscriptions");
  const subs = subsResult.rows as unknown as PushSubscriptionRow[];

  let sentCount = 0;

  for (const task of tasks) {
    const dueAt = new Date(task.due_at);

    for (const win of WINDOWS) {
      const targetTime = dueAt.getTime() - win.hours * 3600 * 1000;
      const windowCloses = targetTime + CATCH_UP_MINUTES * 60 * 1000;
      if (now.getTime() < targetTime || now.getTime() >= windowCloses) continue;

      const already = await db.execute({
        sql: "SELECT 1 FROM reminder_log WHERE task_id = ? AND type = ?",
        args: [task.id, win.type],
      });
      if (already.rows.length > 0) continue;

      const label = win.type === "24h" ? "due in 24 hours" : win.type === "8h" ? "due in 8 hours" : "due in 1 hour";
      const pushResults = await sendPushToAll(subs, {
        title: `${task.title} — ${label}`,
        body: `${task.subject} · due ${dueAt.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}`,
        url: "/",
        taskId: task.id,
      });

      for (const r of pushResults) {
        if (r.gone) {
          await db.execute({ sql: "DELETE FROM push_subscriptions WHERE endpoint = ?", args: [r.endpoint] });
        }
      }

      await sendReminderEmail(task.title, task.subject, task.due_at, win.type);

      await db.execute({
        sql: "INSERT INTO reminder_log (task_id, type, sent_at) VALUES (?, ?, ?)",
        args: [task.id, win.type, now.toISOString()],
      });
      sentCount++;
    }
  }

  return { checked: tasks.length, sent: sentCount };
}

async function sendDueSnoozes() {
  const db = await getDb();
  const now = new Date().toISOString();

  const due = await db.execute({
    sql: "SELECT * FROM snoozes WHERE sent = 0 AND fire_at <= ?",
    args: [now],
  });
  const snoozes = due.rows as unknown as SnoozeRow[];
  if (snoozes.length === 0) return 0;

  const subsResult = await db.execute("SELECT * FROM push_subscriptions");
  const subs = subsResult.rows as unknown as PushSubscriptionRow[];

  let sentCount = 0;
  for (const snooze of snoozes) {
    const taskResult = await db.execute({ sql: "SELECT * FROM tasks WHERE id = ?", args: [snooze.task_id] });
    const task = taskResult.rows[0] as unknown as Task | undefined;

    if (task && !task.completed) {
      const pushResults = await sendPushToAll(subs, {
        title: `Reminder: ${task.title}`,
        body: `${task.subject} · due ${new Date(task.due_at).toLocaleString("en-US", {
          weekday: "short",
          hour: "numeric",
          minute: "2-digit",
        })}`,
        url: "/",
        taskId: task.id,
      });
      for (const r of pushResults) {
        if (r.gone) {
          await db.execute({ sql: "DELETE FROM push_subscriptions WHERE endpoint = ?", args: [r.endpoint] });
        }
      }
      sentCount++;
    }

    await db.execute({ sql: "UPDATE snoozes SET sent = 1 WHERE id = ?", args: [snooze.id] });
  }

  return sentCount;
}

// Bounded per run so a large backlog (e.g. a freshly-created recurring series)
// can't push this request past a serverless timeout — the rest catches up on
// the next 15-minute run.
const CALENDAR_BACKLOG_BATCH_SIZE = 20;

async function syncCalendarBacklog() {
  if (!(await isCalendarConnected())) return 0;

  const db = await getDb();
  const unsynced = await db.execute({
    sql: "SELECT * FROM tasks WHERE calendar_synced = 0 AND completed = 0 ORDER BY due_at ASC LIMIT ?",
    args: [CALENDAR_BACKLOG_BATCH_SIZE],
  });

  let syncedCount = 0;
  for (const row of unsynced.rows as unknown as Task[]) {
    const googleEventId = await pushTaskToCalendar({
      id: row.id,
      title: row.title,
      subject: row.subject,
      due_at: row.due_at,
      estimated_minutes: row.estimated_minutes,
    });
    if (googleEventId) {
      await db.execute({
        sql: "UPDATE tasks SET google_event_id = ?, calendar_synced = 1 WHERE id = ?",
        args: [googleEventId, row.id],
      });
      syncedCount++;
    } else {
      // Couldn't sync (token issue, API error) — stop for this run rather than
      // retrying the same failure across the whole backlog.
      break;
    }
  }
  return syncedCount;
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const generated = await topUpRecurringInstances();
  const { checked, sent } = await sendDueReminders();
  const snoozesSent = await sendDueSnoozes();
  const calendarSynced = await syncCalendarBacklog();

  return NextResponse.json({
    ok: true,
    generatedInstances: generated,
    tasksChecked: checked,
    remindersSent: sent,
    snoozesSent,
    calendarSynced,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
