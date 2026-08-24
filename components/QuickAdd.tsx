"use client";

import { useMemo, useState } from "react";
import { parseQuickAdd } from "@/lib/quickAdd";

export default function QuickAdd({ onAdded }: { onAdded: () => void }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parseQuickAdd(text) : null), [text]);

  async function submit() {
    if (!parsed || !parsed.dueAt || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.title,
          subject: parsed.subject || "General",
          dueAt: parsed.dueAt.toISOString(),
        }),
      });
      setText("");
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder='Type it like a sentence: "Math: worksheet ch 4 due fri 5pm"'
        className="w-full rounded-lg border border-border bg-panel px-4 py-3 text-base placeholder:text-slate-500 focus:border-accent focus:outline-none"
      />
      <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400 min-h-[1.25rem]">
        {parsed?.dueAt ? (
          <span>
            {parsed.subject ? <span className="text-accent">{parsed.subject}</span> : "General"} ·{" "}
            {parsed.title} · due{" "}
            {parsed.dueAt.toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        ) : text.trim() ? (
          <span className="text-danger">Couldn&apos;t find a date — try adding one, e.g. &quot;tomorrow&quot; or &quot;fri 5pm&quot;</span>
        ) : (
          <span>No subject prefix? It&apos;ll go under &quot;General&quot;. Press Enter to add.</span>
        )}
        <button
          onClick={submit}
          disabled={!parsed?.dueAt || submitting}
          className="ml-3 shrink-0 rounded-md bg-accent px-3 py-1 text-slate-900 font-medium disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
}
