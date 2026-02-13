import { Router } from 'express';
import db from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

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

export default router;
