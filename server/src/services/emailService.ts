import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';

// We'll import nodemailer dynamically to handle the case where it's not installed
let nodemailer: any = null;
let transporter: any = null;

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  isEnabled: boolean;
}

export interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Get email configuration from database
 */
export function getEmailConfig(): EmailConfig | null {
  const config = db.prepare('SELECT * FROM email_config LIMIT 1').get() as any;

  if (!config) {
    return null;
  }

  return {
    smtpHost: config.smtp_host,
    smtpPort: config.smtp_port || 587,
    smtpSecure: config.smtp_secure === 1,
    smtpUser: config.smtp_user,
    smtpPassword: config.smtp_password,
    fromEmail: config.from_email,
    fromName: config.from_name || 'Task Tracker',
    isEnabled: config.is_enabled === 1,
  };
}

/**
 * Update email configuration
 */
export function updateEmailConfig(config: Partial<EmailConfig>): void {
  const existing = db.prepare('SELECT id FROM email_config LIMIT 1').get() as any;

  const fields: string[] = [];
  const values: any[] = [];

  const fieldMapping: Record<string, string> = {
    smtpHost: 'smtp_host',
    smtpPort: 'smtp_port',
    smtpSecure: 'smtp_secure',
    smtpUser: 'smtp_user',
    smtpPassword: 'smtp_password',
    fromEmail: 'from_email',
    fromName: 'from_name',
    isEnabled: 'is_enabled',
  };

  for (const [key, dbField] of Object.entries(fieldMapping)) {
    if (key in config) {
      fields.push(`${dbField} = ?`);
      values.push(config[key as keyof EmailConfig]);
    }
  }

  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP');

    if (existing) {
      values.push(existing.id);
      db.prepare(`
        UPDATE email_config
        SET ${fields.join(', ')}
        WHERE id = ?
      `).run(...values);
    } else {
      const id = uuidv4();
      values.push(id);
      db.prepare(`
        INSERT INTO email_config (id, ${Object.values(fieldMapping).filter(f => fields.some(field => field.startsWith(f))).join(', ')}, updated_at)
        VALUES (?, ${values.slice(0, -1).map(() => '?').join(', ')}, CURRENT_TIMESTAMP)
      `).run(id, ...values.slice(0, -1));
    }
  }
}

/**
 * Initialize email service with configuration
 */
export async function initialize(): Promise<boolean> {
  try {
    // Try to import nodemailer
    nodemailer = await import('nodemailer');
  } catch (e) {
    console.log('nodemailer not installed, email notifications disabled');
    return false;
  }

  const config = getEmailConfig();

  if (!config || !config.isEnabled) {
    console.log('Email service disabled or not configured');
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });

    // Verify connection
    await transporter.verify();
    console.log('Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    transporter = null;
    return false;
  }
}

/**
 * Send an email
 */
export async function send(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!nodemailer || !transporter) {
    return { success: false, error: 'Email service not initialized' };
  }

  const config = getEmailConfig();
  if (!config || !config.isEnabled) {
    return { success: false, error: 'Email service disabled' };
  }

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add email to queue for later processing
 */
