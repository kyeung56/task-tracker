import { useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import type { DashboardProps, Task, Category, TeamMember, DashboardTrend, DashboardAssigneeStat, DashboardCategoryStat, DashboardOverdueTrend } from '../types';
import CompletionTrendChart from './dashboard/CompletionTrendChart';
import WorkloadChart from './dashboard/WorkloadChart';
import CategoryPieChart from './dashboard/CategoryPieChart';
import OverdueTrendChart from './dashboard/OverdueTrendChart';

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  waiting: number;
  overdue: number;
  completedThisWeek: number;
  highPriority: number;
  byAssignee: Record<string, { total: number; completed: number; name: string }>;
  byCategory: Record<string, { count: number; name: string }>;
  estimatedHours: number;
  loggedHours: number;
  completionRate: number;
  // Chart data
  trends: DashboardTrend[];
  assigneeStats: DashboardAssigneeStat[];
  categoryStats: DashboardCategoryStat[];
  overdueTrend: DashboardOverdueTrend[];
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  gradient: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, subtitle, gradient, icon }: StatCardProps) {
  return (
    <div className={`rounded-2xl p-5 ${gradient} text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-white/70 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="opacity-80">{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard({ tasks, teamMembers }: DashboardProps) {
  const { t } = useLanguage();

  const stats = useMemo<Stats>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const completed = tasks.filter((task: Task) => task.status === 'completed');
    const inProgress = tasks.filter((task: Task) => task.status === 'in_progress');
    const pending = tasks.filter((task: Task) => task.status === 'pending');
    const waiting = tasks.filter((task: Task) => task.status === 'waiting');
    const overdue = tasks.filter((task: Task) => {
      if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
      return new Date(task.dueDate) < today;
    });

    const completedThisWeek = completed.filter((task: Task) => task.completedAt && new Date(task.completedAt) >= thisWeek);
    const highPriority = tasks.filter((task: Task) => (task.priority === 'high' || task.priority === 'critical') && task.status !== 'completed');

    const byAssignee: Record<string, { total: number; completed: number; name: string }> = {};
    tasks.forEach((task: Task) => {
      if (task.assigneeId) {
        const member = teamMembers.find((m: TeamMember) => m.id === task.assigneeId);
        const name = member?.name || 'Unknown';
        if (!byAssignee[task.assigneeId]) {
          byAssignee[task.assigneeId] = { total: 0, completed: 0, name };
        }
        byAssignee[task.assigneeId].total++;
        if (task.status === 'completed') byAssignee[task.assigneeId].completed++;
      }
    });

    const byCategory: Record<string, { count: number; name: string }> = {};
    tasks.forEach((task: Task) => {
      if (task.categoryId) {
        if (!byCategory[task.categoryId]) {
          byCategory[task.categoryId] = { count: 0, name: task.categoryId };
        }
        byCategory[task.categoryId].count++;
      }
    });

    const estimatedHours = tasks.reduce((sum: number, task: Task) => sum + (task.estimatedHours || 0), 0);
    const loggedHours = tasks.reduce((sum: number, task: Task) => sum + (task.loggedHours || 0), 0);

    // 计算本月完成率趋势（按天）
    const trends: DashboardTrend[] = [];
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysToShow = Math.min(14, daysInMonth); // 显示最近14天

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const createdOnDay = tasks.filter((task: Task) =>
        task.createdAt && task.createdAt.split('T')[0] === dateStr
      ).length;

      const completedOnDay = tasks.filter((task: Task) =>
        task.completedAt && task.completedAt.split('T')[0] === dateStr
      ).length;

      trends.push({ date: dateStr, created: createdOnDay, completed: completedOnDay });
    }

    // 计算每人工作量统计
    const assigneeStats: DashboardAssigneeStat[] = Object.entries(byAssignee).map(([userId, data]) => {
      const inProgressCount = tasks.filter((t: Task) =>
        t.assigneeId === userId && (t.status === 'in_progress' || t.status === 'waiting')
      ).length;
      return {
        userId,
        userName: data.name,
        total: data.total,
        completed: data.completed,
        inProgress: inProgressCount,
      };
    });

    // 计算分类任务占比
    const totalTasks = tasks.length;
    const categoryColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
    const categoryStats: DashboardCategoryStat[] = Object.entries(byCategory).map(([categoryId, data], index) => ({
      categoryId,
      categoryName: data.name,
      color: categoryColors[index % categoryColors.length],
      count: data.count,
      percentage: totalTasks > 0 ? Math.round((data.count / totalTasks) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    // 计算逾期趋势（最近14天）
    const overdueTrend: DashboardOverdueTrend[] = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const overdueOnDay = tasks.filter((task: Task) => {
        if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
        return task.dueDate.split('T')[0] === dateStr && new Date(task.dueDate) < date;
      }).length;

      overdueTrend.push({ date: dateStr, overdueCount: overdueOnDay });
    }

    return {
      total: tasks.length,
      completed: completed.length,
      inProgress: inProgress.length,
      pending: pending.length,
      waiting: waiting.length,
      overdue: overdue.length,
      completedThisWeek: completedThisWeek.length,
      highPriority: highPriority.length,
      byAssignee,
      byCategory,
      estimatedHours,
      loggedHours,
      completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
      trends,
      assigneeStats,
      categoryStats,
      overdueTrend,
    };
  }, [tasks, teamMembers]);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('totalTasks') || '总任务'}
          value={stats.total}
          subtitle={`${stats.completedThisWeek} ${t('completedThisWeek') || '本周完成'}`}
          gradient="bg-gradient-to-br from-indigo-500 to-purple-600"
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          title={t('inProgress') || '进行中'}
          value={stats.inProgress}
          subtitle={`${stats.pending} ${t('pending') || '待处理'}`}
          gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          title={t('completed') || '已完成'}
          value={stats.completed}
          subtitle={`${stats.completionRate}% ${t('completionRate') || '完成率'}`}
          gradient="bg-gradient-to-br from-emerald-500 to-green-600"
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title={t('overdue') || '已过期'}
          value={stats.overdue}
          subtitle={`${stats.highPriority} ${t('highPriority') || '高优先级'}`}
          gradient={stats.overdue > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* By Assignee */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('byAssignee') || '按负责人'}</h3>
        <div className="space-y-3">
          {Object.entries(stats.byAssignee).length > 0 ? (
            Object.entries(stats.byAssignee).map(([id, data]) => (
              <div key={id} className="flex items-center justify-between">
                <span className="text-slate-600">{data.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{data.completed}/{data.total}</span>
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${data.total > 0 ? (data.completed / data.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm">{t('noData') || '暂无数据'}</p>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 本月完成率趋势图 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <CompletionTrendChart
            data={stats.trends}
            height={220}
            className="border-0 shadow-none"
          />
        </div>

        {/* 每人工作量柱状图 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <WorkloadChart
            data={stats.assigneeStats}
            className="border-0 shadow-none"
          />
        </div>

        {/* 分类任务占比饼图 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <CategoryPieChart
            data={stats.categoryStats}
            className="border-0 shadow-none"
          />
        </div>

        {/* 逾期趋势 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <OverdueTrendChart
            data={stats.overdueTrend}
            height={180}
            className="border-0 shadow-none"
          />
        </div>
      </div>

      {/* Time Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('timeTracking') || '时间追踪'}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">{t('estimatedHours') || '预估时间'}</span>
              <span className="font-semibold text-slate-800">{stats.estimatedHours}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">{t('loggedHours') || '已记录时间'}</span>
              <span className="font-semibold text-slate-800">{stats.loggedHours}h</span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{t('efficiency') || '效率'}</span>
                <span className="font-medium text-indigo-600">
                  {stats.estimatedHours > 0 ? Math.round((stats.loggedHours / stats.estimatedHours) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('statusBreakdown') || '状态分布'}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">{t('pending') || '待处理'}</span>
              <span className="font-semibold">{stats.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">{t('inProgress') || '进行中'}</span>
              <span className="font-semibold">{stats.inProgress}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">{t('waiting') || '等待确认'}</span>
              <span className="font-semibold">{stats.waiting}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">{t('completed') || '已完成'}</span>
              <span className="font-semibold text-emerald-600">{stats.completed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
