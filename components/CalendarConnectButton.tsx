"use client";

import { useEffect, useState } from "react";
import ConfirmButton from "@/components/ConfirmButton";

type Status = "loading" | "unconfigured" | "connected" | "disconnected";

export default function CalendarConnectButton() {
  const [status, setStatus] = useState<Status>("loading");
  const [callbackMessage, setCallbackMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/calendar/status");
      const data = await res.json();
      if (!data.configured) setStatus("unconfigured");
      else setStatus(data.connected ? "connected" : "disconnected");
    } catch {
      setStatus("unconfigured");
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendarParam = params.get("calendar");
    if (calendarParam === "connected") {
      setCallbackMessage("Google Calendar connected.");
    } else if (calendarParam === "error") {
      setCallbackMessage("Couldn't connect Google Calendar — check your credentials and try again.");
    }
    if (calendarParam) {
      params.delete("calendar");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", newUrl);
    }
    refresh();
  }, []);

  async function disconnect() {
    await fetch("/api/calendar/disconnect", { method: "POST" });
    refresh();
  }

  if (status === "loading" || status === "unconfigured") return null;

  return (
    <div className="flex items-center gap-2">
      {callbackMessage && <span className="text-xs text-muted">{callbackMessage}</span>}
      {status === "connected" ? (
        <>
          <span className="text-xs text-muted">📅 Calendar connected</span>
          <ConfirmButton
            onConfirm={disconnect}
            className="text-xs text-muted hover:text-danger"
            confirmClassName="text-xs text-danger font-medium"
          >
            Disconnect
          </ConfirmButton>
        </>
      ) : (
        <a
          href="/api/calendar/connect"
          className="text-xs rounded-md border border-border px-2.5 py-1.5 text-muted hover:border-accent hover:text-accent transition-colors"
        >
          Connect Google Calendar
        </a>
      )}
    </div>
  );
}
