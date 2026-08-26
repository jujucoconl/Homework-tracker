"use client";

import type { RecurringTemplate } from "@/lib/types";
import { WEEKDAY_LABELS } from "@/lib/recurrence";
import ConfirmButton from "@/components/ConfirmButton";

function weekdaySummary(csv: string): string {
  const values = new Set(csv.split(",").map(Number));
  return WEEKDAY_LABELS.filter((d) => values.has(d.value))
    .map((d) => d.short)
    .join("/");
}

export default function RecurringManager({
  templates,
  onTogglePause,
  onDelete,
}: {
  templates: RecurringTemplate[];
  onTogglePause: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (templates.length === 0) {
    return <p className="text-xs text-muted">No repeating homework set up yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {templates.map((t) => (
        <li
          key={t.id}
          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
            t.active ? "border-border bg-panel" : "border-border bg-panel opacity-60"
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">
              {t.title} <span className="text-muted">· {t.subject}</span>
            </div>
            <div className="text-xs text-muted">
              {weekdaySummary(t.weekdays)} at {t.due_time}
              {!t.active && <span className="ml-2 text-accent">Paused</span>}
            </div>
          </div>
          <button
            onClick={() => onTogglePause(t.id, !t.active)}
            className="text-xs text-muted hover:text-accent shrink-0"
          >
            {t.active ? "Pause" : "Resume"}
          </button>
          <ConfirmButton
            onConfirm={() => onDelete(t.id)}
            className="text-xs text-muted hover:text-danger shrink-0"
            confirmClassName="text-xs text-danger font-medium shrink-0"
          >
            Delete
          </ConfirmButton>
        </li>
      ))}
    </ul>
  );
}
