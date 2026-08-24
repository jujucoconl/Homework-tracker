import * as chrono from "chrono-node";

export interface ParsedQuickAdd {
  title: string;
  subject: string | null;
  dueAt: Date | null;
  hadExplicitTime: boolean;
}

const FILLER_PREFIXES = [/^due\s+/i, /^by\s+/i, /^on\s+/i];

/**
 * Parses a single quick-add line like:
 *   "Math: worksheet ch 4 by fri 5pm"
 *   "Chemistry lab report due tomorrow"
 *   "Read ch. 3 tomorrow 9am"
 * into a subject (optional), a clean title, and a due date.
 * Defaults the time to 23:59 local when no time is mentioned.
 */
export function parseQuickAdd(raw: string, referenceDate: Date = new Date()): ParsedQuickAdd {
  let text = raw.trim();
  let subject: string | null = null;

  const colonIdx = text.indexOf(":");
  if (colonIdx > 0 && colonIdx <= 24) {
    const before = text.slice(0, colonIdx).trim();
    if (before.split(/\s+/).length <= 4 && before.length > 0) {
      subject = before;
      text = text.slice(colonIdx + 1).trim();
    }
  }

  const results = chrono.parse(text, referenceDate, { forwardDate: true });

  let dueAt: Date | null = null;
  let hadExplicitTime = false;
  let title = text;

  if (results.length > 0) {
    const result = results[0];
    hadExplicitTime = result.start.isCertain("hour");
    const d = result.start.date();
    if (!hadExplicitTime) {
      d.setHours(23, 59, 0, 0);
    }
    dueAt = d;

    title = (text.slice(0, result.index) + text.slice(result.index + result.text.length)).trim();
    for (const re of FILLER_PREFIXES) {
      title = title.replace(re, "");
    }
    title = title.replace(/\s{2,}/g, " ").replace(/[,.\s]+$/, "").trim();
  }

  if (!title) title = text.trim();

  return {
    title: title || raw.trim(),
    subject,
    dueAt,
    hadExplicitTime,
  };
}
