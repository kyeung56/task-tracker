import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { sendNotificationToUser } from '../index.js';
import { addEmailToQueue } from './emailService.js';

export interface NotificationPreferences {
  taskAssignedInApp: boolean;
  taskAssignedEmail: boolean;
  mentionedInApp: boolean;
  mentionedEmail: boolean;
  statusChangedInApp: boolean;
  statusChangedEmail: boolean;
  dueSoonInApp: boolean;
  dueSoonEmail: boolean;
  overdueInApp: boolean;
  overdueEmail: boolean;
  dueSoonDays: number;
}

export interface CreateNotificationOptions {
  userId: string;
  type: 'task_assigned' | 'mentioned' | 'status_changed' | 'priority_changed' | 'due_soon' | 'overdue' | 'comment_added';
  title: string;
  content?: string;
  taskId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
}

const defaultPreferences: NotificationPreferences = {
  taskAssignedInApp: true,
  taskAssignedEmail: false,
  mentionedInApp: true,
  mentionedEmail: false,
  statusChangedInApp: true,
  statusChangedEmail: false,
  dueSoonInApp: true,
  dueSoonEmail: true,
  overdueInApp: true,
  overdueEmail: true,
  dueSoonDays: 1,
};

/**
 * Get user notification preferences
 */
export function getUserPreferences(userId: string): NotificationPreferences {
  const prefs = db.prepare(`
    SELECT * FROM user_notification_preferences WHERE user_id = ?
  `).get(userId) as any;

  if (!prefs) {
    // Create default preferences for user
    db.prepare(`
      INSERT INTO user_notification_preferences (
        id, user_id, task_assigned_in_app, task_assigned_email,
        mentioned_in_app, mentioned_email, status_changed_in_app, status_changed_email,
        due_soon_in_app, due_soon_email, overdue_in_app, overdue_email, due_soon_days
      ) VALUES (?, ?, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1)
    `).run(uuidv4(), userId);

    return defaultPreferences;
  }

  return {
    taskAssignedInApp: prefs.task_assigned_in_app === 1,
    taskAssignedEmail: prefs.task_assigned_email === 1,
    mentionedInApp: prefs.mentioned_in_app === 1,
    mentionedEmail: prefs.mentioned_email === 1,
    statusChangedInApp: prefs.status_changed_in_app === 1,
    statusChangedEmail: prefs.status_changed_email === 1,
    dueSoonInApp: prefs.due_soon_in_app === 1,
    dueSoonEmail: prefs.due_soon_email === 1,
    overdueInApp: prefs.overdue_in_app === 1,
    overdueEmail: prefs.overdue_email === 1,
    dueSoonDays: prefs.due_soon_days || 1,
  };
}

/**
 * Update user notification preferences
 */
export function updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): void {
  const fields: string[] = [];
  const values: any[] = [];

  const fieldMapping: Record<string, string> = {
    taskAssignedInApp: 'task_assigned_in_app',
    taskAssignedEmail: 'task_assigned_email',
    mentionedInApp: 'mentioned_in_app',
    mentionedEmail: 'mentioned_email',
    statusChangedInApp: 'status_changed_in_app',
    statusChangedEmail: 'status_changed_email',
    dueSoonInApp: 'due_soon_in_app',
    dueSoonEmail: 'due_soon_email',
    overdueInApp: 'overdue_in_app',
    overdueEmail: 'overdue_email',
    dueSoonDays: 'due_soon_days',
  };

  for (const [key, dbField] of Object.entries(fieldMapping)) {
    if (key in preferences) {
      fields.push(`${dbField} = ?`);
      values.push(preferences[key as keyof NotificationPreferences]);
    }
  }

  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    db.prepare(`
      UPDATE user_notification_preferences
      SET ${fields.join(', ')}
      WHERE user_id = ?
    `).run(...values);
  }
}

/**
 * Create a notification with preference checking
 */
export async function createNotification(options: CreateNotificationOptions): Promise<string | null> {
  const { userId, type, title, content, taskId, actorId, metadata, sendEmail = false } = options;

  // Get user preferences
  const prefs = getUserPreferences(userId);

  // Check if in-app notification is enabled for this type
  let inAppEnabled = true;
  let emailEnabled = sendEmail;

  switch (type) {
    case 'task_assigned':
      inAppEnabled = prefs.taskAssignedInApp;
      emailEnabled = emailEnabled || prefs.taskAssignedEmail;
      break;
    case 'mentioned':
      inAppEnabled = prefs.mentionedInApp;
      emailEnabled = emailEnabled || prefs.mentionedEmail;
      break;
    case 'status_changed':
      inAppEnabled = prefs.statusChangedInApp;
      emailEnabled = emailEnabled || prefs.statusChangedEmail;
      break;
    case 'due_soon':
      inAppEnabled = prefs.dueSoonInApp;
      emailEnabled = emailEnabled || prefs.dueSoonEmail;
      break;
    case 'overdue':
      inAppEnabled = prefs.overdueInApp;
      emailEnabled = emailEnabled || prefs.overdueEmail;
      break;
  }

  if (!inAppEnabled && !emailEnabled) {
    return null;
  }

  // Don't notify self
  if (actorId && actorId === userId) {
    return null;
  }

  const notificationId = uuidv4();

  // Create notification record if in-app is enabled
  if (inAppEnabled) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, content, task_id, actor_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(notificationId, userId, type, title, content || null, taskId || null, actorId || null, JSON.stringify(metadata || {}));

    // Send real-time notification via WebSocket
    sendNotificationToUser(userId, {
      id: notificationId,
      type,
      title,
      content,
      taskId,
      actorId,
    });
  }

  // Queue email if enabled
  if (emailEnabled) {
    await addEmailToQueue(notificationId, userId, type, title, content, taskId, actorId);
  }

  return notificationId;
}

