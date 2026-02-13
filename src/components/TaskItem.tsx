import { formatDate, isOverdue, isDueToday, isDueSoon, priorityColors, statusColors } from '../utils/helpers';
import { useLanguage } from '../hooks/useLanguage';
import { usePermissions } from '../hooks/usePermissions';
import TimeTracker from './TimeTracker';
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
  const { t } = useLanguage();
  const { canEditTask, canDeleteTask, currentUserId, isAdmin } = usePermissions();
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
    // Only allow status change if user can edit
    if (!canEdit) return;
    const statusOrder: TaskStatus[] = ['pending', 'in_progress', 'waiting', 'completed'];
    const currentIndex = statusOrder.indexOf(task.status);
    if (currentIndex >= 0) {
      const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
      onStatusChange(task.id, nextStatus);
    }
  };

  const statusIcons: Record<TaskStatus, React.ReactNode> = {
    pending: (
      <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-transparent"></div>
      </div>
    ),
    in_progress: (
      <div className="w-6 h-6 rounded-full border-2 border-blue-400 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
      </div>
    ),
    waiting: (
      <div className="w-6 h-6 rounded-full border-2 border-amber-400 flex items-center justify-center">
        <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      </div>
    ),
    completed: (
      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
    cancelled: (
      <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    ),
    deferred: (
      <div className="w-6 h-6 rounded-full border-2 border-orange-400 flex items-center justify-center">
        <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      </div>
    ),
  };

  const statusLabels: Record<TaskStatus, string> = {
    pending: '待处理',
    in_progress: '进行中',
    waiting: '等待确认',
    completed: '已完成',
    cancelled: '已取消',
    deferred: '已延期',
  };

  const priorityLabels: Record<Priority, string> = {
    low: t('priorityLow'),
    medium: t('priorityMedium'),
    high: t('priorityHigh'),
    critical: t('priorityCritical')
  };

  const tags = Array.isArray(task.tags) ? task.tags : (task.tags ? task.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []);

  // Determine card styling based on priority and due status
  const getCardClasses = () => {
    if (isCompleted) {
      return 'opacity-60 border-slate-200 bg-white';
    }
    if (overdue && isCritical) {
      return 'border-red-400 bg-red-50 shadow-lg shadow-red-200 animate-urgent-pulse';
    }
    if (overdue) {
      return 'border-red-300 bg-red-50/50 shadow-lg shadow-red-100';
    }
    if (dueToday && isCritical) {
      return 'border-red-400 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg shadow-red-200 animate-today-pulse';
    }
    if (dueToday) {
      return 'border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-lg shadow-amber-100';
    }
    if (dueSoon && isCritical) {
      return 'border-orange-400 bg-orange-50 shadow-md shadow-orange-100 animate-soon-pulse';
    }
    if (dueSoon) {
      return 'border-orange-200 bg-orange-50/50 shadow-md shadow-orange-50';
    }
    if (isCritical) {
      return 'border-red-300 bg-red-50/30 shadow-md shadow-red-50';
    }
    if (isHigh) {
      return 'border-orange-200 hover:border-orange-300';
    }
    return 'border-slate-200 hover:border-slate-300 hover:shadow-lg';
  };

  return (
    <div
      className={`bg-white rounded-2xl p-5 transition-all duration-200 border ${getCardClasses()}`}
    >
      {/* Critical/Today indicator strip */}
      {!isCompleted && (isCritical || dueToday || overdue) && (
        <div className={`-mx-5 -mt-5 mb-4 h-1 rounded-t-2xl ${
          overdue ? 'bg-red-500' :
          dueToday ? 'bg-amber-500 animate-pulse' :
          isCritical ? 'bg-red-400' : ''
        }`} />
      )}
      <div className="flex items-start gap-4">
        {/* Status Toggle */}
        <button
          onClick={handleStatusToggle}
          disabled={!canEdit}
          className={`mt-0.5 flex-shrink-0 transition-transform ${
            canEdit ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed opacity-60'
          }`}
          title={`${t('status')}: ${statusLabels[task.status]}${!canEdit ? ` (${t('noPermission')})` : ''}`}
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
              {canEdit ? (
                <button
                  onClick={() => onEdit(task)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  title={t('editTask')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              ) : (
                <button
                  disabled
                  className="p-2 text-slate-300 cursor-not-allowed rounded-lg"
                  title={t('noPermission')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              {canDelete ? (
                <button
                  onClick={() => onDelete(task.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title={t('confirmDeleteTask')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              ) : (
                <button
                  disabled
                  className="p-2 text-slate-300 cursor-not-allowed rounded-lg"
                  title={t('noPermission')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
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

            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${
              isCritical ? 'priority-critical' :
              isHigh ? 'priority-high' :
              task.priority === 'medium' ? 'priority-medium' :
              'priority-low'
            }`}>
              {isCritical && (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {isHigh && !isCritical && (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
              )}
              {priorityLabels[task.priority]}
            </span>

            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusColors[task.status] || statusColors.in_progress}`}>
              {statusLabels[task.status]}
            </span>

            {assignee && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700">
                <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                  {assignee.name.charAt(0)}
                </div>
                {assignee.name}
              </span>
            )}

            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  overdue
                    ? 'bg-red-100 text-red-700 animate-pulse'
                    : dueToday
                    ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                    : dueSoon
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {(overdue || dueToday || dueSoon) && (
                  <svg className={`w-3.5 h-3.5 ${overdue ? 'animate-ping' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {overdue ? t('overdueLabel') + ': ' : dueToday ? t('dueToday') + ': ' : t('dueLabel') + ': '}
                {formatDate(task.dueDate)}
              </span>
            )}

            {((task.estimatedHours && task.estimatedHours > 0) || task.loggedHours > 0) && (
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
              {tags.map((tag: string, index: number) => (
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
