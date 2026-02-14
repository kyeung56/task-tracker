import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { sendNotificationToUser } from '../index.js';
import { notifyTaskAssignment, processMentions } from '../services/notificationService.js';

const router = Router();

// Get all tasks with filtering and pagination
router.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const {
      status,
      priority,
      categoryId,
      assigneeId,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      page = '1',
      pageSize = '50',
      startDate,
      endDate,
    } = req.query;

    let whereClause = 'WHERE t.deleted_at IS NULL';
    const params: any[] = [];

    // Filter by user's view permission
    if (!req.user?.permissions.canViewAllTasks) {
      whereClause += ' AND (t.assignee_id = ? OR t.creator_id = ?)';
      params.push(req.user.id, req.user.id);
    }

    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }
    if (priority) {
      whereClause += ' AND t.priority = ?';
      params.push(priority);
    }
    if (categoryId) {
      whereClause += ' AND t.category_id = ?';
      params.push(categoryId);
    }
    if (assigneeId) {
      whereClause += ' AND t.assignee_id = ?';
      params.push(assigneeId);
    }
    if (search) {
      whereClause += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (startDate) {
      whereClause += ' AND t.due_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND t.due_date <= ?';
      params.push(endDate);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM tasks t ${whereClause}`;
    const countResult = db.prepare(countQuery).get(...params) as { total: number };
    const total = countResult.total;

    // Build sort
    const validSortFields = ['created_at', 'due_date', 'priority', 'status', 'title', 'updated_at'];
    const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'created_at';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const offset = (pageNum - 1) * pageSizeNum;

    const tasksQuery = `
      SELECT
        t.*,
        c.name as category_name, c.color as category_color,
        u.name as assignee_name, u.avatar_url as assignee_avatar,
        creator.name as creator_name, creator.avatar_url as creator_avatar
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users creator ON t.creator_id = creator.id
      ${whereClause}
      ORDER BY t.${sortField} ${order}
      LIMIT ? OFFSET ?
    `;

    const tasks = db.prepare(tasksQuery).all(...params, pageSizeNum, offset) as any[];

    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      categoryId: task.category_id,
      category: task.category_name
        ? { id: task.category_id, name: task.category_name, color: task.category_color }
        : null,
      priority: task.priority,
      status: task.status,
      dueDate: task.due_date,
      startDate: task.start_date,
      estimatedHours: task.estimated_hours,
      loggedHours: task.logged_hours,
      assigneeId: task.assignee_id,
      assignee: task.assignee_id
        ? { id: task.assignee_id, name: task.assignee_name, avatarUrl: task.assignee_avatar }
        : null,
      creatorId: task.creator_id,
      creator: { id: task.creator_id, name: task.creator_name, avatarUrl: task.creator_avatar },
      parentTaskId: task.parent_task_id,
      tags: JSON.parse(task.tags || '[]'),
      metadata: JSON.parse(task.metadata || '{}'),
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      completedAt: task.completed_at,
    }));

    res.json({
      success: true,
      data: formattedTasks,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_TASKS_ERROR',
        message: 'Failed to get tasks',
      },
    });
  }
});

// Get task by ID
router.get('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const task = db.prepare(`
      SELECT
        t.*,
        c.name as category_name, c.color as category_color,
        u.name as assignee_name, u.avatar_url as assignee_avatar,
        creator.name as creator_name, creator.avatar_url as creator_avatar
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users creator ON t.creator_id = creator.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `).get(req.params.id) as any;

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
        },
      });
    }

    // Check permission
    if (!req.user?.permissions.canViewAllTasks &&
        task.assignee_id !== req.user?.id &&
        task.creator_id !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this task',
        },
      });
    }

    // Get comments
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `).all(task.id) as any[];

    // Get attachments
    const attachments = db.prepare(`
      SELECT a.*, u.name as uploader_name
      FROM attachments a
      JOIN users u ON a.uploader_id = u.id
      WHERE a.task_id = ?
      ORDER BY a.created_at DESC
    `).all(task.id) as any[];

    // Get history
    const history = db.prepare(`
      SELECT h.*, u.name as user_name
      FROM task_history h
      JOIN users u ON h.user_id = u.id
      WHERE h.task_id = ?
      ORDER BY h.created_at DESC
      LIMIT 50
    `).all(task.id) as any[];

    // Get subtasks
    const subtasks = db.prepare(`
      SELECT
        t.id, t.title, t.status, t.priority, t.due_date,
        u.name as assignee_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.parent_task_id = ? AND t.deleted_at IS NULL
      ORDER BY t.created_at ASC
    `).all(task.id) as any[];

    res.json({
      success: true,
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        categoryId: task.category_id,
        category: task.category_name
          ? { id: task.category_id, name: task.category_name, color: task.category_color }
          : null,
        priority: task.priority,
        status: task.status,
        dueDate: task.due_date,
        startDate: task.start_date,
        estimatedHours: task.estimated_hours,
        loggedHours: task.logged_hours,
        assigneeId: task.assignee_id,
        assignee: task.assignee_id
          ? { id: task.assignee_id, name: task.assignee_name, avatarUrl: task.assignee_avatar }
          : null,
        creatorId: task.creator_id,
        creator: { id: task.creator_id, name: task.creator_name, avatarUrl: task.creator_avatar },
        parentTaskId: task.parent_task_id,
        tags: JSON.parse(task.tags || '[]'),
        metadata: JSON.parse(task.metadata || '{}'),
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        completedAt: task.completed_at,
        comments: comments.map((c) => ({
          id: c.id,
          taskId: c.task_id,
          userId: c.user_id,
          user: { id: c.user_id, name: c.user_name, avatarUrl: c.user_avatar },
          content: c.content,
          mentions: JSON.parse(c.mentions || '[]'),
          parentCommentId: c.parent_comment_id,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
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
        history: history.map((h) => ({
          id: h.id,
          taskId: h.task_id,
          userId: h.user_id,
          user: { id: h.user_id, name: h.user_name },
          actionType: h.action_type,
          fieldName: h.field_name,
          oldValue: h.old_value,
          newValue: h.new_value,
          metadata: JSON.parse(h.metadata || '{}'),
          createdAt: h.created_at,
        })),
        subTasks: subtasks.map((st) => ({
          id: st.id,
          title: st.title,
          status: st.status,
          priority: st.priority,
          dueDate: st.due_date,
          assignee: st.assignee_name ? { name: st.assignee_name } : null,
        })),
      },
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_TASK_ERROR',
        message: 'Failed to get task',
      },
    });
  }
});

