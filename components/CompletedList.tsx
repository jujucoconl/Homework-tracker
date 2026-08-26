"use client";

import type { Task } from "@/lib/types";
import { subjectColor } from "@/components/TaskList";
import ConfirmButton from "@/components/ConfirmButton";

export default function CompletedList({
  tasks,
  onUncomplete,
  onDelete,
}: {
  tasks: Task[];
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return <p className="text-muted text-sm py-8 text-center">Nothing completed yet.</p>;
  }

  const sorted = [...tasks].sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""));

  return (
    <ul className="flex flex-col gap-1.5">
      {sorted.map((t) => (
        <li key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-panel px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm line-through text-muted">{t.title}</div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span style={{ color: subjectColor(t.subject) }}>{t.subject}</span>
              <span>·</span>
              <span>
                completed{" "}
                {t.completed_at
                  ? new Date(t.completed_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>
          </div>
          <button onClick={() => onUncomplete(t.id)} className="text-xs text-muted hover:text-accent shrink-0">
            Undo
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
