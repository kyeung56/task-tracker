import React from 'react';
import TaskItem from './TaskItem';
import { useLanguage } from '../hooks/useLanguage';
import { TaskListProps } from '../types';

export default function TaskList({
  tasks,
  categories,
  teamMembers,
  onEdit,
  onDelete,
  onStatusChange,
  onTimeUpdate
}: TaskListProps) {
  const { t } = useLanguage();

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center">
          <svg
            className="w-10 h-10 text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">{t('noTasksFound')}</h3>
        <p className="text-slate-500 max-w-sm mx-auto">
          {t('getStarted')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          categories={categories}
          teamMembers={teamMembers}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onTimeUpdate={onTimeUpdate}
        />
      ))}
    </div>
  );
}
