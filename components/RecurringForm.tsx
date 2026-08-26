"use client";

import { useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/recurrence";
import ClassSelect from "@/components/ClassSelect";

export default function RecurringForm({ subjects, onAdded }: { subjects: string[]; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("General");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [dueTime, setDueTime] = useState("23:59");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleDay(v: number) {
    setWeekdays((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v].sort()));
  }

  async function submit() {
    if (!title.trim() || weekdays.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim() || "General",
          weekdays,
          dueTime,
          timezone,
          endDate: endDate || null,
        }),
      });
      setTitle("");
      setSubject("General");
      setWeekdays([]);
      setDueTime("23:59");
      setEndDate("");
      setOpen(false);
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-muted hover:text-accent transition-colors">
        + Add repeating homework
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">New repeating homework</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-muted hover:text-ink">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title, e.g. Vocab quiz"
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <ClassSelect
          subjects={subjects}
          value={subject}
          onChange={setSubject}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_LABELS.map((d) => (
          <button
            key={d.value}
            onClick={() => toggleDay(d.value)}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              weekdays.includes(d.value)
                ? "border-accent bg-accent/20 text-accent"
                : "border-border text-muted hover:border-accent"
            }`}
          >
            {d.short}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted flex flex-col gap-1">
          Due time
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <label className="text-xs text-muted flex flex-col gap-1">
          Ends (optional)
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <button
        onClick={submit}
        disabled={!title.trim() || weekdays.length === 0 || submitting}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm text-slate-900 font-medium disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {submitting ? "Adding…" : "Add repeating homework"}
      </button>
    </div>
  );
}
