import { useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { formatHours, formatHoursDecimal } from '../utils/helpers';
import type { DashboardProps, Task, Category, TeamMember, DashboardTrend, DashboardAssigneeStat, DashboardCategoryStat, DashboardOverdueTrend } from '../types';
import CompletionTrendChart from './dashboard/CompletionTrendChart';
import WorkloadChart from './dashboard/WorkloadChart';
import CategoryPieChart from './dashboard/CategoryPieChart';
import OverdueTrendChart from './dashboard/OverdueTrendChart';

interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'same';
}

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
  // Comparison data
  weeklyComparison: {
    completed: PeriodComparison;
    created: PeriodComparison;
    completionRate: PeriodComparison;
    loggedHours: PeriodComparison;
  };
  monthlyComparison: {
    completed: PeriodComparison;
    created: PeriodComparison;
    completionRate: PeriodComparison;
    loggedHours: PeriodComparison;
  };
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

interface ComparisonItemProps {
  label: string;
  data: PeriodComparison;
  unit?: string;
  showPercent?: boolean;
}

function ComparisonItem({ label, data, unit = '', showPercent = false, isHours = false }: ComparisonItemProps & { isHours?: boolean }) {
  const { language } = useLanguage();
  const trendColor = data.trend === 'up' ? 'text-emerald-600 bg-emerald-50' :
                     data.trend === 'down' ? 'text-red-600 bg-red-50' :
                     'text-slate-600 bg-slate-50';
  const trendIcon = data.trend === 'up' ? '↑' : data.trend === 'down' ? '↓' : '→';

  // Format the display value
  const displayValue = showPercent
    ? `${data.current}%`
    : isHours
      ? (formatHours(data.current, language) || '0m')
      : `${data.current}${unit}`;

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-800">
          {displayValue}
        </span>
        {data.change !== 0 && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trendColor}`}>
            {trendIcon} {Math.abs(data.changePercent)}%
          </span>
        )}
        {data.change === 0 && (
          <span className="text-xs text-slate-400 px-2 py-0.5">-</span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ tasks, teamMembers }: DashboardProps) {
  const { t, language } = useLanguage();

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

    // Calculate period comparisons
    const calculateComparison = (current: number, previous: number): PeriodComparison => {
      const change = current - previous;
      const changePercent = previous > 0 ? Math.round((change / previous) * 100) : (current > 0 ? 100 : 0);
      return {
        current,
        previous,
        change,
        changePercent,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
      };
    };

    // This week vs Last week
    const thisWeekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000);

    const completedThisWeekCount = tasks.filter((task: Task) =>
      task.completedAt && new Date(task.completedAt) >= thisWeekStart && new Date(task.completedAt) <= now
    ).length;

    const completedLastWeekCount = tasks.filter((task: Task) =>
      task.completedAt && new Date(task.completedAt) >= lastWeekStart && new Date(task.completedAt) <= lastWeekEnd
    ).length;

    const createdThisWeekCount = tasks.filter((task: Task) =>
      task.createdAt && new Date(task.createdAt) >= thisWeekStart && new Date(task.createdAt) <= now
    ).length;

    const createdLastWeekCount = tasks.filter((task: Task) =>
      task.createdAt && new Date(task.createdAt) >= lastWeekStart && new Date(task.createdAt) <= lastWeekEnd
    ).length;

    const loggedHoursThisWeek = tasks
      .filter((task: Task) => task.updatedAt && new Date(task.updatedAt) >= thisWeekStart)
      .reduce((sum: number, task: Task) => sum + (task.loggedHours || 0), 0);

    const loggedHoursLastWeek = tasks
      .filter((task: Task) => task.updatedAt && new Date(task.updatedAt) >= lastWeekStart && new Date(task.updatedAt) <= lastWeekEnd)
      .reduce((sum: number, task: Task) => sum + (task.loggedHours || 0), 0);

    // This month vs Last month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const completedThisMonthCount = tasks.filter((task: Task) =>
      task.completedAt && new Date(task.completedAt) >= thisMonthStart && new Date(task.completedAt) <= now
    ).length;

    const completedLastMonthCount = tasks.filter((task: Task) =>
      task.completedAt && new Date(task.completedAt) >= lastMonthStart && new Date(task.completedAt) <= lastMonthEnd
    ).length;

    const createdThisMonthCount = tasks.filter((task: Task) =>
      task.createdAt && new Date(task.createdAt) >= thisMonthStart && new Date(task.createdAt) <= now
    ).length;

    const createdLastMonthCount = tasks.filter((task: Task) =>
      task.createdAt && new Date(task.createdAt) >= lastMonthStart && new Date(task.createdAt) <= lastMonthEnd
    ).length;

    const loggedHoursThisMonth = tasks
      .filter((task: Task) => task.updatedAt && new Date(task.updatedAt) >= thisMonthStart)
      .reduce((sum: number, task: Task) => sum + (task.loggedHours || 0), 0);

    const loggedHoursLastMonth = tasks
      .filter((task: Task) => task.updatedAt && new Date(task.updatedAt) >= lastMonthStart && new Date(task.updatedAt) <= lastMonthEnd)
      .reduce((sum: number, task: Task) => sum + (task.loggedHours || 0), 0);

    // Calculate rates
    const thisWeekCompletionRate = createdThisWeekCount > 0 ? Math.round((completedThisWeekCount / createdThisWeekCount) * 100) : 0;
    const lastWeekCompletionRate = createdLastWeekCount > 0 ? Math.round((completedLastWeekCount / createdLastWeekCount) * 100) : 0;

    const thisMonthCompletionRate = createdThisMonthCount > 0 ? Math.round((completedThisMonthCount / createdThisMonthCount) * 100) : 0;
    const lastMonthCompletionRate = createdLastMonthCount > 0 ? Math.round((completedLastMonthCount / createdLastMonthCount) * 100) : 0;

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
      // Weekly comparison
      weeklyComparison: {
        completed: calculateComparison(completedThisWeekCount, completedLastWeekCount),
        created: calculateComparison(createdThisWeekCount, createdLastWeekCount),
        completionRate: calculateComparison(thisWeekCompletionRate, lastWeekCompletionRate),
        loggedHours: calculateComparison(loggedHoursThisWeek, loggedHoursLastWeek),
      },
      // Monthly comparison
      monthlyComparison: {
        completed: calculateComparison(completedThisMonthCount, completedLastMonthCount),
        created: calculateComparison(createdThisMonthCount, createdLastMonthCount),
        completionRate: calculateComparison(thisMonthCompletionRate, lastMonthCompletionRate),
        loggedHours: calculateComparison(loggedHoursThisMonth, loggedHoursLastMonth),
      },
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

      {/* Trend Comparison Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Comparison */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800">
              {language === 'en' ? 'This Week vs Last Week' : '本周 vs 上周'}
            </h3>
          </div>
          <div className="space-y-1 divide-y divide-slate-100">
            <ComparisonItem
              label={language === 'en' ? 'Tasks Completed' : '完成任务'}
              data={stats.weeklyComparison.completed}
            />
            <ComparisonItem
              label={language === 'en' ? 'Tasks Created' : '新建任务'}
              data={stats.weeklyComparison.created}
            />
            <ComparisonItem
              label={language === 'en' ? 'Completion Rate' : '完成率'}
              data={stats.weeklyComparison.completionRate}
              showPercent
            />
            <ComparisonItem
              label={language === 'en' ? 'Hours Logged' : '记录工时'}
              data={stats.weeklyComparison.loggedHours}
              isHours
            />
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800">
              {language === 'en' ? 'This Month vs Last Month' : '本月 vs 上月'}
            </h3>
          </div>
          <div className="space-y-1 divide-y divide-slate-100">
            <ComparisonItem
              label={language === 'en' ? 'Tasks Completed' : '完成任务'}
              data={stats.monthlyComparison.completed}
            />
            <ComparisonItem
              label={language === 'en' ? 'Tasks Created' : '新建任务'}
              data={stats.monthlyComparison.created}
            />
            <ComparisonItem
              label={language === 'en' ? 'Completion Rate' : '完成率'}
              data={stats.monthlyComparison.completionRate}
              showPercent
            />
            <ComparisonItem
              label={language === 'en' ? 'Hours Logged' : '记录工时'}
              data={stats.monthlyComparison.loggedHours}
              isHours
            />
          </div>
        </div>
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
              <span className="font-semibold text-slate-800">{formatHours(stats.estimatedHours, language) || '0m'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">{t('loggedHours') || '已记录时间'}</span>
              <span className="font-semibold text-slate-800">{formatHours(stats.loggedHours, language) || '0m'}</span>
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
