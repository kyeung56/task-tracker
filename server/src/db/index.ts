import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_URL || join(__dirname, '../../../data/tasktracker.db');

export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Roles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      permissions TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      role_id TEXT REFERENCES roles(id),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category_id TEXT REFERENCES categories(id),
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      start_date TEXT,
      estimated_hours REAL,
      logged_hours REAL DEFAULT 0,
      assignee_id TEXT REFERENCES users(id),
      creator_id TEXT REFERENCES users(id),
      parent_task_id TEXT REFERENCES tasks(id),
      tags TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      deleted_at TEXT
    )
  `);

  // Comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      mentions TEXT DEFAULT '[]',
      parent_comment_id TEXT REFERENCES comments(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )
  `);

  // Attachments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      comment_id TEXT REFERENCES comments(id),
      uploader_id TEXT NOT NULL REFERENCES users(id),
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      thumbnail_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Task history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_history (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      action_type TEXT NOT NULL,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      task_id TEXT REFERENCES tasks(id),
      actor_id TEXT REFERENCES users(id),
      is_read INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      read_at TEXT
    )
  `);

  // Workflow configs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_default INTEGER DEFAULT 0,
      statuses TEXT NOT NULL,
      transitions TEXT NOT NULL,
      role_restrictions TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Status time logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS status_time_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      entered_at TEXT NOT NULL,
      exited_at TEXT,
      duration_seconds INTEGER,
      user_id TEXT REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User notification preferences table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_notification_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      task_assigned_in_app INTEGER DEFAULT 1,
      task_assigned_email INTEGER DEFAULT 0,
      mentioned_in_app INTEGER DEFAULT 1,
      mentioned_email INTEGER DEFAULT 0,
      status_changed_in_app INTEGER DEFAULT 1,
      status_changed_email INTEGER DEFAULT 0,
      due_soon_in_app INTEGER DEFAULT 1,
      due_soon_email INTEGER DEFAULT 1,
      overdue_in_app INTEGER DEFAULT 1,
      overdue_email INTEGER DEFAULT 1,
      due_soon_days INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Email configuration table (admin settings)
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_config (
      id TEXT PRIMARY KEY,
      smtp_host TEXT NOT NULL,
      smtp_port INTEGER DEFAULT 587,
      smtp_secure INTEGER DEFAULT 0,
      smtp_user TEXT NOT NULL,
      smtp_password TEXT NOT NULL,
      from_email TEXT NOT NULL,
      from_name TEXT DEFAULT 'Task Tracker',
      is_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Email queue table
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_queue (
      id TEXT PRIMARY KEY,
      to_email TEXT NOT NULL,
      to_name TEXT,
      subject TEXT NOT NULL,
      html_body TEXT NOT NULL,
      text_body TEXT,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_error TEXT,
      notification_id TEXT REFERENCES notifications(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sent_at TEXT
    )
  `);

  // Email logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      to_email TEXT NOT NULL,
      to_name TEXT,
      subject TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      notification_id TEXT REFERENCES notifications(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Due date reminders table (to prevent duplicates)
  db.exec(`
    CREATE TABLE IF NOT EXISTS due_date_reminders (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reminder_type TEXT NOT NULL,
      reminder_date TEXT NOT NULL,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, user_id, reminder_type, reminder_date)
    )
  `);

  // Task schedules table - supports daily hours, weekly days, and deadline modes
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_schedules (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      schedule_type TEXT NOT NULL DEFAULT 'deadline',
      start_date TEXT,
      end_date TEXT,
      recurrence TEXT DEFAULT 'none',
      recurrence_end TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Task schedule time slots - for daily hours and weekly days
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_schedule_slots (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL REFERENCES task_schedules(id) ON DELETE CASCADE,
      day_of_week INTEGER,
      start_time TEXT,
      end_time TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Task schedule occurrences - generated instances for recurring tasks
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_schedule_occurrences (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      schedule_id TEXT NOT NULL REFERENCES task_schedules(id) ON DELETE CASCADE,
      occurrence_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      status TEXT DEFAULT 'scheduled',
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, occurrence_date, start_time)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks(due_date, status);
    CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_history_created ON task_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
    CREATE INDEX IF NOT EXISTS idx_status_time_logs_task ON status_time_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_status_time_logs_task_status ON status_time_logs(task_id, to_status);
    CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
    CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_at);
    CREATE INDEX IF NOT EXISTS idx_due_date_reminders_task ON due_date_reminders(task_id);
    CREATE INDEX IF NOT EXISTS idx_due_date_reminders_user ON due_date_reminders(user_id);
    CREATE INDEX IF NOT EXISTS idx_task_schedules_task ON task_schedules(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_schedules_type ON task_schedules(schedule_type);
    CREATE INDEX IF NOT EXISTS idx_task_schedule_slots_schedule ON task_schedule_slots(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_task_schedule_occurrences_task ON task_schedule_occurrences(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_schedule_occurrences_date ON task_schedule_occurrences(occurrence_date);
    CREATE INDEX IF NOT EXISTS idx_task_schedule_occurrences_schedule ON task_schedule_occurrences(schedule_id);
  `);

  console.log('Database initialized successfully');
}

export default db;