// Create task
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      description,
      categoryId,
      priority = 'medium',
      status = 'pending',
      dueDate,
      startDate,
      estimatedHours,
      assigneeId,
      parentTaskId,
      tags = [],
      metadata = {},
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title is required',
        },
      });
    }

    const taskId = uuidv4();

    db.prepare(`
      INSERT INTO tasks (
        id, title, description, category_id, priority, status,
        due_date, start_date, estimated_hours, assignee_id, creator_id,
        parent_task_id, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      title,
      description || null,
      categoryId || null,
      priority,
      status,
      dueDate || null,
      startDate || null,
      estimatedHours || null,
      assigneeId || null,
      req.user!.id,
      parentTaskId || null,
      JSON.stringify(tags),
      JSON.stringify(metadata)
    );

    // Log history
    db.prepare(`
      INSERT INTO task_history (id, task_id, user_id, action_type)
      VALUES (?, ?, ?, 'created')
    `).run(uuidv4(), taskId, req.user!.id);

    // Create initial status time log
    db.prepare(`
      INSERT INTO status_time_logs (id, task_id, from_status, to_status, entered_at, user_id)
      VALUES (?, ?, NULL, ?, ?, ?)
    `).run(uuidv4(), taskId, status, new Date().toISOString(), req.user!.id);

    // Send notification to assignee using notification service
    if (assigneeId && assigneeId !== req.user!.id) {
      await notifyTaskAssignment(taskId, title, assigneeId, req.user!.id);
    }

    // Process @mentions in description
    if (description) {
      await processMentions(description, taskId, title, req.user!.id);
    }

    // Get created task
    const task = db.prepare(`
      SELECT
        t.*,
        c.name as category_name, c.color as category_color,
        u.name as assignee_name, u.avatar_url as assignee_avatar
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `).get(taskId) as any;

    res.status(201).json({
      success: true,
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        categoryId: task.category_id,
        category: task.category_name
          ? { id: task.category_id, name: task.category_name, color: task.category_color }
          : null,
        priority: task.priority,
        status: task.status,
        dueDate: task.due_date,
        startDate: task.start_date,
        estimatedHours: task.estimated_hours,
        loggedHours: task.logged_hours,
        assigneeId: task.assignee_id,
        assignee: task.assignee_id
          ? { id: task.assignee_id, name: task.assignee_name, avatarUrl: task.assignee_avatar }
          : null,
        creatorId: task.creator_id,
        parentTaskId: task.parent_task_id,
        tags: JSON.parse(task.tags || '[]'),
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      },
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_TASK_ERROR',
        message: 'Failed to create task',
      },
    });
  }
});

// Update task
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get current task
    const currentTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL').get(id) as any;
    if (!currentTask) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
        },
      });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    const historyRecords: any[] = [];

    const trackableFields = ['status', 'priority', 'assignee_id', 'due_date', 'title', 'description', 'category_id'];

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key === 'assigneeId' ? 'assignee_id' :
                      key === 'categoryId' ? 'category_id' :
                      key === 'dueDate' ? 'due_date' :
                      key === 'startDate' ? 'start_date' :
                      key === 'estimatedHours' ? 'estimated_hours' :
                      key === 'loggedHours' ? 'logged_hours' :
                      key === 'parentTaskId' ? 'parent_task_id' : key;

      if (['title', 'description', 'category_id', 'priority', 'status', 'due_date', 'start_date',
           'estimated_hours', 'logged_hours', 'assignee_id', 'parent_task_id', 'tags', 'metadata'].includes(dbField)) {
        updateFields.push(`${dbField} = ?`);

        if (dbField === 'tags' || dbField === 'metadata') {
          updateValues.push(JSON.stringify(value));
        } else {
          updateValues.push(value);
        }

        // Track history for certain fields
        if (trackableFields.includes(dbField) && currentTask[dbField] !== value) {
          const fieldName = dbField === 'assignee_id' ? 'assignee' :
                           dbField === 'category_id' ? 'category' :
                           dbField === 'due_date' ? 'dueDate' : dbField;

          historyRecords.push({
            actionType: dbField === 'status' ? 'status_change' :
                       dbField === 'priority' ? 'priority_change' :
                       dbField === 'assignee_id' ? 'assignee_change' :
                       dbField === 'due_date' ? 'due_date_change' : 'updated',
            fieldName,
            oldValue: currentTask[dbField],
            newValue: value,
          });
        }
      }
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);

      db.prepare(`UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

      // Log history
      for (const record of historyRecords) {
        db.prepare(`
          INSERT INTO task_history (id, task_id, user_id, action_type, field_name, old_value, new_value)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), id, req.user!.id, record.actionType, record.fieldName, record.oldValue, record.newValue);
      }

      // Send notifications for status changes
      const statusRecord = historyRecords.find(r => r.fieldName === 'status');
      if (statusRecord && currentTask.assignee_id && currentTask.assignee_id !== req.user!.id) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, content, task_id, actor_id)
          VALUES (?, ?, 'status_changed', ?, ?, ?, ?)
        `).run(
          uuidv4(),
          currentTask.assignee_id,
          `任务状态更新: ${currentTask.title}`,
          `${statusRecord.oldValue} → ${statusRecord.newValue}`,
          id,
          req.user!.id
        );

        sendNotificationToUser(currentTask.assignee_id, {
          type: 'status_changed',
          title: `任务状态更新: ${currentTask.title}`,
          content: `${statusRecord.oldValue} → ${statusRecord.newValue}`,
          taskId: id,
          actorId: req.user!.id,
        });
      }

      // Send notification for assignee change (notify NEW assignee)
      const assigneeRecord = historyRecords.find(r => r.fieldName === 'assignee');
      if (assigneeRecord && assigneeRecord.newValue && assigneeRecord.newValue !== req.user!.id) {
        await notifyTaskAssignment(id, currentTask.title, assigneeRecord.newValue, req.user!.id);
      }

      // Process @mentions in description update
      if ('description' in updates && updates.description) {
        await processMentions(updates.description as string, id, currentTask.title, req.user!.id);
      }
    }

    // Get updated task
    const task = db.prepare(`
      SELECT
        t.*,
        c.name as category_name, c.color as category_color,
        u.name as assignee_name, u.avatar_url as assignee_avatar
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `).get(id) as any;

    res.json({
      success: true,
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        categoryId: task.category_id,
        category: task.category_name
          ? { id: task.category_id, name: task.category_name, color: task.category_color }
          : null,
        priority: task.priority,
        status: task.status,
        dueDate: task.due_date,
        startDate: task.start_date,
        estimatedHours: task.estimated_hours,
        loggedHours: task.logged_hours,
        assigneeId: task.assignee_id,
        assignee: task.assignee_id
          ? { id: task.assignee_id, name: task.assignee_name, avatarUrl: task.assignee_avatar }
          : null,
        creatorId: task.creator_id,
        parentTaskId: task.parent_task_id,
        tags: JSON.parse(task.tags || '[]'),
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      },
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_TASK_ERROR',
        message: 'Failed to update task',
      },
    });
  }
});

