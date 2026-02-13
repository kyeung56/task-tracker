import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { sendNotificationToUser } from '../index.js';

const router = Router();

// Get comments for a task
router.get('/task/:taskId', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;

    const comments = db.prepare(`
      SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `).all(taskId) as any[];

    // Get attachments for each comment
    const commentsWithAttachments = comments.map((comment) => {
      const attachments = db.prepare(`
        SELECT a.*, u.name as uploader_name
        FROM attachments a
        JOIN users u ON a.uploader_id = u.id
        WHERE a.comment_id = ?
        ORDER BY a.created_at ASC
      `).all(comment.id) as any[];

      return {
        id: comment.id,
        taskId: comment.task_id,
        userId: comment.user_id,
        user: {
          id: comment.user_id,
          name: comment.user_name,
          avatarUrl: comment.user_avatar,
        },
        content: comment.content,
        mentions: JSON.parse(comment.mentions || '[]'),
        parentCommentId: comment.parent_comment_id,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        attachments: attachments.map((a) => ({
          id: a.id,
          taskId: a.task_id,
          commentId: a.comment_id,
          uploaderId: a.uploader_id,
          uploader: { id: a.uploader_id, name: a.uploader_name },
          fileName: a.file_name,
          filePath: a.file_path,
          fileSize: a.file_size,
          mimeType: a.mime_type,
          thumbnailPath: a.thumbnail_path,
          createdAt: a.created_at,
        })),
      };
    });

    res.json({
      success: true,
      data: commentsWithAttachments,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_COMMENTS_ERROR',
        message: 'Failed to get comments',
      },
    });
  }
});

// Create comment
router.post('/task/:taskId', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;
    const { content, mentions = [], parentCommentId } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content is required',
        },
      });
    }

    // Check if task exists
    const task = db.prepare('SELECT id, title, assignee_id, creator_id FROM tasks WHERE id = ? AND deleted_at IS NULL').get(taskId) as any;
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
        },
      });
    }

    const commentId = uuidv4();

    db.prepare(`
      INSERT INTO comments (id, task_id, user_id, content, mentions, parent_comment_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(commentId, taskId, req.user!.id, content, JSON.stringify(mentions), parentCommentId || null);

    // Log history
    db.prepare(`
      INSERT INTO task_history (id, task_id, user_id, action_type, metadata)
      VALUES (?, ?, ?, 'comment_added', ?)
    `).run(uuidv4(), taskId, req.user!.id, JSON.stringify({ commentId }));

    // Send notifications for @mentions
    const validMentions = Array.isArray(mentions) ? mentions : [];
    for (const mention of validMentions) {
      if (mention.userId && mention.userId !== req.user!.id) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, content, task_id, actor_id)
          VALUES (?, ?, 'mentioned', ?, ?, ?, ?)
        `).run(
          uuidv4(),
          mention.userId,
          '有人@了你',
          content.slice(0, 100),
          taskId,
          req.user!.id
        );

        sendNotificationToUser(mention.userId, {
          type: 'mentioned',
          title: '有人@了你',
          content: content.slice(0, 100),
          taskId,
          actorId: req.user!.id,
        });
      }
    }

    // Get created comment
    const comment = db.prepare(`
      SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(commentId) as any;

    res.status(201).json({
      success: true,
      data: {
        id: comment.id,
        taskId: comment.task_id,
        userId: comment.user_id,
        user: {
          id: comment.user_id,
          name: comment.user_name,
          avatarUrl: comment.user_avatar,
        },
        content: comment.content,
        mentions: JSON.parse(comment.mentions || '[]'),
        parentCommentId: comment.parent_comment_id,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
      },
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_COMMENT_ERROR',
        message: 'Failed to create comment',
      },
    });
  }
});

// Update comment
router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { content, mentions } = req.body;

    const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL').get(id) as any;
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COMMENT_NOT_FOUND',
          message: 'Comment not found',
        },
      });
    }

    // Only allow author to edit
    if (comment.user_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own comments',
        },
      });
    }

    db.prepare(`
      UPDATE comments
      SET content = COALESCE(?, content),
          mentions = COALESCE(?, mentions),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(content, mentions ? JSON.stringify(mentions) : undefined, id);

    const updatedComment = db.prepare(`
      SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(id) as any;

    res.json({
      success: true,
      data: {
        id: updatedComment.id,
        taskId: updatedComment.task_id,
        userId: updatedComment.user_id,
        user: {
          id: updatedComment.user_id,
          name: updatedComment.user_name,
          avatarUrl: updatedComment.user_avatar,
        },
        content: updatedComment.content,
        mentions: JSON.parse(updatedComment.mentions || '[]'),
        parentCommentId: updatedComment.parent_comment_id,
        createdAt: updatedComment.created_at,
        updatedAt: updatedComment.updated_at,
      },
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_COMMENT_ERROR',
        message: 'Failed to update comment',
      },
    });
  }
});

// Delete comment (soft delete)
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL').get(id) as any;
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COMMENT_NOT_FOUND',
          message: 'Comment not found',
        },
      });
    }

    // Only allow author or admin to delete
    if (comment.user_id !== req.user!.id && !req.user!.permissions.canDeleteTask) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own comments',
        },
      });
    }

    db.prepare('UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    res.json({
      success: true,
      data: { message: 'Comment deleted successfully' },
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_COMMENT_ERROR',
        message: 'Failed to delete comment',
      },
    });
  }
});

export default router;
