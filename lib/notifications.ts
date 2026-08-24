import webpush from "web-push";
import { Resend } from "resend";
import type { PushSubscriptionRow, ReminderType } from "./types";

const REMINDER_LABEL: Record<ReminderType, string> = {
  "24h": "due in 24 hours",
  "8h": "due in 8 hours",
  "1h": "due in 1 hour",
};

function vapidConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
  );
}

function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
}

export async function sendPushToAll(
  subs: PushSubscriptionRow[],
  payload: { title: string; body: string; url?: string }
): Promise<{ endpoint: string; ok: boolean; gone: boolean }[]> {
  if (!vapidConfigured() || subs.length === 0) return [];
  configureWebPush();

  const results = await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
        return { endpoint: sub.endpoint, ok: true, gone: false };
      } catch (err: any) {
        const gone = err?.statusCode === 404 || err?.statusCode === 410;
        return { endpoint: sub.endpoint, ok: false, gone };
      }
    })
  );
  return results;
}

function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.REMINDER_EMAIL_TO);
}

export async function sendReminderEmail(
  taskTitle: string,
  subject: string,
  dueAt: string,
  type: ReminderType
): Promise<boolean> {
  if (!emailConfigured()) return false;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM || "Homework Tracker <onboarding@resend.dev>";
  const to = process.env.REMINDER_EMAIL_TO as string;
  const dueLocal = new Date(dueAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  try {
    await resend.emails.send({
      from,
      to,
      subject: `Reminder: "${taskTitle}" ${REMINDER_LABEL[type]}`,
      html: `<p><strong>${escapeHtml(taskTitle)}</strong> (${escapeHtml(subject)}) is ${REMINDER_LABEL[type]}.</p><p>Due: ${dueLocal}</p>`,
    });
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function reminderLabel(type: ReminderType): string {
  return REMINDER_LABEL[type];
}