// Update task status with time tracking
router.put('/:id/status', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status is required',
        },
      });
    }

    const currentTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL').get(id) as any;
    if (!currentTask) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
        },
      });
    }

    // Skip if status is the same
    if (currentTask.status === status) {
      return res.json({
        success: true,
        data: { id, status, completedAt: currentTask.completed_at },
      });
    }

    const now = new Date().toISOString();
    const completedAt = status === 'completed' ? now : null;

    // Close previous status time log
    const previousLog = db.prepare(`
      SELECT id, entered_at FROM status_time_logs
      WHERE task_id = ? AND exited_at IS NULL
      ORDER BY entered_at DESC LIMIT 1
    `).get(id) as any;

    if (previousLog) {
      const enteredAt = new Date(previousLog.entered_at);
      const exitedAt = new Date(now);
      const durationSeconds = Math.floor((exitedAt.getTime() - enteredAt.getTime()) / 1000);

      db.prepare(`
        UPDATE status_time_logs
        SET exited_at = ?, duration_seconds = ?
        WHERE id = ?
      `).run(now, durationSeconds, previousLog.id);
    }

    // Create new status time log
    db.prepare(`
      INSERT INTO status_time_logs (id, task_id, from_status, to_status, entered_at, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), id, currentTask.status, status, now, req.user!.id);

    // Update task status
    db.prepare(`
      UPDATE tasks
      SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, completedAt, id);

    // Log history
    db.prepare(`
      INSERT INTO task_history (id, task_id, user_id, action_type, field_name, old_value, new_value)
      VALUES (?, ?, ?, 'status_change', 'status', ?, ?)
    `).run(uuidv4(), id, req.user!.id, currentTask.status, status);

    res.json({
      success: true,
      data: { id, status, completedAt },
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_STATUS_ERROR',
        message: 'Failed to update status',
      },
    });
  }
});