/**
 * Notify when a task is assigned to a user
 */
export async function notifyTaskAssignment(
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  actorId: string
): Promise<string | null> {
  // Get actor info for notification
  const actor = db.prepare('SELECT name FROM users WHERE id = ?').get(actorId) as any;

  return createNotification({
    userId: assigneeId,
    type: 'task_assigned',
    title: `New Task Assigned: ${taskTitle}`,
    content: actor ? `${actor.name} assigned this task to you` : 'A task has been assigned to you',
    taskId,
    actorId,
    metadata: { taskTitle },
  });
}

/**
 * Notify when a user is mentioned
 */
export async function notifyMention(
  taskId: string,
  taskTitle: string,
  mentionedUserId: string,
  actorId: string,
  mentionContext?: string
): Promise<string | null> {
  return createNotification({
    userId: mentionedUserId,
    type: 'mentioned',
    title: `You were mentioned in: ${taskTitle}`,
    content: mentionContext || 'You were mentioned in a task',
    taskId,
    actorId,
    metadata: { taskTitle, context: mentionContext },
  });
}

/**
 * Parse @mentions from content and trigger notifications
 * Supports @username and @[User Name] formats
 */
export async function processMentions(
  content: string,
  taskId: string,
  taskTitle: string,
  actorId: string
): Promise<string[]> {
  const mentionedUserIds: string[] = [];

  // Match @username format
  const usernamePattern = /@(\w+)/g;
  // Match @[User Name] format
  const displayNamePattern = /@\[([^\]]+)\]/g;

  let match;

  // Process @username mentions
  while ((match = usernamePattern.exec(content)) !== null) {
    const username = match[1];
    const user = db.prepare('SELECT id FROM users WHERE id = ? OR name = ? OR email = ?').get(username, username, username) as any;

    if (user && !mentionedUserIds.includes(user.id)) {
      mentionedUserIds.push(user.id);
      await notifyMention(taskId, taskTitle, user.id, actorId, content.substring(Math.max(0, match.index - 50), match.index + 50));
    }
  }

  // Process @[User Name] mentions
  while ((match = displayNamePattern.exec(content)) !== null) {
    const displayName = match[1];
    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(displayName) as any;

    if (user && !mentionedUserIds.includes(user.id)) {
      mentionedUserIds.push(user.id);
      await notifyMention(taskId, taskTitle, user.id, actorId, content.substring(Math.max(0, match.index - 50), match.index + 50));
    }
  }

  return mentionedUserIds;
}

/**
 * Check for due date reminders (called by scheduler)
 */
export async function checkDueDateReminders(): Promise<void> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Get all users with their preferences
  const users = db.prepare('SELECT id FROM users WHERE is_active = 1').all() as any[];

  for (const user of users) {
    const prefs = getUserPreferences(user.id);

    // Check for tasks due soon
    if (prefs.dueSoonInApp || prefs.dueSoonEmail) {
      const dueSoonDate = new Date(now);
      dueSoonDate.setDate(dueSoonDate.getDate() + prefs.dueSoonDays);
      const dueSoonDateStr = dueSoonDate.toISOString().split('T')[0];

      const tasksDueSoon = db.prepare(`
        SELECT t.id, t.title, t.due_date, t.assignee_id
        FROM tasks t
        WHERE t.assignee_id = ?
          AND t.due_date = ?
          AND t.status NOT IN ('completed', 'cancelled')
          AND t.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM due_date_reminders ddr
            WHERE ddr.task_id = t.id
              AND ddr.user_id = ?
              AND ddr.reminder_type = 'due_soon'
              AND ddr.reminder_date = ?
          )
      `).all(user.id, dueSoonDateStr, user.id, dueSoonDateStr) as any[];

      for (const task of tasksDueSoon) {
        await createNotification({
          userId: user.id,
          type: 'due_soon',
          title: `Task Due Soon: ${task.title}`,
          content: `This task is due on ${task.due_date}`,
          taskId: task.id,
          sendEmail: prefs.dueSoonEmail,
        });

        // Record reminder sent
        db.prepare(`
          INSERT INTO due_date_reminders (id, task_id, user_id, reminder_type, reminder_date)
          VALUES (?, ?, ?, 'due_soon', ?)
        `).run(uuidv4(), task.id, user.id, dueSoonDateStr);
      }
    }

    // Check for overdue tasks
    if (prefs.overdueInApp || prefs.overdueEmail) {
      const overdueTasks = db.prepare(`
        SELECT t.id, t.title, t.due_date, t.assignee_id
        FROM tasks t
        WHERE t.assignee_id = ?
          AND t.due_date < ?
          AND t.status NOT IN ('completed', 'cancelled')
          AND t.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM due_date_reminders ddr
            WHERE ddr.task_id = t.id
              AND ddr.user_id = ?
              AND ddr.reminder_type = 'overdue'
              AND ddr.reminder_date = ?
          )
      `).all(user.id, today, user.id, today) as any[];

      for (const task of overdueTasks) {
        await createNotification({
          userId: user.id,
          type: 'overdue',
          title: `Task Overdue: ${task.title}`,
          content: `This task was due on ${task.due_date}`,
          taskId: task.id,
          sendEmail: prefs.overdueEmail,
        });

        // Record reminder sent
        db.prepare(`
          INSERT INTO due_date_reminders (id, task_id, user_id, reminder_type, reminder_date)
          VALUES (?, ?, ?, 'overdue', ?)
        `).run(uuidv4(), task.id, user.id, today);
      }
    }
  }
}

export default {
  getUserPreferences,
  updateUserPreferences,
  createNotification,
  notifyTaskAssignment,
  notifyMention,
  processMentions,
  checkDueDateReminders,
};
