import { useState, useMemo, useRef } from 'react';
import type { Task, Category, TeamMember, TaskStatus } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { formatHours, formatHoursDecimal } from '../utils/helpers';

interface KanbanBoardProps {
  tasks: Task[];
  categories: Category[];
  teamMembers: TeamMember[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

// Default workflow statuses (6 statuses)
const DEFAULT_STATUSES = [
  { id: 'pending', name: '待处理', color: '#6b7280', order: 1 },
  { id: 'in_progress', name: '进行中', color: '#3b82f6', order: 2 },
  { id: 'waiting', name: '等待确认', color: '#f59e0b', order: 3 },
  { id: 'completed', name: '已完成', color: '#10b981', order: 4 },
  { id: 'cancelled', name: '已取消', color: '#ef4444', order: 5 },
  { id: 'deferred', name: '已延期', color: '#f97316', order: 6 },
];

// Default transitions
const DEFAULT_TRANSITIONS = [
  { from: 'pending', to: ['in_progress', 'cancelled'] },
  { from: 'in_progress', to: ['waiting', 'completed', 'deferred', 'cancelled'] },
  { from: 'waiting', to: ['in_progress', 'completed', 'deferred'] },
  { from: 'deferred', to: ['in_progress', 'cancelled'] },
];

// Status translations
const statusTranslations: Record<string, Record<string, string>> = {
  en: {
    pending: 'Pending',
    in_progress: 'In Progress',
    waiting: 'Waiting',
    completed: 'Completed',
    cancelled: 'Cancelled',
    deferred: 'Deferred',
  },
  'zh-TW': {
    pending: '待處理',
    in_progress: '進行中',
    waiting: '等待確認',
    completed: '已完成',
    cancelled: '已取消',
    deferred: '已延期',
  },
  'zh-CN': {
    pending: '待处理',
    in_progress: '进行中',
    waiting: '等待确认',
    completed: '已完成',
    cancelled: '已取消',
    deferred: '已延期',
  },
};

// Toast notification helper
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  const event = new CustomEvent('show-toast', { detail: { message, type } });
  window.dispatchEvent(event);
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  categories,
  teamMembers,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const { t, language } = useLanguage();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  // Listen for toast events
  useState(() => {
    const handleToast = (e: CustomEvent) => {
      setToast({ message: e.detail.message, type: e.detail.type, visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };
    window.addEventListener('show-toast', handleToast as EventListener);
    return () => window.removeEventListener('show-toast', handleToast as EventListener);
  });

  // Use local workflow data
  const workflowStatuses = DEFAULT_STATUSES;
  const workflowTransitions = DEFAULT_TRANSITIONS;

  // Generate columns from workflow statuses (show active columns + completed)
  const columns = useMemo(() => {
    const activeStatusIds = ['pending', 'in_progress', 'waiting', 'completed'];
    const activeStatuses = workflowStatuses.filter(s => activeStatusIds.includes(s.id));

    return activeStatuses.map((status) => ({
      id: status.id as TaskStatus,
      title: statusTranslations[language]?.[status.id] || status.name,
      statusColor: status.color,
    }));
  }, [language]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    // Initialize all columns
    columns.forEach((col) => {
      grouped[col.id] = [];
    });

    // Group tasks
    tasks.forEach((task) => {
      const status = task.status;
      if (grouped[status]) {
        grouped[status].push(task);
      }
    });

    return grouped;
  }, [tasks, columns]);

  // Calculate column statistics
  const getColumnStats = (statusId: TaskStatus) => {
    const columnTasks = tasksByStatus[statusId] || [];
    const count = columnTasks.length;
    const totalEstimated = columnTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const totalLogged = columnTasks.reduce((sum, task) => sum + (task.loggedHours || 0), 0);

    return { count, totalEstimated, totalLogged };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getCategoryById = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId);
  };

  const getMemberById = (memberId: string | null) => {
    if (!memberId) return null;
    return teamMembers.find(m => m.id === memberId);
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.dueDate) < new Date();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const canTransitionTo = (fromStatus: TaskStatus, toStatus: TaskStatus): boolean => {
    if (fromStatus === toStatus) return false;
    const transition = workflowTransitions.find(t => t.from === fromStatus);
    return transition?.to.includes(toStatus) || false;
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);

    // Add slight delay for visual effect
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.classList.add('dragging');
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && canTransitionTo(draggedTask.status, status)) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverColumn(status);
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTask && draggedTask.status !== status && canTransitionTo(draggedTask.status, status)) {
      const fromStatusName = statusTranslations[language]?.[draggedTask.status] || draggedTask.status;
      const toStatusName = statusTranslations[language]?.[status] || status;

      onStatusChange(draggedTask.id, status);

      // Show toast notification
      const toastMessage = language === 'en'
        ? `"${draggedTask.title}" moved from ${fromStatusName} to ${toStatusName}`
        : `"${draggedTask.title}" ${t('movedFrom') || '已从'} ${fromStatusName} ${t('movedTo') || '移至'} ${toStatusName}`;

      setToast({ message: toastMessage, type: 'success', visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
    if (dragNodeRef.current) {
      dragNodeRef.current.classList.remove('dragging');
    }
  };

  return (
    <>
      {/* Toast Notification */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl border shadow-xl transition-all duration-300 ${
          toast.visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        } ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}
      >
        {toast.type === 'success' ? (
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className="text-sm font-medium text-slate-700">{toast.message}</span>
      </div>

      <div className="kanban-board h-full overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {columns.map((column) => {
            const statusConfig = workflowStatuses.find(s => s.id === column.id);
            const statusColor = statusConfig?.color || '#6b7280';
            const stats = getColumnStats(column.id);
            const isDropTarget = dragOverColumn === column.id;
            const canDrop = draggedTask && canTransitionTo(draggedTask.status, column.id);

            return (
              <div
                key={column.id}
                className={`kanban-column w-72 flex-shrink-0 flex flex-col rounded-xl border-t-4 transition-all duration-200 ${
                  isDropTarget && canDrop
                    ? 'ring-4 ring-offset-2 scale-[1.02]'
                    : ''
                }`}
                style={{
                  borderColor: statusColor,
                  backgroundColor: isDropTarget && canDrop ? `${statusColor}15` : 'white',
                  boxShadow: isDropTarget && canDrop ? `0 0 30px ${statusColor}40` : '0 1px 3px rgba(0,0,0,0.1)',
                  ringColor: isDropTarget && canDrop ? statusColor : 'transparent',
                }}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header with Statistics */}
                <div
                  className="px-4 py-3 rounded-t-lg"
                  style={{ backgroundColor: `${statusColor}10` }}
                >
                  {/* Title row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: statusColor }}
                      />
                      <h3 className="font-semibold text-gray-800">{column.title}</h3>
                    </div>
                    <span
                      className="min-w-[28px] h-7 flex items-center justify-center px-2 text-sm font-bold rounded-full text-white shadow-sm"
                      style={{ backgroundColor: statusColor }}
                    >
                      {stats.count}
                    </span>
                  </div>

                  {/* Statistics row */}
                  <div className="flex items-center gap-4 text-xs">
                    {/* Estimated hours */}
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-slate-500">{t('estHours') || '预估'}:</span>
                      <span className="font-semibold text-slate-700">{formatHours(stats.totalEstimated, language) || '0m'}</span>
                    </div>

                    {/* Logged hours */}
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-slate-500">{t('logged') || '已做'}:</span>
                      <span className="font-semibold text-emerald-600">{formatHours(stats.totalLogged, language) || '0m'}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {stats.totalEstimated > 0 && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            stats.totalLogged >= stats.totalEstimated
                              ? 'bg-emerald-500'
                              : stats.totalLogged >= stats.totalEstimated * 0.7
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (stats.totalLogged / stats.totalEstimated) * 100)}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                        <span>0%</span>
                        <span className="font-medium text-slate-600">
                          {Math.round((stats.totalLogged / stats.totalEstimated) * 100)}%
                        </span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-200" />

                {/* Drop indicator when dragging over */}
                {isDropTarget && canDrop && (
                  <div
                    className="mx-2 -mb-1 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: statusColor }}
                  />
                )}

                {/* Task Cards */}
                <div className="flex-1 p-2 overflow-y-auto space-y-2 bg-slate-50 min-h-[200px]">
                  {tasksByStatus[column.id]?.map((task) => {
                    const category = getCategoryById(task.categoryId);
                    const assignee = getMemberById(task.assigneeId);
                    const overdue = isOverdue(task);
                    const isDragging = draggedTask?.id === task.id;

                    return (
                      <div
                        key={task.id}
                        ref={isDragging ? dragNodeRef : null}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onEdit(task)}
                        className={`group bg-white rounded-lg border p-3 cursor-pointer transition-all duration-200 origin-center ${
                          isDragging
                            ? 'opacity-30 scale-95 rotate-2 shadow-2xl'
                            : 'border-slate-200 hover:shadow-md hover:-translate-y-0.5'
                        } ${overdue ? 'border-l-4 border-l-red-500' : ''}`}
                        style={{
                          boxShadow: isDragging
                            ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            : undefined,
                        }}
                      >
                        {/* Priority indicator */}
                        <div className={`w-full h-1 rounded-full ${getPriorityColor(task.priority)} mb-2`} />

                        {/* Title */}
                        <h4 className={`font-medium text-gray-900 text-sm mb-2 line-clamp-2 ${
                          task.status === 'completed' ? 'line-through text-gray-400' : ''
                        }`}>
                          {task.title}
                        </h4>

                        {/* Category */}
                        {category && (
                          <div className="mb-2">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: `${category.color}20`,
                                color: category.color,
                              }}
                            >
                              {category.name}
                            </span>
                          </div>
                        )}

                        {/* Footer: Due date & Assignee */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          {/* Due date */}
                          {task.dueDate && (
                            <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                              {overdue && '⚠️ '}
                              {formatDate(task.dueDate)}
                            </span>
                          )}

                          {/* Assignee */}
                          {assignee && (
                            <div className="flex items-center gap-1">
                              <div
                                className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white"
                                title={assignee.name}
                              >
                                {assignee.name.charAt(0)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Time tracking */}
                        {(task.estimatedHours || task.loggedHours) && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatHours(task.loggedHours, language) || '0m'} / {formatHours(task.estimatedHours, language) || '0m'}</span>
                          </div>
                        )}

                        {/* Quick actions */}
                        <div className="mt-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(task);
                            }}
                            className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                            title={t('edit') || '编辑'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(t('confirmDeleteTask'))) {
                                onDelete(task.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title={t('delete') || '删除'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty state */}
                  {(!tasksByStatus[column.id] || tasksByStatus[column.id].length === 0) && (
                    <div className="text-center py-8 text-gray-400">
                      <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-xs">{t('dragTasksHere') || '拖拽任务到这里'}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Drag hint */}
        <div className="mt-4 text-center text-sm text-gray-500">
          💡 {t('dragHint') || '拖拽任务卡片可以更改状态'}
        </div>
      </div>
    </>
  );
};

export default KanbanBoard;
