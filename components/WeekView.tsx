"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { subjectColor } from "@/components/TaskList";

function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function WeekView({
  tasks,
  onToggle,
}: {
  tasks: Task[];
  onToggle: (id: string, completed: boolean) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();
  const rangeLabel = `${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" }
  )}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((d) => new Date(d.getTime() - 7 * 86400000))}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekStart(mondayOf(new Date()))}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent"
          >
            Today
          </button>
          <button
            onClick={() => setWeekStart((d) => new Date(d.getTime() + 7 * 86400000))}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent"
          >
            Next →
          </button>
        </div>
        <span className="text-xs text-muted">{rangeLabel}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {days.map((day) => {
          const dayTasks = tasks
            .filter((t) => sameDay(new Date(t.due_at), day))
            .sort((a, b) => a.due_at.localeCompare(b.due_at));
          const isToday = sameDay(day, today);

          return (
            <div key={day.toISOString()} className={`rounded-lg border p-2 min-h-[6rem] ${isToday ? "border-accent" : "border-border"}`}>
              <div className={`text-xs font-medium mb-1.5 ${isToday ? "text-accent" : "text-muted"}`}>
                {day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
              </div>
              <div className="flex flex-col gap-1">
                {dayTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onToggle(t.id, true)}
                    className="text-left rounded-md bg-panel border border-border px-1.5 py-1 text-[11px] hover:border-accent transition-colors"
                  >
                    <div className="truncate">{t.title}</div>
                    <div className="flex items-center gap-1 text-muted">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: subjectColor(t.subject) }} />
                      <span>
                        {new Date(t.due_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
