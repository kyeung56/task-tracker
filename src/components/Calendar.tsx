import React, { useState, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { formatDate, isOverdue } from '../utils/helpers';
import { CalendarProps, Task, Priority, Status } from '../types';

interface DayInfo {
  date: Date | null;
  isPadding: boolean;
  isToday?: boolean;
  isPast?: boolean;
}

export default function Calendar({ tasks, categories, teamMembers, onTaskClick, onDateClick }: CalendarProps) {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate year options (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    yearOptions.push(y);
  }

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysArray: DayInfo[] = [];

    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) {
      daysArray.push({ date: null, isPadding: true });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateObj = new Date(year, month, day);
      const todayObj = new Date();
      todayObj.setHours(0, 0, 0, 0);
      daysArray.push({
        date: dateObj,
        isPadding: false,
        isToday: dateObj.getTime() === todayObj.getTime(),
        isPast: dateObj < todayObj
      });
    }

    return daysArray;
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = new Date(task.dueDate).toDateString();
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(task);
      }
    });
    return map;
  }, [tasks]);

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toDateString();
    return tasksByDate[dateKey] || [];
  }, [selectedDate, tasksByDate]);

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
    setSelectedDate(null);
  };

  const handleMonthChange = (monthIndex: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(monthIndex);
      return newDate;
    });
    setSelectedDate(null);
  };

  const handleYearChange = (year: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(year);
      return newDate;
    });
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const weekDays = t('weekDays') as string[];
  const months = t('months') as string[];

  const getTaskPriorityColor = (task: Task): string => {
    if (task.status === 'completed') return 'bg-emerald-500';
    if (isOverdue(task.dueDate, task.status)) return 'bg-red-500';
    switch (task.priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  };

  const getAssigneeAvatar = (task: Task): string | null => {
    const member = teamMembers.find(m => m.id === task.assignee);
    return member?.avatar || null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
      {/* Calendar Header */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-white/20 rounded-xl transition-all"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Month and Year Selectors */}
          <div className="flex items-center gap-3">
            <select
              value={currentDate.getMonth()}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              className="px-4 py-2 bg-white/20 text-white border-2 border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 font-semibold cursor-pointer hover:bg-white/30 transition-all"
            >
              {months.map((month, index) => (
                <option key={index} value={index} className="text-slate-800 bg-white">
                  {month}
                </option>
              ))}
            </select>

            <select
              value={currentDate.getFullYear()}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="px-4 py-2 bg-white/20 text-white border-2 border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 font-semibold cursor-pointer hover:bg-white/30 transition-all"
            >
              {yearOptions.map(year => (
                <option key={year} value={year} className="text-slate-800 bg-white">
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-white/20 rounded-xl transition-all"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={goToToday}
            className="px-5 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all text-sm font-semibold shadow-lg"
          >
          {t('today')}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Calendar Grid */}
        <div className="flex-1">
          {/* Week Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {weekDays.map((day, index) => (
              <div key={index} className="py-3 text-center text-sm font-semibold text-slate-600">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {daysInMonth.map((day, index) => {
              if (day.isPadding) {
                return <div key={`padding-${index}`} className="min-h-[100px] border-b border-r border-slate-200 bg-slate-50" />;
              }

              const dateKey = day.date!.toDateString();
              const dayTasks = tasksByDate[dateKey] || [];
              const isSelected = selectedDate && day.date!.toDateString() === selectedDate.toDateString();

              return (
                <div
                  key={day.date!.toISOString()}
                  onClick={() => setSelectedDate(day.date)}
                  className={`min-h-[100px] border-b border-r border-slate-200 p-1.5 cursor-pointer transition-all ${
                    isSelected ? 'bg-indigo-50 ring-2 ring-indigo-500 ring-inset' : 'hover:bg-slate-50'
                  } ${day.isToday ? 'bg-indigo-50/50' : ''}`}
                >
                  <div className={`text-sm font-semibold mb-1.5 w-7 h-7 flex items-center justify-center rounded-full ${
                    day.isToday ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg' : day.isPast ? 'text-slate-400' : 'text-slate-700'
                  }`}>
                    {day.date!.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick(task);
                        }}
                        className={`text-xs px-2 py-1 rounded-lg truncate text-white cursor-pointer hover:opacity-80 transition-all ${getTaskPriorityColor(task)} ${
                          task.status === 'completed' ? 'opacity-60 line-through' : ''
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-slate-500 px-2 font-medium">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Tasks Sidebar */}
        <div className="w-80 border-l border-slate-200 bg-slate-50">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="font-semibold text-slate-800 text-lg">
              {selectedDate ? formatDate(selectedDate) : t('selectDate')}
            </h3>
            {selectedDate && (
              <p className="text-sm text-slate-500 mt-1">
                {selectedDateTasks.length} {t('tasksDue')}
              </p>
            )}
          </div>

          {selectedDate && (
            <div className="p-4">
              <button
                onClick={() => onDateClick(selectedDate)}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-semibold shadow-lg shadow-indigo-500/30 mb-4"
              >
                {t('addTaskForDate')}
              </button>

              {selectedDateTasks.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">{t('noTasksDue')}</p>
              ) : (
                <div className="space-y-2">
                  {selectedDateTasks.map(task => {
                    const category = categories.find(c => c.id === task.category);
                    const avatar = getAssigneeAvatar(task);

                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className={`p-3 bg-white rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all border ${
                          task.status === 'completed' ? 'opacity-60 border-slate-200' : 'border-slate-200'
                        } ${isOverdue(task.dueDate, task.status) ? 'border-l-4 border-l-red-500' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${getTaskPriorityColor(task)}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium text-slate-800 truncate ${
                              task.status === 'completed' ? 'line-through' : ''
                            }`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {category && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded-lg text-white font-medium"
                                  style={{ backgroundColor: category.color }}
                                >
                                  {category.name}
                                </span>
                              )}
                              {avatar && (
                                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs flex items-center justify-center font-bold">
                                  {avatar}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 p-4 border-t border-slate-200 bg-slate-50 text-xs">
        <span className="text-slate-500 font-medium">{t('priorityLegend')}</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-600" />
          <span className="text-slate-600">{t('priorityCritical')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-slate-600">{t('priorityHigh')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-slate-600">{t('priorityMedium')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-400" />
          <span className="text-slate-600">{t('priorityLow')}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-4">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-600">{t('completed')}</span>
        </div>
      </div>
    </div>
  );
}
