import React from 'react';
import type { Task } from '../../types';
import { Badge, Avatar } from '../common';
import PriorityBadge from '../tasks/PriorityBadge';
import StatusBadge from '../tasks/StatusBadge';

interface TaskDrawerProps {
  date: Date | null;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask?: (date: Date) => void;
}

const TaskDrawer: React.FC<TaskDrawerProps> = ({ date, tasks, onTaskClick, onCreateTask }) => {
  if (!date) return null;

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(task.dueDate) < today;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {formatDate(date)}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-gray-400"
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
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No tasks for this day</p>
            {onCreateTask && (
              <button
                onClick={() => onCreateTask(date)}
                className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Create a task
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                className={`p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-shadow ${
                  isOverdue(task) ? 'border-l-4 border-l-red-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2">
                    {task.title}
                  </h4>
                  <PriorityBadge priority={task.priority} size="sm" />
                </div>

                {task.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <StatusBadge status={task.status} size="sm" />

                  {task.assignee && (
                    <div className="flex items-center gap-1">
                      <Avatar
                        name={task.assignee.name || 'Unknown'}
                        src={task.assignee.avatarUrl || null}
                        size="xs"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {task.assignee.name}
                      </span>
                    </div>
                  )}
                </div>

                {task.category && (
                  <div className="mt-2">
                    <Badge
                      variant="default"
                      size="sm"
                      className="inline-flex items-center"
                    >
                      <span
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: task.category.color }}
                      />
                      {task.category.name}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {onCreateTask && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onCreateTask(date)}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskDrawer;
