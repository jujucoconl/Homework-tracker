"use client";

import { useState } from "react";

export default function TestReminderButton() {
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [message, setMessage] = useState("");

  async function run() {
    setStatus("working");
    try {
      const res = await fetch("/api/test-reminder", { method: "POST" });
      const data = await res.json();
      const parts: string[] = [];
      if (data.pushConfigured) {
        parts.push(
          data.pushSubscriberCount > 0
            ? `push sent to ${data.pushSentCount}/${data.pushSubscriberCount} device(s)`
            : "push configured, but nothing is subscribed yet"
        );
      } else {
        parts.push("push not configured (missing VAPID env vars)");
      }
      parts.push(data.emailConfigured ? (data.emailSent ? "email sent" : "email configured but failed to send") : "email not configured");
      setMessage(parts.join(" · "));
      setStatus("done");
    } catch {
      setMessage("Request failed");
      setStatus("done");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={status === "working"}
        className="text-xs rounded-md border border-border px-2.5 py-1.5 text-muted hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
      >
        {status === "working" ? "Sending…" : "Send test reminder"}
      </button>
      {message && <span className="text-[11px] text-muted max-w-xs text-right">{message}</span>}
    </div>
  );
}
