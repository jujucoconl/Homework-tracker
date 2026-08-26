import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

let client: Client | null = null;
let initPromise: Promise<void> | null = null;

function getClient(): Client {
  if (!client) {
    const url = process.env.DATABASE_URL || "file:./data/local.db";
    const authToken = process.env.DATABASE_AUTH_TOKEN;

    if (url.startsWith("file:")) {
      const filePath = url.slice("file:".length);
      const dir = path.dirname(filePath);
      if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
    }

    client = createClient({ url, authToken });
  }
  return client;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS recurring_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'General',
  weekdays TEXT NOT NULL,
  due_time TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  start_date TEXT NOT NULL,
  end_date TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'General',
  due_at TEXT NOT NULL,
  notes TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  recurring_template_id TEXT REFERENCES recurring_templates(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_template ON tasks(recurring_template_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

CREATE TABLE IF NOT EXISTS reminder_log (
  task_id TEXT NOT NULL,
  type TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  PRIMARY KEY (task_id, type)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS snoozes (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  fire_at TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snoozes_fire_at ON snoozes(fire_at);
`;

async function init(): Promise<void> {
  const db = getClient();
  await db.execute("PRAGMA foreign_keys = ON");
  const statements = SCHEMA.split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await db.execute(stmt);
  }
}

export async function getDb(): Promise<Client> {
  if (!initPromise) {
    initPromise = init();
  }
  await initPromise;
  return getClient();
}
