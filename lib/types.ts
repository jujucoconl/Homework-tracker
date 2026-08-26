export type ReminderType = "24h" | "8h" | "1h";

export interface Task {
  id: string;
  title: string;
  subject: string;
  due_at: string;
  notes: string | null;
  completed: number;
  completed_at: string | null;
  recurring_template_id: string | null;
  created_at: string;
}

export interface RecurringTemplate {
  id: string;
  title: string;
  subject: string;
  weekdays: string;
  due_time: string;
  timezone: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  active: number;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface SnoozeRow {
  id: string;
  task_id: string;
  fire_at: string;
  sent: number;
  created_at: string;
}
