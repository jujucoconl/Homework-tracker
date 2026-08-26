"use client";

import { useMemo, useState } from "react";
import { parseQuickAdd } from "@/lib/quickAdd";

export default function QuickAdd({ subjects, onAdded }: { subjects: string[]; onAdded: () => void }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parseQuickAdd(text) : null), [text]);

  function insertSubject(subject: string) {
    const colonIdx = text.indexOf(":");
    const rest = colonIdx > 0 && colonIdx <= 24 ? text.slice(colonIdx + 1).trimStart() : text;
    setText(`${subject}: ${rest}`);
  }

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
        className="w-full rounded-lg border border-border bg-panel px-4 py-3 text-base placeholder:text-muted focus:border-accent focus:outline-none"
      />

      {subjects.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => insertSubject(s)}
              className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted hover:border-accent hover:text-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between text-xs text-muted min-h-[1.25rem]">
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
