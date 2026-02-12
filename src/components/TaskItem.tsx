import React from 'react';
import { formatDate, isOverdue, priorityColors, statusColors } from '../utils/helpers';
import { useLanguage } from '../hooks/useLanguage';
import TimeTracker from './TimeTracker';
import { TaskItemProps, Status, Priority } from '../types';

export default function TaskItem({
  task,
  categories,
  teamMembers,
  onEdit,
  onDelete,
  onStatusChange,
  onTimeUpdate
}: TaskItemProps) {
  const { t } = useLanguage();
  const category = categories.find(c => c.id === task.category);
  const assignee = teamMembers.find(m => m.id === task.assignee);
  const overdue = isOverdue(task.dueDate, task.status);

  const handleStatusToggle = () => {
    const statusOrder: Status[] = ['pending', 'in-progress', 'review', 'completed'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    onStatusChange(task.id, nextStatus);
  };

  const statusIcons: Record<Status, React.ReactNode> = {
    pending: (
      <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-transparent"></div>
      </div>
    ),
    'in-progress': (
      <div className="w-6 h-6 rounded-full border-2 border-blue-400 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
      </div>
    ),
    review: (
      <div className="w-6 h-6 rounded-full border-2 border-purple-400 flex items-center justify-center">
        <svg className="w-3 h-3 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </div>
    ),
    completed: (
      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  };

  const statusLabels: Record<Status, string> = {
    'in-progress': t('statusInProgress'),
    'review': t('statusReview'),
    'pending': t('statusPending'),
    'completed': t('statusCompleted')
  };

  const priorityLabels: Record<Priority, string> = {
    low: t('priorityLow'),
    medium: t('priorityMedium'),
    high: t('priorityHigh'),
    critical: t('priorityCritical')
  };

  const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div
      className={`bg-white rounded-2xl p-5 transition-all duration-200 border ${
        task.status === 'completed'
          ? 'opacity-60 border-slate-200'
          : overdue
          ? 'border-red-200 shadow-lg shadow-red-100'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Status Toggle */}
        <button
          onClick={handleStatusToggle}
          className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
          title={`${t('status')}: ${statusLabels[task.status]}`}
        >
          {statusIcons[task.status]}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3
                className={`font-semibold text-slate-800 ${
                  task.status === 'completed' ? 'line-through text-slate-500' : ''
                }`}
              >
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onEdit(task)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                title={t('editTask')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title={t('confirmDeleteTask')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tags & Metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {category && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.name}
              </span>
            )}

            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${priorityColors[task.priority] || priorityColors.high}`}>
              {priorityLabels[task.priority]}
            </span>

            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusColors[task.status] || statusColors['in-progress']}`}>
              {statusLabels[task.status]}
            </span>

            {assignee && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700">
                <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                  {assignee.avatar}
                </div>
                {assignee.name}
              </span>
            )}

            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  overdue ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {overdue ? t('overdueLabel') + ': ' : t('dueLabel') + ': '}
                {formatDate(task.dueDate)}
              </span>
            )}

            {(task.estimatedHours > 0 || task.loggedHours > 0) && (
              <TimeTracker
                taskId={task.id}
                loggedHours={task.loggedHours || 0}
                estimatedHours={task.estimatedHours || 0}
                onUpdate={onTimeUpdate}
              />
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
