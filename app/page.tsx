"use client";

import { useCallback, useEffect, useState } from "react";
import QuickAdd from "@/components/QuickAdd";
import TaskList from "@/components/TaskList";
import RecurringForm from "@/components/RecurringForm";
import PushEnableButton from "@/components/PushEnableButton";
import type { Task } from "@/lib/types";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggle(id: string, completed: boolean) {
    setTasks((cur) => cur.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
  }

  async function remove(id: string) {
    setTasks((cur) => cur.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Homework Tracker</h1>
        <PushEnableButton />
      </header>

      <QuickAdd onAdded={refresh} />

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : (
        <TaskList tasks={tasks} onToggle={toggle} onDelete={remove} />
      )}

      <div className="border-t border-border pt-6">
        <RecurringForm onAdded={refresh} />
      </div>
    </main>
  );
}
