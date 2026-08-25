"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "unconfigured" | "denied" | "off" | "on" | "working";

export default function PushEnableButton() {
  const [status, setStatus] = useState<Status>("off");

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (!publicKey) {
      setStatus("unconfigured");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    });
  }, []);

  async function enable() {
    setStatus("working");
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
      setStatus("on");
    } catch {
      setStatus("off");
    }
  }

  if (status === "unsupported") return null;
  if (status === "unconfigured") return null;
  if (status === "on") {
    return <span className="text-xs text-slate-500">Push notifications on</span>;
  }
  if (status === "denied") {
    return <span className="text-xs text-slate-500">Notifications blocked in browser settings</span>;
  }

  return (
    <button
      onClick={enable}
      disabled={status === "working"}
      className="text-xs rounded-md border border-border px-2.5 py-1.5 text-slate-300 hover:border-accent hover:text-accent transition-colors"
    >
      {status === "working" ? "Enabling…" : "Enable push reminders"}
    </button>
  );
}
