import React, { useMemo } from 'react';
import type { Task } from '../../types';

interface WeekViewProps {
  currentDate: Date;
  tasks: Task[];
  onDateClick: (date: Date) => void;
  onTaskClick: (task: Task) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
}

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  tasks,
  onDateClick,
  onTaskClick,
  onTimeSlotClick,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter((t) => t.dueDate === dateStr);
  };

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
          GMT+8
        </div>
        {weekDays.map((day, index) => (
          <div
            key={index}
            onClick={() => onDateClick(day)}
            className={`p-2 text-center border-l border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
              isToday(day) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
            }`}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {day.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div
              className={`text-lg font-semibold ${
                isToday(day)
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto max-h-[600px]">
        <div className="grid grid-cols-8">
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div className="h-12 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                {formatHour(hour)}
              </div>

              {/* Day columns */}
              {weekDays.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  onClick={() => onTimeSlotClick?.(day, hour)}
                  className={`h-12 border-l border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 relative ${
                    isToday(day) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''
                  }`}
                />
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* Tasks overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ top: '40px' }}>
          {weekDays.map((day, dayIndex) => {
            const dayTasks = getTasksForDate(day);
            return dayTasks.map((task) => (
              <div
                key={task.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskClick(task);
                }}
                className={`absolute left-[calc(${(dayIndex + 1) * 12.5}%+1px)] w-[calc(12.5%-2px)] mx-0.5 p-1 text-xs rounded border-l-2 ${getPriorityBorderColor(
                  task.priority
                )} bg-white dark:bg-gray-700 shadow cursor-pointer pointer-events-auto hover:shadow-md transition-shadow`}
                style={{
                  top: `${8 * 48}px`, // Default to 8 AM
                  height: '48px',
                }}
              >
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {task.title}
                </div>
              </div>
            ));
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
