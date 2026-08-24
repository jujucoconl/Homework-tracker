import { fromZonedTime } from "date-fns-tz";
import type { RecurringTemplate } from "./types";

export const GENERATION_WINDOW_DAYS = 90;
export const TOPUP_THRESHOLD_DAYS = 30;

export const WEEKDAY_LABELS: { value: number; short: string; label: string }[] = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 7, short: "Sun", label: "Sunday" },
];

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function isoWeekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return dow === 0 ? 7 : dow;
}

/**
 * Generate concrete due_at instants (ISO UTC) for a recurring template,
 * clipped to [windowStartDate, windowEndDate] (inclusive, "YYYY-MM-DD"),
 * and to the template's own start_date/end_date.
 */
export function generateOccurrences(
  template: Pick<RecurringTemplate, "weekdays" | "due_time" | "timezone" | "start_date" | "end_date">,
  windowStartDate: string,
  windowEndDate: string
): string[] {
  const weekdays = new Set(
    template.weekdays
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
  );

  let cursor = template.start_date > windowStartDate ? template.start_date : windowStartDate;
  const hardEnd = template.end_date && template.end_date < windowEndDate ? template.end_date : windowEndDate;

  const results: string[] = [];
  let guard = 0;
  while (cursor <= hardEnd && guard < 3660) {
    guard++;
    if (weekdays.has(isoWeekdayOf(cursor))) {
      const localIso = `${cursor}T${template.due_time}:00`;
      const utc = fromZonedTime(localIso, template.timezone || "UTC");
      results.push(utc.toISOString());
    }
    cursor = addDaysToDateStr(cursor, 1);
  }
  return results;
}
