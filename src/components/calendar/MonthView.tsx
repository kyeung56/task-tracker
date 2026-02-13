import React, { useMemo } from 'react';
import type { Task, CalendarView } from '../../types';

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  onDateClick: (date: Date) => void;
  onTaskClick: (task: Task) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ currentDate, tasks, onDateClick, onTaskClick }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendar = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();

    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Generate calendar days
    const days: { date: Date; isCurrentMonth: boolean; tasks: Task[] }[] = [];

    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
      days.push({ date, isCurrentMonth: false, tasks: dayTasks });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
      days.push({ date, isCurrentMonth: true, tasks: dayTasks });
    }

    // Next month days (to fill the grid)
    const remainingDays = 42 - days.length; // 6 rows x 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
      days.push({ date, isCurrentMonth: false, tasks: dayTasks });
    }

    return days;
  }, [currentDate, tasks]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.dueDate) < today;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-blue-500';
      case 'low':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-700">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendar.map((day, index) => (
          <div
            key={index}
            onClick={() => onDateClick(day.date)}
            className={`min-h-24 p-1 border-b border-r border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
              !day.isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/50' : ''
            }`}
          >
            {/* Date number */}
            <div
              className={`flex items-center justify-center w-7 h-7 mb-1 rounded-full text-sm ${
                isToday(day.date)
                  ? 'bg-indigo-600 text-white font-semibold'
                  : day.isCurrentMonth
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {day.date.getDate()}
            </div>

            {/* Tasks */}
            <div className="space-y-1">
              {day.tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick(task);
                  }}
                  className={`px-2 py-0.5 text-xs truncate rounded cursor-pointer hover:opacity-80 ${
                    task.status === 'completed'
                      ? 'line-through text-gray-400 bg-gray-100 dark:bg-gray-700'
                      : isOverdue(task)
                      ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30'
                      : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${getPriorityColor(task.priority)}`} />
                  {task.title}
                </div>
              ))}
              {day.tasks.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                  +{day.tasks.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthView;
