"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QuickAdd from "@/components/QuickAdd";
import TaskList from "@/components/TaskList";
import WeekView from "@/components/WeekView";
import CompletedList from "@/components/CompletedList";
import RecurringForm from "@/components/RecurringForm";
import RecurringManager from "@/components/RecurringManager";
import PushEnableButton from "@/components/PushEnableButton";
import TestReminderButton from "@/components/TestReminderButton";
import ThemeToggle from "@/components/ThemeToggle";
import UndoToast from "@/components/UndoToast";
import type { RecurringTemplate, Task } from "@/lib/types";

const UNDO_WINDOW_MS = 5000;

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<"active" | "completed">("active");
  const [view, setView] = useState<"list" | "week">("list");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ taskId: string; title: string } | null>(null);

  const pendingComplete = useRef<{ taskId: string; timeoutId: ReturnType<typeof setTimeout> } | null>(null);

  const refresh = useCallback(async () => {
    const [tasksRes, subjectsRes, templatesRes] = await Promise.all([
      fetch("/api/tasks?includeCompleted=1"),
      fetch("/api/subjects"),
      fetch("/api/recurring"),
    ]);
    const [tasksData, subjectsData, templatesData] = await Promise.all([
      tasksRes.json(),
      subjectsRes.json(),
      templatesRes.json(),
    ]);
    setTasks(tasksData.tasks || []);
    setSubjects(subjectsData.subjects || []);
    setTemplates(templatesData.templates || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function flushPendingComplete() {
    if (pendingComplete.current) {
      clearTimeout(pendingComplete.current.timeoutId);
      const { taskId } = pendingComplete.current;
      pendingComplete.current = null;
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
    }
  }

  function completeTask(task: Task) {
    flushPendingComplete();
    setTasks((cur) => cur.map((t) => (t.id === task.id ? { ...t, completed: 1, completed_at: new Date().toISOString() } : t)));
    setUndo({ taskId: task.id, title: task.title });
    const timeoutId = setTimeout(() => {
      pendingComplete.current = null;
      setUndo((u) => (u?.taskId === task.id ? null : u));
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
    }, UNDO_WINDOW_MS);
    pendingComplete.current = { taskId: task.id, timeoutId };
  }

  function undoComplete() {
    if (!pendingComplete.current) return;
    clearTimeout(pendingComplete.current.timeoutId);
    const { taskId } = pendingComplete.current;
    pendingComplete.current = null;
    setTasks((cur) => cur.map((t) => (t.id === taskId ? { ...t, completed: 0, completed_at: null } : t)));
    setUndo(null);
  }

  async function uncompleteTask(id: string) {
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, completed: 0, completed_at: null } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: false }),
    });
  }

  async function deleteTask(id: string) {
    setTasks((cur) => cur.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  async function editTask(id: string, updates: { title: string; subject: string; dueAt: string }) {
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, ...updates, due_at: updates.dueAt } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const res = await fetch("/api/subjects");
    const data = await res.json();
    setSubjects(data.subjects || []);
  }

  async function togglePauseTemplate(id: string, active: boolean) {
    await fetch(`/api/recurring/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    refresh();
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    refresh();
  }

  const activeTasks = tasks.filter((t) => !t.completed && (!subjectFilter || t.subject === subjectFilter));
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 flex flex-col gap-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Homework Tracker</h1>
        <div className="flex items-center gap-3">
          <PushEnableButton />
          <TestReminderButton />
          <ThemeToggle />
        </div>
      </header>

      <QuickAdd subjects={subjects} onAdded={refresh} />

      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-border p-0.5 w-fit">
          {(["active", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${
                statusTab === tab ? "bg-accent text-slate-900 font-medium" : "text-muted hover:text-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {statusTab === "active" && (
          <div className="flex gap-1 rounded-lg border border-border p-0.5 w-fit">
            {(["list", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${
                  view === v ? "bg-accent text-slate-900 font-medium" : "text-muted hover:text-ink"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {statusTab === "active" && subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 -mt-4">
          <button
            onClick={() => setSubjectFilter(null)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              !subjectFilter ? "border-accent text-accent" : "border-border text-muted hover:border-accent"
            }`}
          >
            All
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                subjectFilter === s ? "border-accent text-accent" : "border-border text-muted hover:border-accent"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : statusTab === "completed" ? (
        <CompletedList tasks={completedTasks} onUncomplete={uncompleteTask} onDelete={deleteTask} />
      ) : view === "week" ? (
        <WeekView tasks={activeTasks} onToggle={(id) => completeTask(activeTasks.find((t) => t.id === id)!)} />
      ) : (
        <TaskList
          tasks={activeTasks}
          subjects={subjects}
          onToggle={(id) => completeTask(activeTasks.find((t) => t.id === id)!)}
          onDelete={deleteTask}
          onEdit={editTask}
        />
      )}

      <div className="border-t border-border pt-6 flex flex-col gap-4">
        <RecurringManager templates={templates} onTogglePause={togglePauseTemplate} onDelete={deleteTemplate} />
        <RecurringForm subjects={subjects} onAdded={refresh} />
      </div>

      {undo && <UndoToast message={`"${undo.title}" marked done`} onUndo={undoComplete} />}
    </main>
  );
}