// Log time
router.post('/:id/log-time', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { hours } = req.body;

    if (typeof hours !== 'number' || hours <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Hours must be a positive number',
        },
      });
    }

    const task = db.prepare('SELECT logged_hours FROM tasks WHERE id = ? AND deleted_at IS NULL').get(id) as any;
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
        },
      });
    }

    const newLoggedHours = (task.logged_hours || 0) + hours;

    db.prepare(`
      UPDATE tasks SET logged_hours = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(newLoggedHours, id);

    res.json({
      success: true,
      data: { id, loggedHours: newLoggedHours },
    });
  } catch (error) {
    console.error('Log time error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOG_TIME_ERROR',
        message: 'Failed to log time',
      },
    });
  }
});

// Delete task (soft delete)
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
        },
      });
    }

    db.prepare('UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    res.json({
      success: true,
      data: { message: 'Task deleted successfully' },
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_TASK_ERROR',
        message: 'Failed to delete task',
      },
    });
  }
});

// Get task history
router.get('/:id/history', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const history = db.prepare(`
      SELECT h.*, u.name as user_name, u.avatar_url as user_avatar
      FROM task_history h
      JOIN users u ON h.user_id = u.id
      WHERE h.task_id = ?
      ORDER BY h.created_at DESC
    `).all(id) as any[];

    res.json({
      success: true,
      data: history.map((h) => ({
        id: h.id,
        taskId: h.task_id,
        userId: h.user_id,
        user: { id: h.user_id, name: h.user_name, avatarUrl: h.user_avatar },
        actionType: h.action_type,
        fieldName: h.field_name,
        oldValue: h.old_value,
        newValue: h.new_value,
        metadata: JSON.parse(h.metadata || '{}'),
        createdAt: h.created_at,
      })),
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_HISTORY_ERROR',
        message: 'Failed to get task history',
      },
    });
  }
});

// Get task status time logs
router.get('/:id/status-times', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const statusTimes = db.prepare(`
      SELECT stl.*, u.name as user_name, u.avatar_url as user_avatar
      FROM status_time_logs stl
      LEFT JOIN users u ON stl.user_id = u.id
      WHERE stl.task_id = ?
      ORDER BY stl.entered_at DESC
    `).all(id) as any[];

    res.json({
      success: true,
      data: statusTimes.map((st) => ({
        id: st.id,
        taskId: st.task_id,
        fromStatus: st.from_status,
        toStatus: st.to_status,
        enteredAt: st.entered_at,
        exitedAt: st.exited_at,
        durationSeconds: st.duration_seconds,
        userId: st.user_id,
        user: st.user_id ? { id: st.user_id, name: st.user_name, avatarUrl: st.user_avatar } : null,
        createdAt: st.created_at,
      })),
    });
  } catch (error) {
    console.error('Get status times error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STATUS_TIMES_ERROR',
        message: 'Failed to get status time logs',
      },
    });
  }
});

// Get task status time summary
router.get('/:id/status-summary', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const summary = db.prepare(`
      SELECT
        to_status as status,
        SUM(duration_seconds) as total_time_seconds,
        COUNT(*) as visit_count
      FROM status_time_logs
      WHERE task_id = ? AND duration_seconds IS NOT NULL
      GROUP BY to_status
      ORDER BY total_time_seconds DESC
    `).all(id) as any[];

    // Get current status time (not yet exited)
    const currentStatusLog = db.prepare(`
      SELECT to_status, entered_at
      FROM status_time_logs
      WHERE task_id = ? AND exited_at IS NULL
      ORDER BY entered_at DESC LIMIT 1
    `).get(id) as any;

    const result = summary.map((s) => ({
      status: s.status,
      totalTimeSeconds: s.total_time_seconds || 0,
      visitCount: s.visit_count || 0,
    }));

    // Add current status ongoing time
    if (currentStatusLog) {
      const existingEntry = result.find((r: any) => r.status === currentStatusLog.to_status);
      if (existingEntry) {
        // Add current ongoing time to the total
        const currentDuration = Math.floor((Date.now() - new Date(currentStatusLog.entered_at).getTime()) / 1000);
        existingEntry.totalTimeSeconds += currentDuration;
      } else {
        const currentDuration = Math.floor((Date.now() - new Date(currentStatusLog.entered_at).getTime()) / 1000);
        result.push({
          status: currentStatusLog.to_status,
          totalTimeSeconds: currentDuration,
          visitCount: 1,
        });
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get status summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STATUS_SUMMARY_ERROR',
        message: 'Failed to get status time summary',
      },
    });
  }
});

// ============================================
// Task Schedule Routes
// ============================================

// Helper function to generate occurrences for a schedule
function generateOccurrences(
  scheduleId: string,
  taskId: string,
  scheduleType: string,
  startDate: string | null,
  endDate: string | null,
  recurrence: string,
  recurrenceEnd: string | null,
  slots: any[]
) {
  const occurrences: any[] = [];
  const now = new Date();
  const maxOccurrences = 365; // Limit to prevent infinite loops
  let count = 0;

  if (scheduleType === 'deadline') {
    // For deadline type, just create one occurrence on the due date
    if (startDate) {
      const occurrenceId = uuidv4();
      db.prepare(`
        INSERT INTO task_schedule_occurrences (id, task_id, schedule_id, occurrence_date, status)
        VALUES (?, ?, ?, ?, 'scheduled')
      `).run(occurrenceId, taskId, scheduleId, startDate);
    }
    return;
  }

  if (scheduleType === 'daily_hours' && slots.length > 0) {
    // Generate occurrences for daily time slots
    let currentDate = startDate ? new Date(startDate) : new Date();
    const endLimit = recurrenceEnd ? new Date(recurrenceEnd) :
                     endDate ? new Date(endDate) :
                     new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days default

    while (currentDate <= endLimit && count < maxOccurrences) {
      const dateStr = currentDate.toISOString().split('T')[0];

      for (const slot of slots) {
        const occurrenceId = uuidv4();
        db.prepare(`
          INSERT INTO task_schedule_occurrences (id, task_id, schedule_id, occurrence_date, start_time, end_time, status)
          VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
        `).run(occurrenceId, taskId, scheduleId, dateStr, slot.startTime, slot.endTime);
      }

      if (recurrence === 'none') break;
      currentDate.setDate(currentDate.getDate() + 1);
      count++;
    }
  }

  if (scheduleType === 'weekly_days' && slots.length > 0) {
    // Generate occurrences for specific days of the week
    let currentDate = startDate ? new Date(startDate) : new Date();
    const endLimit = recurrenceEnd ? new Date(recurrenceEnd) :
                     endDate ? new Date(endDate) :
                     new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const daysToSchedule = slots.map(s => s.dayOfWeek);

    while (currentDate <= endLimit && count < maxOccurrences) {
      const dayOfWeek = currentDate.getDay();

      if (daysToSchedule.includes(dayOfWeek)) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const slot = slots.find(s => s.dayOfWeek === dayOfWeek);

        const occurrenceId = uuidv4();
        db.prepare(`
          INSERT INTO task_schedule_occurrences (id, task_id, schedule_id, occurrence_date, start_time, end_time, status)
          VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
        `).run(occurrenceId, taskId, scheduleId, dateStr, slot?.startTime || null, slot?.endTime || null);
      }

      currentDate.setDate(currentDate.getDate() + 1);
      count++;
    }
  }
}

// Get task schedule
router.get('/:id/schedule', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const schedule = db.prepare(`
      SELECT * FROM task_schedules WHERE task_id = ?
    `).get(id) as any;

    if (!schedule) {
      return res.json({
        success: true,
        data: null,
      });
    }

    // Get slots
    const slots = db.prepare(`
      SELECT * FROM task_schedule_slots WHERE schedule_id = ? ORDER BY sort_order
    `).all(schedule.id) as any[];

    res.json({
      success: true,
      data: {
        id: schedule.id,
        taskId: schedule.task_id,
        scheduleType: schedule.schedule_type,
        startDate: schedule.start_date,
        endDate: schedule.end_date,
        recurrence: schedule.recurrence,
        recurrenceEnd: schedule.recurrence_end,
        slots: slots.map(s => ({
          id: s.id,
          scheduleId: s.schedule_id,
          dayOfWeek: s.day_of_week,
          startTime: s.start_time,
          endTime: s.end_time,
          sortOrder: s.sort_order,
          createdAt: s.created_at,
        })),
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at,
      },
    });
  } catch (error) {
    console.error('Get task schedule error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_SCHEDULE_ERROR',
        message: 'Failed to get task schedule',
      },
    });
  }
});

// Create or update task schedule
router.post('/:id/schedule', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id: taskId } = req.params;
    const {
      scheduleType,
      startDate,
      endDate,
      recurrence = 'none',
      recurrenceEnd,
      dailyTimeSlots = [],
      weeklySlots = [],
    } = req.body;

    // Verify task exists
    const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND deleted_at IS NULL').get(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
        },
      });
    }

    // Check if schedule already exists
    const existingSchedule = db.prepare('SELECT id FROM task_schedules WHERE task_id = ?').get(taskId) as any;

    const scheduleId = existingSchedule?.id || uuidv4();

    if (existingSchedule) {
      // Update existing schedule
      db.prepare(`
        UPDATE task_schedules
        SET schedule_type = ?, start_date = ?, end_date = ?, recurrence = ?, recurrence_end = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(scheduleType, startDate || null, endDate || null, recurrence, recurrenceEnd || null, scheduleId);

      // Delete old slots and occurrences
      db.prepare('DELETE FROM task_schedule_slots WHERE schedule_id = ?').run(scheduleId);
      db.prepare('DELETE FROM task_schedule_occurrences WHERE schedule_id = ?').run(scheduleId);
    } else {
      // Create new schedule
      db.prepare(`
        INSERT INTO task_schedules (id, task_id, schedule_type, start_date, end_date, recurrence, recurrence_end)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(scheduleId, taskId, scheduleType, startDate || null, endDate || null, recurrence, recurrenceEnd || null);
    }

    // Insert slots based on schedule type
    const slots: any[] = [];
    let sortOrder = 0;

    if (scheduleType === 'daily_hours' && dailyTimeSlots.length > 0) {
      for (const slot of dailyTimeSlots) {
        const slotId = uuidv4();
        db.prepare(`
          INSERT INTO task_schedule_slots (id, schedule_id, day_of_week, start_time, end_time, sort_order)
          VALUES (?, ?, NULL, ?, ?, ?)
        `).run(slotId, scheduleId, slot.startTime, slot.endTime, sortOrder++);
        slots.push({ startTime: slot.startTime, endTime: slot.endTime });
      }
    } else if (scheduleType === 'weekly_days' && weeklySlots.length > 0) {
      for (const slot of weeklySlots) {
        const slotId = uuidv4();
        db.prepare(`
          INSERT INTO task_schedule_slots (id, schedule_id, day_of_week, start_time, end_time, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(slotId, scheduleId, slot.dayOfWeek, slot.startTime || null, slot.endTime || null, sortOrder++);
        slots.push({ dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime });
      }
    }

    // Generate occurrences
    generateOccurrences(
      scheduleId,
      taskId,
      scheduleType,
      startDate,
      endDate,
      recurrence,
      recurrenceEnd,
      slots
    );

    // Update task's due_date for deadline type
    if (scheduleType === 'deadline' && startDate) {
      db.prepare('UPDATE tasks SET due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(startDate, taskId);
    } else if (scheduleType !== 'deadline') {
      // For non-deadline types, clear the due_date if it was set
      // Or set it to the end_date if available
      if (endDate) {
        db.prepare('UPDATE tasks SET due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(endDate, taskId);
      }
    }

    res.json({
      success: true,
      data: {
        id: scheduleId,
        taskId,
        scheduleType,
        startDate,
        endDate,
        recurrence,
        recurrenceEnd,
        slots,
      },
    });
  } catch (error) {
    console.error('Create/update task schedule error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SAVE_SCHEDULE_ERROR',
        message: 'Failed to save task schedule',
      },
    });
  }
});

