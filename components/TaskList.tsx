"use client";

import type { Task } from "@/lib/types";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupTasks(tasks: Task[]) {
  const now = new Date();
  const today0 = startOfDay(now);
  const tomorrow0 = new Date(today0.getTime() + 86400000);
  const weekEnd0 = new Date(today0.getTime() + 7 * 86400000);

  const groups: { label: string; tasks: Task[] }[] = [
    { label: "Overdue", tasks: [] },
    { label: "Today", tasks: [] },
    { label: "Tomorrow", tasks: [] },
    { label: "This week", tasks: [] },
    { label: "Later", tasks: [] },
  ];

  for (const t of tasks) {
    const due = new Date(t.due_at);
    if (due < now) groups[0].tasks.push(t);
    else if (due < tomorrow0) groups[1].tasks.push(t);
    else if (due < new Date(tomorrow0.getTime() + 86400000)) groups[2].tasks.push(t);
    else if (due < weekEnd0) groups[3].tasks.push(t);
    else groups[4].tasks.push(t);
  }

  return groups.filter((g) => g.tasks.length > 0);
}

function subjectColor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = (hash * 31 + subject.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue} 70% 65%)`;
}

export default function TaskList({
  tasks,
  onToggle,
  onDelete,
}: {
  tasks: Task[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return <p className="text-slate-500 text-sm py-8 text-center">Nothing on the list. Add something above.</p>;
  }

  const groups = groupTasks(tasks);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h3
            className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
              group.label === "Overdue" ? "text-danger" : "text-slate-500"
            }`}
          >
            {group.label}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {group.tasks.map((t) => (
              <li
                key={t.id}
                className="group flex items-center gap-3 rounded-lg border border-border bg-panel px-3 py-2.5"
              >
                <button
                  onClick={() => onToggle(t.id, true)}
                  aria-label="Mark complete"
                  className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-500 hover:border-accent transition-colors"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{t.title}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span style={{ color: subjectColor(t.subject) }}>{t.subject}</span>
                    <span>·</span>
                    <span>
                      {new Date(t.due_at).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    {t.recurring_template_id && <span title="Repeating">↻</span>}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-danger transition-opacity text-xs shrink-0"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
