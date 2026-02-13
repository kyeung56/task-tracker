import React, { useState, useMemo } from 'react';
import { Task, Category, TeamMember, Status } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { Avatar, Badge } from './common';

interface KanbanBoardProps {
  tasks: Task[];
  categories: Category[];
  teamMembers: TeamMember[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
}

interface KanbanColumn {
  id: Status;
  title: string;
  color: string;
  bgColor: string;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  categories,
  teamMembers,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const { t } = useLanguage();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);

  const columns: KanbanColumn[] = [
    { id: 'pending', title: t('pending') || '待处理', color: 'border-slate-400', bgColor: 'bg-slate-50' },
    { id: 'in-progress', title: t('inProgress') || '进行中', color: 'border-blue-400', bgColor: 'bg-blue-50' },
    { id: 'review', title: t('review') || '审核中', color: 'border-purple-400', bgColor: 'bg-purple-50' },
    { id: 'completed', title: t('completed') || '已完成', color: 'border-green-400', bgColor: 'bg-green-50' },
  ];

  const tasksByStatus = useMemo(() => {
    const grouped: Record<Status, Task[]> = {
      'pending': [],
      'in-progress': [],
      'review': [],
      'completed': [],
    };
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getCategoryById = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  const getMemberById = (memberId: string) => {
    return teamMembers.find(m => m.id === memberId);
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTask && draggedTask.status !== status) {
      onStatusChange(draggedTask.id, status);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  return (
    <div className="kanban-board h-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max h-full">
        {columns.map(column => (
          <div
            key={column.id}
            className={`kanban-column w-72 flex-shrink-0 flex flex-col rounded-xl border-t-4 ${column.color} ${
              dragOverColumn === column.id ? 'ring-2 ring-indigo-400 ring-opacity-50' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className={`px-4 py-3 ${column.bgColor} rounded-t-lg border-b border-gray-200`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">{column.title}</h3>
                <span className="w-6 h-6 flex items-center justify-center text-xs font-medium bg-white rounded-full shadow-sm text-gray-600">
                  {tasksByStatus[column.id].length}
                </span>
              </div>
            </div>

            {/* Task Cards */}
            <div className="flex-1 p-2 overflow-y-auto space-y-2 bg-gray-100/50 min-h-[200px]">
              {tasksByStatus[column.id].map(task => {
                const category = getCategoryById(task.category);
                const assignee = getMemberById(task.assignee || '');
                const overdue = isOverdue(task);

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onEdit(task)}
                    className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-all duration-200 ${
                      draggedTask?.id === task.id ? 'opacity-50 scale-95' : ''
                    } ${overdue ? 'border-l-4 border-l-red-500' : ''}`}
                  >
                    {/* Priority indicator */}
                    <div className={`w-full h-1 rounded-full ${getPriorityColor(task.priority)} mb-2`} />

                    {/* Title */}
                    <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                      {task.title}
                    </h4>

                    {/* Description preview */}
                    {task.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}

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
                            className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600"
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
                        <span>{task.loggedHours || 0}h / {task.estimatedHours || 0}h</span>
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
              {tasksByStatus[column.id].length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-xs">拖拽任务到这里</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Drag hint */}
      <div className="mt-4 text-center text-sm text-gray-500">
        💡 拖拽任务卡片可以更改状态
      </div>
    </div>
  );
};

export default KanbanBoard;
