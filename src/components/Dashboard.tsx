import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { DashboardProps, TaskStats, TeamMember } from '../types';

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  review: number;
  overdue: number;
  completedThisWeek: number;
  highPriority: number;
  byAssignee: Record<string, { total: number; completed: number }>;
  byCategory: Record<string, number>;
  estimatedHours: number;
  loggedHours: number;
  completionRate: number;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  gradient: string;
  icon: React.ReactNode;
}

export default function Dashboard({ tasks, teamMembers }: DashboardProps) {
  const { t } = useLanguage();

  const stats = React.useMemo<Stats>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const completed = tasks.filter(t => t.status === 'completed');
    const inProgress = tasks.filter(t => t.status === 'in-progress');
    const pending = tasks.filter(t => t.status === 'pending');
    const review = tasks.filter(t => t.status === 'review');
    const overdue = tasks.filter(t => {
      if (!t.dueDate || t.status === 'completed') return false;
      return new Date(t.dueDate) < today;
    });

    const completedThisWeek = completed.filter(t => t.completedAt && new Date(t.completedAt) >= thisWeek);
    const highPriority = tasks.filter(t => (t.priority === 'high' || t.priority === 'critical') && t.status !== 'completed');

    const byAssignee: Record<string, { total: number; completed: number }> = {};
    tasks.forEach(t => {
      if (t.assignee) {
        if (!byAssignee[t.assignee]) byAssignee[t.assignee] = { total: 0, completed: 0 };
        byAssignee[t.assignee].total++;
        if (t.status === 'completed') byAssignee[t.assignee].completed++;
      }
    });

    const byCategory: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.category) {
        if (!byCategory[t.category]) byCategory[t.category] = 0;
        byCategory[t.category]++;
      }
    });

    const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const loggedHours = tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);

    return {
      total: tasks.length,
      completed: completed.length,
      inProgress: inProgress.length,
      pending: pending.length,
      review: review.length,
      overdue: overdue.length,
      completedThisWeek: completedThisWeek.length,
      highPriority: highPriority.length,
      byAssignee,
      byCategory,
      estimatedHours,
      loggedHours,
      completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0
    };
  }, [tasks]);

  const StatCard = ({ title, value, subtitle, gradient, icon }: StatCardProps) => (
    <div className={`bg-white rounded-2xl shadow-sm p-5 border border-slate-200 hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-800">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${gradient}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t('totalTasks')}
          value={stats.total}
          subtitle={`${stats.completionRate}% ${t('complete')}`}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          title={t('completed')}
          value={stats.completed}
          subtitle={`${stats.completedThisWeek} ${t('thisWeek')}`}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title={t('statusInProgress')}
          value={stats.inProgress}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title={t('overdue')}
          value={stats.overdue}
          subtitle={stats.overdue > 0 ? t('needsAttention') : t('allOnTrack')}
          gradient={stats.overdue > 0 ? "bg-gradient-to-br from-red-500 to-red-600" : "bg-gradient-to-br from-slate-400 to-slate-500"}
          icon={stats.overdue > 0 ?
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> :
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          }
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t('highPriority')}
          value={stats.highPriority}
          gradient="bg-gradient-to-br from-orange-500 to-orange-600"
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>}
        />
        <StatCard
          title={t('statusPending')}
          value={stats.pending}
          gradient="bg-gradient-to-br from-slate-500 to-slate-600"
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
        />
        <StatCard
          title={t('estimatedHours')}
          value={stats.estimatedHours}
          subtitle={`${stats.loggedHours}h ${t('logged')}`}
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title={t('completionRate')}
          value={`${stats.completionRate}%`}
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
      </div>

      {/* Team Performance */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-5 text-lg">{t('teamPerformance')}</h3>
        {Object.keys(stats.byAssignee).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(stats.byAssignee).map(([assigneeId, data]) => {
              const member = teamMembers.find(m => m.id === assigneeId);
              const rate = Math.round((data.completed / data.total) * 100);
              return (
                <div key={assigneeId} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                    {member?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-slate-700">{member?.name || 'Unknown'}</span>
                      <span className="text-sm text-slate-500">{data.completed}/{data.total} {t('tasks')}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">{t('noTasksAssigned')}</p>
        )}
      </div>

      {/* Category Distribution */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-5 text-lg">{t('tasksByCategory')}</h3>
        {Object.keys(stats.byCategory).length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byCategory).map(([catId, count], index) => {
              const colors = [
                'bg-gradient-to-r from-blue-500 to-blue-600',
                'bg-gradient-to-r from-emerald-500 to-emerald-600',
                'bg-gradient-to-r from-amber-500 to-amber-600',
                'bg-gradient-to-r from-rose-500 to-rose-600',
                'bg-gradient-to-r from-purple-500 to-purple-600'
              ];
              return (
                <span key={catId} className={`px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm ${colors[index % colors.length]}`}>
                  {count} {t('tasks')}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">{t('noCategoriesWithTasks')}</p>
        )}
      </div>
    </div>
  );
}
