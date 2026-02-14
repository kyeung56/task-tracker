import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  getUserPreferences,
  updateUserPreferences,
} from '../services/notificationService.js';
import {
  getEmailConfig,
  updateEmailConfig,
  testEmailConfig,
} from '../services/emailService.js';

const router = Router();

// Get notifications
router.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { page = '1', pageSize = '20', unreadOnly = 'false' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const offset = (pageNum - 1) * pageSizeNum;

    let whereClause = 'WHERE n.user_id = ?';
    const params: any[] = [req.user!.id];

    if (unreadOnly === 'true') {
      whereClause += ' AND n.is_read = 0';
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM notifications n ${whereClause}
    `).get(...params) as { total: number };

    // Get notifications
    const notifications = db.prepare(`
      SELECT
        n.*,
        t.title as task_title,
        u.name as actor_name, u.avatar_url as actor_avatar
      FROM notifications n
      LEFT JOIN tasks t ON n.task_id = t.id
      LEFT JOIN users u ON n.actor_id = u.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSizeNum, offset) as any[];

    res.json({
      success: true,
      data: notifications.map((n) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        content: n.content,
        taskId: n.task_id,
        task: n.task_id ? { id: n.task_id, title: n.task_title } : null,
        actorId: n.actor_id,
        actor: n.actor_id ? { id: n.actor_id, name: n.actor_name, avatarUrl: n.actor_avatar } : null,
        isRead: n.is_read === 1,
        metadata: JSON.parse(n.metadata || '{}'),
        createdAt: n.created_at,
        readAt: n.read_at,
      })),
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total: countResult.total,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_NOTIFICATIONS_ERROR',
        message: 'Failed to get notifications',
      },
    });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, (req: AuthRequest, res) => {
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(req.user!.id) as { count: number };

    res.json({
      success: true,
      data: { count: result.count },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_UNREAD_COUNT_ERROR',
        message: 'Failed to get unread count',
      },
    });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(id, req.user!.id);

    res.json({
      success: true,
      data: { message: 'Notification marked as read' },
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MARK_READ_ERROR',
        message: 'Failed to mark notification as read',
      },
    });
  }
});

// Mark all as read
router.put('/read-all', authMiddleware, (req: AuthRequest, res) => {
  try {
    db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND is_read = 0
    `).run(req.user!.id);

    res.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MARK_ALL_READ_ERROR',
        message: 'Failed to mark all notifications as read',
      },
    });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(id, req.user!.id);

    res.json({
      success: true,
      data: { message: 'Notification deleted' },
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_NOTIFICATION_ERROR',
        message: 'Failed to delete notification',
      },
    });
  }
});

// ============================================
// Notification Preferences Endpoints
// ============================================

// Get user notification preferences
router.get('/preferences', authMiddleware, (req: AuthRequest, res) => {
  try {
    const preferences = getUserPreferences(req.user!.id);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PREFERENCES_ERROR',
        message: 'Failed to get notification preferences',
      },
    });
  }
});

// Update user notification preferences
router.put('/preferences', authMiddleware, (req: AuthRequest, res) => {
  try {
    updateUserPreferences(req.user!.id, req.body);

    const preferences = getUserPreferences(req.user!.id);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_PREFERENCES_ERROR',
        message: 'Failed to update notification preferences',
      },
    });
  }
});

// ============================================
// Email Configuration Endpoints (Admin Only)
// ============================================

// Get email configuration
router.get('/email-config', authMiddleware, (req: AuthRequest, res) => {
  try {
    // Check admin permission (use canManageUsers as fallback for backwards compatibility)
    if (!req.user?.permissions?.canManageSettings && !req.user?.permissions?.canManageUsers) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
    }

    const config = getEmailConfig();

    // Don't expose password in response
    const safeConfig = config ? {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUser: config.smtpUser,
      smtpPasswordSet: !!config.smtpPassword,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      isEnabled: config.isEnabled,
    } : null;

    res.json({
      success: true,
      data: safeConfig,
    });
  } catch (error) {
    console.error('Get email config error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_EMAIL_CONFIG_ERROR',
        message: 'Failed to get email configuration',
      },
    });
  }
});

// Update email configuration
router.put('/email-config', authMiddleware, (req: AuthRequest, res) => {
  try {
    // Check admin permission (use canManageUsers as fallback for backwards compatibility)
    if (!req.user?.permissions?.canManageSettings && !req.user?.permissions?.canManageUsers) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
    }

    const {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      fromEmail,
      fromName,
      isEnabled,
    } = req.body;

    // Only update password if provided
    const configUpdate: any = {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      fromEmail,
      fromName,
      isEnabled,
    };

    if (smtpPassword) {
      configUpdate.smtpPassword = smtpPassword;
    }

    updateEmailConfig(configUpdate);

    const config = getEmailConfig();

    const safeConfig = config ? {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUser: config.smtpUser,
      smtpPasswordSet: !!config.smtpPassword,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      isEnabled: config.isEnabled,
    } : null;

    res.json({
      success: true,
      data: safeConfig,
    });
  } catch (error) {
    console.error('Update email config error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_EMAIL_CONFIG_ERROR',
        message: 'Failed to update email configuration',
      },
    });
  }
});

// Test email configuration
router.post('/email-config/test', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Check admin permission (use canManageUsers as fallback for backwards compatibility)
    if (!req.user?.permissions?.canManageSettings && !req.user?.permissions?.canManageUsers) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email address is required',
        },
      });
    }

    const result = await testEmailConfig(email);

    if (result.success) {
      res.json({
        success: true,
        data: { message: 'Test email sent successfully' },
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_TEST_FAILED',
          message: result.error || 'Failed to send test email',
        },
      });
    }
  } catch (error) {
    console.error('Test email config error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_EMAIL_CONFIG_ERROR',
        message: 'Failed to test email configuration',
      },
    });
  }
});

export default router;
