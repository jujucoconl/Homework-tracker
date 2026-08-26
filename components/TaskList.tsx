"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "@/lib/dateInput";
import ConfirmButton from "@/components/ConfirmButton";
import ClassSelect from "@/components/ClassSelect";

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

export function subjectColor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = (hash * 31 + subject.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue} 70% 45%)`;
}

function EditForm({
  task,
  subjects,
  onSave,
  onCancel,
}: {
  task: Task;
  subjects: string[];
  onSave: (updates: { title: string; subject: string; dueAt: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [subject, setSubject] = useState(task.subject);
  const [dueLocal, setDueLocal] = useState(toDatetimeLocalValue(task.due_at));

  return (
    <li className="rounded-lg border border-accent bg-panel px-3 py-3 flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <ClassSelect
          subjects={subjects}
          value={subject}
          onChange={setSubject}
          className="rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
        <input
          type="datetime-local"
          value={dueLocal}
          onChange={(e) => setDueLocal(e.target.value)}
          className="rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-xs text-muted hover:text-ink px-2 py-1">
          Cancel
        </button>
        <button
          onClick={() =>
            onSave({ title: title.trim() || task.title, subject: subject.trim() || "General", dueAt: fromDatetimeLocalValue(dueLocal) })
          }
          className="text-xs rounded-md bg-accent px-3 py-1 text-slate-900 font-medium"
        >
          Save
        </button>
      </div>
    </li>
  );
}

export default function TaskList({
  tasks,
  subjects,
  onToggle,
  onDelete,
  onEdit,
}: {
  tasks: Task[];
  subjects: string[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { title: string; subject: string; dueAt: string }) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (tasks.length === 0) {
    return <p className="text-muted text-sm py-8 text-center">Nothing on the list. Add something above.</p>;
  }

  const groups = groupTasks(tasks);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h3
            className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
              group.label === "Overdue" ? "text-danger" : "text-muted"
            }`}
          >
            {group.label}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {group.tasks.map((t) =>
              editingId === t.id ? (
                <EditForm
                  key={t.id}
                  task={t}
                  subjects={subjects}
                  onCancel={() => setEditingId(null)}
                  onSave={(updates) => {
                    onEdit(t.id, updates);
                    setEditingId(null);
                  }}
                />
              ) : (
                <li
                  key={t.id}
                  className="group flex items-center gap-3 rounded-lg border border-border bg-panel px-3 py-2.5"
                >
                  <button
                    onClick={() => onToggle(t.id, true)}
                    aria-label="Mark complete"
                    className="h-5 w-5 shrink-0 rounded-full border-2 border-muted hover:border-accent transition-colors"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{t.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted">
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
                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setEditingId(t.id)} className="text-xs text-muted hover:text-accent">
                      Edit
                    </button>
                    <ConfirmButton
                      onConfirm={() => onDelete(t.id)}
                      className="text-xs text-muted hover:text-danger"
                      confirmClassName="text-xs text-danger font-medium"
                    >
                      Delete
                    </ConfirmButton>
                  </div>
                </li>
              )
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