export async function addEmailToQueue(
  notificationId: string | null,
  userId: string,
  type: string,
  title: string,
  content?: string | null,
  taskId?: string | null,
  actorId?: string | null
): Promise<string> {
  // Get user email
  const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(userId) as any;

  if (!user) {
    throw new Error('User not found');
  }

  // Get task info if available
  let taskInfo: any = null;
  if (taskId) {
    taskInfo = db.prepare('SELECT title, description FROM tasks WHERE id = ?').get(taskId) as any;
  }

  // Get actor info if available
  let actorInfo: any = null;
  if (actorId) {
    actorInfo = db.prepare('SELECT name FROM users WHERE id = ?').get(actorId) as any;
  }

  // Generate email template
  const { html, text } = generateEmailTemplate(type, title, content, taskInfo, actorInfo);

  const queueId = uuidv4();

  db.prepare(`
    INSERT INTO email_queue (id, to_email, to_name, subject, html_body, text_body, notification_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(queueId, user.email, user.name, title, html, text, notificationId);

  return queueId;
}

/**
 * Generate HTML email template
 */
export function generateEmailTemplate(
  type: string,
  title: string,
  content?: string | null,
  taskInfo?: any,
  actorInfo?: any
): { html: string; text: string } {
  const typeLabels: Record<string, string> = {
    task_assigned: 'Task Assigned',
    mentioned: 'You were mentioned',
    status_changed: 'Status Changed',
    due_soon: 'Task Due Soon',
    overdue: 'Task Overdue',
    comment_added: 'New Comment',
  };

  const label = typeLabels[type] || 'Notification';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">${label}</h1>
  </div>
  <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="margin-top: 0; color: #333;">${title}</h2>
    ${content ? `<p style="color: #666;">${content}</p>` : ''}
    ${taskInfo ? `
      <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #667eea;">
        <h3 style="margin-top: 0; color: #333;">Task: ${taskInfo.title}</h3>
        ${taskInfo.description ? `<p style="color: #666; margin-bottom: 0;">${taskInfo.description.substring(0, 200)}${taskInfo.description.length > 200 ? '...' : ''}</p>` : ''}
      </div>
    ` : ''}
    ${actorInfo ? `<p style="color: #888; font-size: 14px;">By: ${actorInfo.name}</p>` : ''}
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
    <p style="color: #888; font-size: 12px; text-align: center;">
      This is an automated notification from Task Tracker.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
${label}

${title}
${content ? `\n${content}` : ''}
${taskInfo ? `\nTask: ${taskInfo.title}\n${taskInfo.description ? taskInfo.description.substring(0, 200) : ''}` : ''}
${actorInfo ? `\nBy: ${actorInfo.name}` : ''}

---
This is an automated notification from Task Tracker.
  `.trim();

  return { html, text };
}

/**
 * Process email queue (send pending emails)
 */
export async function processQueue(): Promise<{ sent: number; failed: number }> {
  // Check if initialized
  const config = getEmailConfig();
  if (!config || !config.isEnabled) {
    return { sent: 0, failed: 0 };
  }

  // Re-initialize if needed
  if (!transporter) {
    await initialize();
  }

  if (!transporter) {
    return { sent: 0, failed: 0 };
  }

  // Get pending emails
  const pendingEmails = db.prepare(`
    SELECT * FROM email_queue
    WHERE status = 'pending' AND attempts < 3
    ORDER BY created_at ASC
    LIMIT 10
  `).all() as any[];

  let sent = 0;
  let failed = 0;

  for (const email of pendingEmails) {
    const result = await send({
      to: email.to_email,
      toName: email.to_name,
      subject: email.subject,
      html: email.html_body,
      text: email.text_body,
    });

    if (result.success) {
      db.prepare(`
        UPDATE email_queue
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(email.id);

      // Log success
      db.prepare(`
        INSERT INTO email_logs (id, to_email, to_name, subject, status, notification_id)
        VALUES (?, ?, ?, ?, 'sent', ?)
      `).run(uuidv4(), email.to_email, email.to_name, email.subject, email.notification_id);

      sent++;
    } else {
      db.prepare(`
        UPDATE email_queue
        SET status = 'failed', attempts = attempts + 1, last_error = ?
        WHERE id = ?
      `).run(result.error, email.id);

      // Log failure
      db.prepare(`
        INSERT INTO email_logs (id, to_email, to_name, subject, status, error_message, notification_id)
        VALUES (?, ?, ?, ?, 'failed', ?, ?)
      `).run(uuidv4(), email.to_email, email.to_name, email.subject, result.error, email.notification_id);

      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Test email configuration
 */
export async function testEmailConfig(testEmail: string): Promise<{ success: boolean; error?: string }> {
  const config = getEmailConfig();

  if (!config) {
    return { success: false, error: 'Email not configured' };
  }

  // Temporarily create a test transporter
  let testTransporter: any = null;

  try {
    if (!nodemailer) {
      nodemailer = await import('nodemailer');
    }

    testTransporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });

    await testTransporter.verify();

    // Send test email
    await testTransporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: testEmail,
      subject: 'Task Tracker - Email Test',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Email Configuration Test</h2>
          <p>If you received this email, your email configuration is working correctly!</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
      text: `Email Configuration Test\n\nIf you received this email, your email configuration is working correctly!\n\nSent at: ${new Date().toISOString()}`,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    if (testTransporter) {
      testTransporter.close();
    }
  }
}

export default {
  getEmailConfig,
  updateEmailConfig,
  initialize,
  send,
  addEmailToQueue,
  generateEmailTemplate,
  processQueue,
  testEmailConfig,
};
