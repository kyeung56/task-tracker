import { formatDate, isOverdue, isDueToday, isDueSoon, statusColors, formatHours } from '../utils/helpers';
import { useLanguage } from '../hooks/useLanguage';
import { usePermissions } from '../hooks/usePermissions';
import type { TaskItemProps, TaskStatus, Priority, Category, TeamMember } from '../types';

export default function TaskItem({
  task,
  categories,
  teamMembers,
  onEdit,
  onDelete,
  onStatusChange,
  onTimeUpdate
}: TaskItemProps) {
  const { t, language } = useLanguage();
  const { canEditTask, canDeleteTask } = usePermissions();
  const category = categories.find((c: Category) => c.id === task.categoryId);
  const assignee = teamMembers.find((m: TeamMember) => m.id === task.assigneeId);
  const overdue = isOverdue(task.dueDate, task.status);
  const dueToday = isDueToday(task.dueDate, task.status);
  const dueSoon = isDueSoon(task.dueDate, task.status);
  const isCritical = task.priority === 'critical';
  const isHigh = task.priority === 'high';
  const isCompleted = task.status === 'completed' || task.status === 'cancelled';

  // Permission checks
  const canEdit = canEditTask(task, categories);
  const canDelete = canDeleteTask(task);

  const handleStatusToggle = () => {
    if (!canEdit) return;
    const statusOrder: TaskStatus[] = ['pending', 'in_progress', 'waiting', 'completed'];
    const currentIndex = statusOrder.indexOf(task.status);
    if (currentIndex >= 0) {
      const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
      onStatusChange(task.id, nextStatus);
    }
  };

  const statusLabels: Record<TaskStatus, string> = {
    pending: t('statusPending'),
    in_progress: t('statusInProgress'),
    waiting: t('statusReview'),
    completed: t('statusCompleted'),
    cancelled: t('statusCompleted'),
    deferred: t('statusCompleted'),
  };

  const priorityLabels: Record<Priority, string> = {
    low: t('priorityLow'),
    medium: t('priorityMedium'),
    high: t('priorityHigh'),
    critical: t('priorityCritical')
  };

  const tags = Array.isArray(task.tags) ? task.tags : (task.tags ? task.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []);

  // Card background based on status
  const getCardClasses = () => {
    if (isCompleted) {
      return 'bg-slate-50 border-slate-200';
    }
    if (overdue) {
      return 'bg-red-50 border-red-200';
    }
    if (dueToday) {
      return 'bg-amber-50 border-amber-200';
    }
    if (dueSoon) {
      return 'bg-orange-50 border-orange-200';
    }
    return 'bg-white border-slate-200';
  };

  // Status badge styles
  const getStatusBadgeStyle = () => {
    if (task.status === 'completed') return 'bg-emerald-500 text-white';
    if (task.status === 'cancelled') return 'bg-slate-400 text-white';
    if (task.status === 'in_progress') return 'bg-blue-500 text-white';
    if (task.status === 'waiting') return 'bg-amber-500 text-white';
    if (task.status === 'deferred') return 'bg-orange-500 text-white';
    return 'bg-slate-200 text-slate-700';
  };

  // Priority badge styles
  const getPriorityBadgeStyle = () => {
    if (isCritical) return 'bg-red-100 text-red-700 border border-red-300';
    if (isHigh) return 'bg-orange-100 text-orange-700 border border-orange-300';
    if (task.priority === 'medium') return 'bg-amber-100 text-amber-700 border border-amber-300';
    return 'bg-slate-100 text-slate-600 border border-slate-200';
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 hover:shadow-md ${getCardClasses()}`}
    >
      {/* === ROW 1: Title + Status Icons === */}
      <div className="p-4 pb-2">
        <div className="flex items-start gap-3">
          {/* Status Toggle Button */}
          <button
            onClick={handleStatusToggle}
            disabled={!canEdit}
            className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
              canEdit ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed opacity-50'
            } ${
              task.status === 'completed'
                ? 'bg-emerald-500 border-emerald-500'
                : task.status === 'cancelled'
                ? 'bg-slate-400 border-slate-400'
                : task.status === 'in_progress'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-white'
            }`}
            title={`${t('status')}: ${statusLabels[task.status]}`}
          >
            {task.status === 'completed' && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {task.status === 'cancelled' && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {task.status === 'in_progress' && (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            )}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-semibold truncate ${
              isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'
            }`}>
              {task.title}
            </h3>
          </div>

          {/* Right side: Urgent & Due Icons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Critical Warning */}
            {isCritical && !isCompleted && (
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600" title={t('priorityCritical')}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </span>
            )}

            {/* Due Date Badge */}
            {task.dueDate && !isCompleted && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  overdue
                    ? 'bg-red-500 text-white shadow-sm shadow-red-200'
                    : dueToday
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                    : dueSoon
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
                title={task.dueDate}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{overdue ? t('overdueLabel') : dueToday ? t('dueToday') : formatDate(task.dueDate)}</span>
              </span>
            )}

            {/* Edit/Delete Actions */}
            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={() => onEdit(task)}
                disabled={!canEdit}
                className={`p-1.5 rounded-lg transition-colors ${
                  canEdit ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50' : 'text-slate-300 cursor-not-allowed'
                }`}
                title={canEdit ? t('editTask') : t('noPermission')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(task.id)}
                disabled={!canDelete}
                className={`p-1.5 rounded-lg transition-colors ${
                  canDelete ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-300 cursor-not-allowed'
                }`}
                title={canDelete ? t('confirmDeleteTask') : t('noPermission')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* === ROW 2: Status + Priority + Category + Assignee === */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge - Strong contrast */}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeStyle()}`}>
            {statusLabels[task.status]}
          </span>

          {/* Priority - Small tag */}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadgeStyle()}`}>
            {isHigh || isCritical ? '🔥 ' : ''}{priorityLabels[task.priority]}
          </span>

          {/* Category - Secondary color */}
          {category && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white/90"
              style={{ backgroundColor: category.color }}
            >
              {category.name}
            </span>
          )}

          {/* Assignee Avatar */}
          {assignee && (
            <div className="flex items-center gap-1.5 ml-auto">
              <div
                className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold shadow-sm"
                title={assignee.name}
              >
                {assignee.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === ROW 3: Time Tracking (Right side) === */}
      {((task.estimatedHours && task.estimatedHours > 0) || (task.loggedHours && task.loggedHours > 0)) && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-end gap-3">
            {/* Time Progress */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-slate-700">
                  {formatHours(task.loggedHours, language) || '0m'}
                </span>
                {task.estimatedHours && task.estimatedHours > 0 && (
                  <>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-500">{formatHours(task.estimatedHours, language) || '0m'} {t('est')}</span>
                  </>
                )}
              </div>

              {/* Progress bar */}
              {task.estimatedHours && task.estimatedHours > 0 && (
                <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (task.loggedHours || 0) >= task.estimatedHours
                        ? 'bg-emerald-500'
                        : (task.loggedHours || 0) >= task.estimatedHours * 0.8
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, ((task.loggedHours || 0) / task.estimatedHours) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tags - Last row if exists */}
      {tags.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
