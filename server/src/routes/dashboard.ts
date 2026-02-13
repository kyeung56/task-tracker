import { Router } from 'express';
import db from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper function to get date range
function getDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date();

  if (period === 'custom' && startDate && endDate) {
    return { start: startDate, end: endDate };
  }

  switch (period) {
    case 'week': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      };
    }
    case 'quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
      const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      return {
        start: quarterStart.toISOString().split('T')[0],
        end: quarterEnd.toISOString().split('T')[0],
      };
    }
    case 'month':
    default: {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: monthStart.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0],
      };
    }
  }
}

// Get dashboard stats
router.get('/stats', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const dateRange = getDateRange(period as string, startDate as string, endDate as string);

    // Base query condition
    const userCondition = req.user?.permissions.canViewAllTasks
      ? ''
      : 'AND (assignee_id = ? OR creator_id = ?)';
    const userParams = req.user?.permissions.canViewAllTasks
      ? []
      : [req.user!.id, req.user!.id];

    // Overview stats
    const overview = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('in_progress', 'waiting', 'review') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN due_date < date('now') AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue
      FROM tasks
      WHERE deleted_at IS NULL ${userCondition}
    `).get(...userParams) as any;

    const completionRate = overview.total > 0
      ? Math.round((overview.completed / overview.total) * 100)
      : 0;

    // Trends - daily completion for the period
    const trends = db.prepare(`
      SELECT
        date(created_at) as date,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        COUNT(*) as created
      FROM tasks
      WHERE deleted_at IS NULL
        AND date(created_at) BETWEEN ? AND ?
        ${userCondition.replace('AND', 'AND')}
      GROUP BY date(created_at)
      ORDER BY date
    `).all(dateRange.start, dateRange.end, ...userParams) as any[];

    // By assignee
    const byAssignee = db.prepare(`
      SELECT
        u.id as user_id,
        u.name as user_name,
        COUNT(t.id) as total,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.status IN ('in_progress', 'waiting', 'review') THEN 1 ELSE 0 END) as in_progress
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assignee_id AND t.deleted_at IS NULL
      WHERE u.is_active = 1
      GROUP BY u.id
      HAVING total > 0
      ORDER BY total DESC
    `).all() as any[];

    // By category
    const categoryStats = db.prepare(`
      SELECT
        c.id as category_id,
        c.name as category_name,
        c.color,
        COUNT(t.id) as count
      FROM categories c
      LEFT JOIN tasks t ON c.id = t.category_id AND t.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY count DESC
    `).all() as any[];

    const totalCategorized = categoryStats.reduce((sum: number, c: any) => sum + c.count, 0);
    const byCategory = categoryStats.map((c: any) => ({
      categoryId: c.category_id,
      categoryName: c.category_name,
      color: c.color,
      count: c.count,
      percentage: totalCategorized > 0 ? Math.round((c.count / totalCategorized) * 100) : 0,
    }));

    // Overdue trend
    const overdueTrend = db.prepare(`
      SELECT
        date(created_at) as date,
        SUM(CASE WHEN due_date < date('now') AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue_count
      FROM tasks
      WHERE deleted_at IS NULL
        AND date(created_at) BETWEEN ? AND ?
      GROUP BY date(created_at)
      ORDER BY date
    `).all(dateRange.start, dateRange.end) as any[];

    // Period label
    const periodLabels: Record<string, string> = {
      week: '本周',
      month: '本月',
      quarter: '本季度',
      custom: `${dateRange.start} 至 ${dateRange.end}`,
    };

    res.json({
      success: true,
      data: {
        period: {
          start: dateRange.start,
          end: dateRange.end,
          label: periodLabels[period as string] || periodLabels.month,
        },
        overview: {
          total: overview.total || 0,
          completed: overview.completed || 0,
          inProgress: overview.in_progress || 0,
          overdue: overview.overdue || 0,
          completionRate,
        },
        trends: trends.map((t: any) => ({
          date: t.date,
          completed: t.completed || 0,
          created: t.created || 0,
        })),
        byAssignee: byAssignee.map((a: any) => ({
          userId: a.user_id,
          userName: a.user_name,
          total: a.total || 0,
          completed: a.completed || 0,
          inProgress: a.in_progress || 0,
        })),
        byCategory,
        overdueTrend: overdueTrend.map((o: any) => ({
          date: o.date,
          overdueCount: o.overdue_count || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STATS_ERROR',
        message: 'Failed to get dashboard stats',
      },
    });
  }
});

// Get team workload
router.get('/team-workload', authMiddleware, (req: AuthRequest, res) => {
  try {
    const workload = db.prepare(`
      SELECT
        u.id,
        u.name,
        u.avatar_url,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status IN ('in_progress', 'waiting', 'review') THEN 1 ELSE 0 END) as active_tasks,
        SUM(CASE WHEN t.due_date < date('now') AND t.status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue_tasks,
        SUM(t.estimated_hours) as total_estimated_hours,
        SUM(t.logged_hours) as total_logged_hours
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assignee_id AND t.deleted_at IS NULL
      WHERE u.is_active = 1
      GROUP BY u.id
      ORDER BY active_tasks DESC
    `).all() as any[];

    res.json({
      success: true,
      data: workload.map((w: any) => ({
        id: w.id,
        name: w.name,
        avatarUrl: w.avatar_url,
        totalTasks: w.total_tasks || 0,
        activeTasks: w.active_tasks || 0,
        overdueTasks: w.overdue_tasks || 0,
        totalEstimatedHours: w.total_estimated_hours || 0,
        totalLoggedHours: w.total_logged_hours || 0,
      })),
    });
  } catch (error) {
    console.error('Get team workload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_WORKLOAD_ERROR',
        message: 'Failed to get team workload',
      },
    });
  }
});

export default router;
