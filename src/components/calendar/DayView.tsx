import React from 'react';
import type { Task } from '../../types';

interface DayViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
}

const DayView: React.FC<DayViewProps> = ({
  currentDate,
  tasks,
  onTaskClick,
  onTimeSlotClick,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = currentDate.toDateString() === today.toDateString();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const dayTasks = tasks.filter((t) => {
    const dateStr = currentDate.toISOString().split('T')[0];
    return t.dueDate === dateStr;
  });

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'medium':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-gray-400';
      default:
        return 'border-l-gray-400';
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const allDayTasks = dayTasks.filter((t) => !t.startDate);
  const timedTasks = dayTasks.filter((t) => t.startDate);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div
        className={`p-4 border-b border-gray-200 dark:border-gray-700 ${
          isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
        }`}
      >
        <div className="text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div
            className={`text-3xl font-bold ${
              isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'
            }`}
          >
            {currentDate.getDate()}
          </div>
        </div>
      </div>

      {/* All day tasks */}
      {allDayTasks.length > 0 && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            All Day
          </div>
          <div className="space-y-1">
            {allDayTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                className={`p-2 text-sm rounded border-l-2 ${getPriorityBorderColor(
                  task.priority
                )} bg-white dark:bg-gray-700 cursor-pointer hover:shadow transition-shadow`}
              >
                <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="overflow-y-auto max-h-[600px]">
        <div className="grid grid-cols-[60px_1fr]">
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div className="h-12 px-2 py-1 text-xs text-right text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                {formatHour(hour)}
              </div>

              {/* Time slot */}
              <div
                onClick={() => onTimeSlotClick?.(currentDate, hour)}
                className="h-12 border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
              />
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Tasks sidebar */}
      {dayTasks.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Tasks ({dayTasks.length})
          </div>
          <div className="space-y-2">
            {dayTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                className={`p-2 text-sm rounded border-l-2 ${getPriorityBorderColor(
                  task.priority
                )} bg-white dark:bg-gray-700 cursor-pointer hover:shadow transition-shadow`}
              >
                <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                {task.dueDate && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DayView;
