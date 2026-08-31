import { getDb } from "./db";
import type { CalendarSettingsRow } from "./types";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SETTINGS_ID = "default";

// When a recurring template generates a batch of occurrences at once, only sync
// this many inline (fast, immediate) — the rest are picked up by the cron's
// backlog sync so bulk creation never risks a serverless request timeout.
export const INLINE_CALENDAR_SYNC_LIMIT = 10;

export interface CalendarTask {
  id: string;
  title: string;
  subject: string;
  due_at: string;
  estimated_minutes: number | null;
}

export function googleCredentialsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Builds the OAuth redirect URI, preferring an explicit APP_URL over the request's own host. */
export function getRedirectUri(req: { nextUrl: { protocol: string }; headers: Headers }): string {
  const base = process.env.APP_URL || `${req.nextUrl.protocol}//${req.headers.get("host")}`;
  return `${base.replace(/\/$/, "")}/api/calendar/callback`;
}

export async function getCalendarSettings(): Promise<CalendarSettingsRow | undefined> {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM calendar_settings WHERE id = ?", args: [SETTINGS_ID] });
  return res.rows[0] as unknown as CalendarSettingsRow | undefined;
}

export async function isCalendarConnected(): Promise<boolean> {
  const settings = await getCalendarSettings();
  return Boolean(settings?.refresh_token);
}

export async function saveCalendarTokens(tokens: {
  access_token: string;
  refresh_token?: string | null;
  expiry: string;
}): Promise<void> {
  const db = await getDb();
  const existing = await getCalendarSettings();

  if (existing) {
    const refreshToken = tokens.refresh_token || existing.refresh_token;
    await db.execute({
      sql: "UPDATE calendar_settings SET access_token = ?, refresh_token = ?, expiry = ? WHERE id = ?",
      args: [tokens.access_token, refreshToken, tokens.expiry, SETTINGS_ID],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO calendar_settings (id, access_token, refresh_token, expiry, connected_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [SETTINGS_ID, tokens.access_token, tokens.refresh_token || null, tokens.expiry, new Date().toISOString()],
    });
  }
}

export async function disconnectCalendar(): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM calendar_settings WHERE id = ?", args: [SETTINGS_ID] });
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to refresh Google token: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function getValidAccessToken(): Promise<string | null> {
  if (!googleCredentialsConfigured()) return null;
  const settings = await getCalendarSettings();
  if (!settings?.refresh_token) return null;

  const expiryMs = settings.expiry ? new Date(settings.expiry).getTime() : 0;
  if (settings.access_token && expiryMs > Date.now() + 60_000) {
    return settings.access_token;
  }

  const refreshed = await refreshAccessToken(settings.refresh_token);
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await saveCalendarTokens({ access_token: refreshed.access_token, expiry: newExpiry });
  return refreshed.access_token;
}

function eventPayload(task: CalendarTask) {
  const start = new Date(task.due_at);
  const durationMin = task.estimated_minutes && task.estimated_minutes > 0 ? task.estimated_minutes : 30;
  const end = new Date(start.getTime() + durationMin * 60_000);
  return {
    summary: `Due: ${task.subject} — ${task.title}`,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

/** Returns the created Google event id, or null if not connected / the call failed. */
export async function pushTaskToCalendar(task: CalendarTask): Promise<string | null> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return null;

    const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload(task)),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id as string;
  } catch {
    return null;
  }
}

export async function updateTaskInCalendar(googleEventId: string, task: CalendarTask): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return false;

    const res = await fetch(`${CALENDAR_API}/calendars/primary/events/${googleEventId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload(task)),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteTaskFromCalendar(googleEventId: string): Promise<void> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    await fetch(`${CALENDAR_API}/calendars/primary/events/${googleEventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // best-effort — a stray event left behind is harmless
  }
}