// Delete task schedule
router.delete('/:id/schedule', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id: taskId } = req.params;

    const schedule = db.prepare('SELECT id FROM task_schedules WHERE task_id = ?').get(taskId) as any;
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: 'Schedule not found',
        },
      });
    }

    // Delete occurrences, slots, and schedule (cascading should handle this, but let's be explicit)
    db.prepare('DELETE FROM task_schedule_occurrences WHERE schedule_id = ?').run(schedule.id);
    db.prepare('DELETE FROM task_schedule_slots WHERE schedule_id = ?').run(schedule.id);
    db.prepare('DELETE FROM task_schedules WHERE id = ?').run(schedule.id);

    res.json({
      success: true,
      data: { message: 'Schedule deleted successfully' },
    });
  } catch (error) {
    console.error('Delete task schedule error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_SCHEDULE_ERROR',
        message: 'Failed to delete task schedule',
      },
    });
  }
});

// Get task schedule occurrences
router.get('/:id/occurrences', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id: taskId } = req.params;
    const { startDate, endDate } = req.query;

    let query = 'SELECT * FROM task_schedule_occurrences WHERE task_id = ?';
    const params: any[] = [taskId];

    if (startDate) {
      query += ' AND occurrence_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND occurrence_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY occurrence_date, start_time';

    const occurrences = db.prepare(query).all(...params) as any[];

    res.json({
      success: true,
      data: occurrences.map(o => ({
        id: o.id,
        taskId: o.task_id,
        scheduleId: o.schedule_id,
        occurrenceDate: o.occurrence_date,
        startTime: o.start_time,
        endTime: o.end_time,
        status: o.status,
        completedAt: o.completed_at,
        createdAt: o.created_at,
      })),
    });
  } catch (error) {
    console.error('Get task occurrences error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_OCCURRENCES_ERROR',
        message: 'Failed to get task occurrences',
      },
    });
  }
});

