"use client";

import { useMemo, useState } from "react";
import { parseQuickAdd } from "@/lib/quickAdd";
import ClassSelect from "@/components/ClassSelect";
import EstimateInput from "@/components/EstimateInput";

export default function QuickAdd({ subjects, onAdded }: { subjects: string[]; onAdded: () => void }) {
  const [text, setText] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parseQuickAdd(text) : null), [text]);
  const effectiveSubject = selectedClass || parsed?.subject || "General";

  async function submit() {
    if (!parsed || !parsed.dueAt || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.title,
          subject: effectiveSubject,
          dueAt: parsed.dueAt.toISOString(),
          estimatedMinutes,
        }),
      });
      setText("");
      setEstimatedMinutes(null);
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <ClassSelect
          subjects={subjects}
          value={selectedClass}
          onChange={setSelectedClass}
          allowAuto
          className="w-52 shrink-0 rounded-lg border border-border bg-panel px-3 text-sm focus:border-accent focus:outline-none"
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder='Type it like a sentence: "worksheet ch 4 due fri 5pm"'
          className="flex-1 rounded-lg border border-border bg-panel px-4 py-3 text-base placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <EstimateInput
          value={estimatedMinutes}
          onChange={setEstimatedMinutes}
          className="w-20 shrink-0 rounded-lg border border-border bg-panel px-2 text-sm text-center placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-xs text-muted min-h-[1.25rem]">
        {parsed?.dueAt ? (
          <span>
            <span className="text-accent">{effectiveSubject}</span> · {parsed.title} · due{" "}
            {parsed.dueAt.toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {estimatedMinutes ? ` · ~${estimatedMinutes} min` : ""}
          </span>
        ) : text.trim() ? (
          <span className="text-danger">Couldn&apos;t find a date — try adding one, e.g. &quot;tomorrow&quot; or &quot;fri 5pm&quot;</span>
        ) : (
          <span>Pick a class, type the rest, press Enter to add. Minutes box is optional.</span>
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