// Update occurrence status
router.put('/:id/occurrences/:occurrenceId', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { occurrenceId } = req.params;
    const { status } = req.body;

    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status',
        },
      });
    }

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE task_schedule_occurrences
      SET status = ?, completed_at = ?
      WHERE id = ?
    `).run(status, completedAt, occurrenceId);

    res.json({
      success: true,
      data: { id: occurrenceId, status, completedAt },
    });
  } catch (error) {
    console.error('Update occurrence error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_OCCURRENCE_ERROR',
        message: 'Failed to update occurrence',
      },
    });
  }
});

// Get all scheduled occurrences for calendar (global endpoint)
router.get('/calendar/occurrences', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'startDate and endDate are required',
        },
      });
    }

    // Get all occurrences with task info
    const occurrences = db.prepare(`
      SELECT
        o.id, o.task_id, o.schedule_id, o.occurrence_date, o.start_time, o.end_time, o.status, o.completed_at,
        t.title, t.priority, t.status as task_status, t.category_id,
        c.name as category_name, c.color as category_color,
        u.name as assignee_name, u.avatar_url as assignee_avatar
      FROM task_schedule_occurrences o
      JOIN tasks t ON o.task_id = t.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.deleted_at IS NULL
        AND o.occurrence_date >= ?
        AND o.occurrence_date <= ?
      ORDER BY o.occurrence_date, o.start_time
    `).all(startDate, endDate) as any[];

    res.json({
      success: true,
      data: occurrences.map(o => ({
        id: o.id,
        taskId: o.task_id,
        scheduleId: o.schedule_id,
        occurrenceDate: o.occurrence_date,
        startTime: o.start_time,
        endTime: o.end_time,
        status: o.status,
        completedAt: o.completed_at,
        task: {
          id: o.task_id,
          title: o.title,
          priority: o.priority,
          status: o.task_status,
          categoryId: o.category_id,
          category: o.category_name ? {
            id: o.category_id,
            name: o.category_name,
            color: o.category_color,
          } : null,
          assignee: o.assignee_name ? {
            name: o.assignee_name,
            avatarUrl: o.assignee_avatar,
          } : null,
        },
      })),
    });
  } catch (error) {
    console.error('Get calendar occurrences error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_CALENDAR_OCCURRENCES_ERROR',
        message: 'Failed to get calendar occurrences',
      },
    });
  }
});

export default router;
