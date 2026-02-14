import { useState, useMemo, useRef, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { formatDate, isOverdue } from '../utils/helpers';
import { CalendarProps, Task } from '../types';

type CalendarView = 'month' | 'week' | 'day';

interface DayInfo {
  date: Date;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
  isSelected?: boolean;
}

// Hour range for timeline (6 AM - 10 PM)
const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 60; // pixels per hour

export default function Calendar({ tasks, categories, teamMembers, onTaskClick, onDateClick }: CalendarProps) {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarView>('month');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerView, setDatePickerView] = useState<'days' | 'months' | 'years'>('days');
  const datePickerRef = useRef<HTMLDivElement>(null);
  const weekTimelineRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDays = t('weekDays') as unknown as string[];
  const months = t('months') as unknown as string[];

  // Close date picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
        setDatePickerView('days');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate month days
  const daysInMonth = useMemo((): DayInfo[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysArray: DayInfo[] = [];

    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const dateObj = new Date(year, month, -i);
      daysArray.push({
        date: dateObj,
        isToday: dateObj.toDateString() === today.toDateString(),
        isPast: dateObj < today,
        isCurrentMonth: false
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateObj = new Date(year, month, day);
      daysArray.push({
        date: dateObj,
        isToday: dateObj.toDateString() === today.toDateString(),
        isPast: dateObj < today,
        isCurrentMonth: true
      });
    }

    const remaining = 42 - daysArray.length;
    for (let i = 1; i <= remaining; i++) {
      const dateObj = new Date(year, month + 1, i);
      daysArray.push({
        date: dateObj,
        isToday: dateObj.toDateString() === today.toDateString(),
        isPast: dateObj < today,
        isCurrentMonth: false
      });
    }

    return daysArray;
  }, [currentDate, today]);

  // Generate week days
  const daysInWeek = useMemo((): DayInfo[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    const currentDayOfWeek = currentDate.getDay();

    const daysArray: DayInfo[] = [];
    const startOfWeek = new Date(year, month, day - currentDayOfWeek);

    for (let i = 0; i < 7; i++) {
      const dateObj = new Date(startOfWeek);
      dateObj.setDate(startOfWeek.getDate() + i);
      daysArray.push({
        date: dateObj,
        isToday: dateObj.toDateString() === today.toDateString(),
        isPast: dateObj < today,
        isCurrentMonth: dateObj.getMonth() === currentDate.getMonth()
      });
    }

    return daysArray;
  }, [currentDate, today]);

  // Tasks by date (including scheduled tasks)
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};

    const addTaskToDate = (dateKey: string, task: Task) => {
      if (!map[dateKey]) map[dateKey] = [];
      if (!map[dateKey].find(t => t.id === task.id)) {
        map[dateKey].push(task);
      }
    };

    tasks.forEach(task => {
      // Check if task has a schedule
      if (task.schedule) {
        const schedule = task.schedule;
        const startDate = schedule.startDate ? new Date(schedule.startDate) : null;
        const endDate = schedule.endDate || schedule.recurrenceEnd ? new Date(schedule.endDate || schedule.recurrenceEnd!) : null;

        if (schedule.scheduleType === 'deadline') {
          // For deadline type, use the startDate as the due date
          if (startDate) {
            addTaskToDate(startDate.toDateString(), task);
          }
        } else if (schedule.scheduleType === 'daily_hours') {
          // For daily hours, add to each day within the range
          if (startDate && endDate) {
            const current = new Date(startDate);
            while (current <= endDate) {
              addTaskToDate(current.toDateString(), task);
              current.setDate(current.getDate() + 1);
            }
          } else if (startDate) {
            // If no end date, show for 30 days
            const current = new Date(startDate);
            const limit = new Date(startDate);
            limit.setDate(limit.getDate() + 30);
            while (current <= limit) {
              addTaskToDate(current.toDateString(), task);
              current.setDate(current.getDate() + 1);
            }
          }
        } else if (schedule.scheduleType === 'weekly_days') {
          // For weekly days, add to specific days of the week
          if (schedule.slots && schedule.slots.length > 0) {
            const daysOfWeek = schedule.slots.map(s => s.dayOfWeek);
            const current = startDate ? new Date(startDate) : new Date();
            const limit = endDate || new Date(current.getTime() + 90 * 24 * 60 * 60 * 1000);

            // Go back 30 days to include past dates too
            if (!startDate) {
              current.setDate(current.getDate() - 30);
            }

            while (current <= limit) {
              if (daysOfWeek.includes(current.getDay())) {
                addTaskToDate(current.toDateString(), task);
              }
              current.setDate(current.getDate() + 1);
            }
          }
        } else if (schedule.scheduleType === 'monthly_day') {
          // For monthly day, add to specific day of each month
          const monthlyDay = (schedule as any).monthlyDay || 1;
          const current = startDate ? new Date(startDate) : new Date();
          const limit = endDate || new Date(current.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

          // Go back 3 months to include past dates
          if (!startDate) {
            current.setMonth(current.getMonth() - 3);
          }

          while (current <= limit) {
            // Check if this month has this day (e.g., Feb 30 doesn't exist)
            const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
            const targetDay = Math.min(monthlyDay, daysInMonth);

            if (current.getDate() === targetDay) {
              addTaskToDate(current.toDateString(), task);
              current.setMonth(current.getMonth() + 1);
              current.setDate(1); // Reset to first of month
            } else if (current.getDate() < targetDay) {
              current.setDate(targetDay);
            } else {
              current.setMonth(current.getMonth() + 1);
              current.setDate(1);
            }
          }
        }
      } else if (task.dueDate) {
        // Fallback for tasks without schedule (use dueDate)
        const dateKey = new Date(task.dueDate).toDateString();
        addTaskToDate(dateKey, task);
      }
    });
    return map;
  }, [tasks]);

  // Tasks by date and hour (for timeline view)
  const tasksByDateAndHour = useMemo(() => {
    const map: Record<string, Task[]> = {};

    const addTaskToDate = (dateKey: string, task: Task) => {
      if (!map[dateKey]) map[dateKey] = [];
      if (!map[dateKey].find(t => t.id === task.id)) {
        map[dateKey].push(task);
      }
    };

    tasks.forEach(task => {
      if (task.schedule) {
        const schedule = task.schedule;
        const startDate = schedule.startDate ? new Date(schedule.startDate) : null;
        const endDate = schedule.endDate || schedule.recurrenceEnd ? new Date(schedule.endDate || schedule.recurrenceEnd!) : null;

        if (schedule.scheduleType === 'deadline') {
          if (startDate) {
            addTaskToDate(startDate.toDateString(), task);
          }
        } else if (schedule.scheduleType === 'daily_hours') {
          if (startDate && endDate) {
            const current = new Date(startDate);
            while (current <= endDate) {
              addTaskToDate(current.toDateString(), task);
              current.setDate(current.getDate() + 1);
            }
          } else if (startDate) {
            const current = new Date(startDate);
            const limit = new Date(startDate);
            limit.setDate(limit.getDate() + 30);
            while (current <= limit) {
              addTaskToDate(current.toDateString(), task);
              current.setDate(current.getDate() + 1);
            }
          }
        } else if (schedule.scheduleType === 'weekly_days') {
          if (schedule.slots && schedule.slots.length > 0) {
            const daysOfWeek = schedule.slots.map(s => s.dayOfWeek);
            const current = startDate ? new Date(startDate) : new Date();
            const limit = endDate || new Date(current.getTime() + 90 * 24 * 60 * 60 * 1000);

            if (!startDate) {
              current.setDate(current.getDate() - 30);
            }

            while (current <= limit) {
              if (daysOfWeek.includes(current.getDay())) {
                addTaskToDate(current.toDateString(), task);
              }
              current.setDate(current.getDate() + 1);
            }
          }
        } else if (schedule.scheduleType === 'monthly_day') {
          // For monthly day, add to specific day of each month
          const monthlyDay = (schedule as any).monthlyDay || 1;
          const current = startDate ? new Date(startDate) : new Date();
          const limit = endDate || new Date(current.getTime() + 365 * 24 * 60 * 60 * 1000);

          if (!startDate) {
            current.setMonth(current.getMonth() - 3);
          }

          while (current <= limit) {
            const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
            const targetDay = Math.min(monthlyDay, daysInMonth);

            if (current.getDate() === targetDay) {
              addTaskToDate(current.toDateString(), task);
              current.setMonth(current.getMonth() + 1);
              current.setDate(1);
            } else if (current.getDate() < targetDay) {
              current.setDate(targetDay);
            } else {
              current.setMonth(current.getMonth() + 1);
              current.setDate(1);
            }
          }
        }
      } else if (task.dueDate) {
        const taskDate = new Date(task.dueDate);
        addTaskToDate(taskDate.toDateString(), task);
      }
    });
    return map;
  }, [tasks]);

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasksByDate[selectedDate.toDateString()] || [];
  }, [selectedDate, tasksByDate]);

  const getTaskCountForDate = (date: Date): number => {
    return tasksByDate[date.toDateString()]?.length || 0;
  };

  // Navigation
  const navigate = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (view) {
        case 'month': newDate.setMonth(newDate.getMonth() + direction); break;
        case 'week': newDate.setDate(newDate.getDate() + (direction * 7)); break;
        case 'day': newDate.setDate(newDate.getDate() + direction); break;
      }
      return newDate;
    });
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
    setShowDatePicker(false);
  };

  const selectDate = (date: Date) => {
    setCurrentDate(date);
    setSelectedDate(date);
    setShowDatePicker(false);
    setDatePickerView('days');
  };

  const selectMonth = (monthIndex: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(monthIndex);
      return newDate;
    });
    setDatePickerView('days');
  };

  const selectYear = (year: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(year);
      return newDate;
    });
    setDatePickerView('months');
  };

  // Color helpers
  const getTaskPriorityColor = (task: Task): string => {
    if (task.status === 'completed') return 'bg-emerald-500';
    if (isOverdue(task.dueDate, task.status)) return 'bg-red-500';
    switch (task.priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-amber-500';
      default: return 'bg-indigo-500';
    }
  };

  const getTaskPriorityBorderColor = (task: Task): string => {
    if (task.status === 'completed') return 'border-emerald-600';
    if (isOverdue(task.dueDate, task.status)) return 'border-red-600';
    switch (task.priority) {
      case 'critical': return 'border-red-700';
      case 'high': return 'border-orange-600';
      case 'medium': return 'border-amber-600';
      default: return 'border-indigo-600';
    }
  };

  const getAssigneeAvatar = (task: Task): string | null => {
    const assigneeId = typeof task.assignee === 'string' ? task.assignee : task.assignee?.id;
    const member = teamMembers.find(m => m.id === assigneeId);
    if (member) {
      return 'avatar' in member ? member.avatar : member.avatarUrl?.charAt(0).toUpperCase() || null;
    }
    return null;
  };

  // Get title for current view
  const getViewTitle = () => {
    if (view === 'month') {
      return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (view === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${months[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
      }
      return `${months[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${months[endOfWeek.getMonth()]} ${endOfWeek.getDate()}`;
    } else {
      return `${weekDays[currentDate.getDay()]}, ${months[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    }
  };

  // Get task position for timeline (handles scheduled tasks)
  const getTaskPosition = (task: Task, dayOfWeek?: number) => {
    let startHour = 9;
    let endHour = 10;

    // Check if task has a schedule with time slots
    if (task.schedule && task.schedule.slots && task.schedule.slots.length > 0) {
      if (task.schedule.scheduleType === 'daily_hours') {
        // Use first time slot for daily hours
        const slot = task.schedule.slots[0];
        if (slot.startTime && slot.endTime) {
          const [startH] = slot.startTime.split(':').map(Number);
          const [endH] = slot.endTime.split(':').map(Number);
          startHour = startH;
          endHour = endH;
        }
      } else if (task.schedule.scheduleType === 'weekly_days' && dayOfWeek !== undefined) {
        // Find the slot for this day of week
        const slot = task.schedule.slots.find(s => s.dayOfWeek === dayOfWeek);
        if (slot?.startTime && slot?.endTime) {
          const [startH] = slot.startTime.split(':').map(Number);
          const [endH] = slot.endTime.split(':').map(Number);
          startHour = startH;
          endHour = endH;
        } else {
          // No specific time for this day, use default
          return null;
        }
      }
    } else if (task.dueDate) {
      // Use dueDate time for tasks without schedule
      const taskDate = new Date(task.dueDate);
      startHour = taskDate.getHours();
      const minutes = taskDate.getMinutes();
      startHour += minutes / 60;
      endHour = startHour + (task.estimatedHours || 1);
    } else {
      return null;
    }

    // Check if within visible hours
    if (startHour < START_HOUR || startHour > END_HOUR) {
      return null;
    }

    // Calculate position
    const top = (startHour - START_HOUR) * HOUR_HEIGHT;
    const duration = endHour - startHour;
    const height = Math.max(duration * HOUR_HEIGHT, 30);

    return { top, height };
  };

  // Date picker content
  const renderDatePicker = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

    return (
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 min-w-[320px]">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => {
            if (datePickerView === 'days') setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
            else if (datePickerView === 'months') setCurrentDate(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
            else setCurrentDate(prev => new Date(prev.getFullYear() - 12, prev.getMonth(), 1));
          }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => {
            if (datePickerView === 'days') setDatePickerView('months');
            else if (datePickerView === 'months') setDatePickerView('years');
          }} className="px-4 py-2 text-lg font-semibold text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
            {datePickerView === 'days' && `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            {datePickerView === 'months' && currentDate.getFullYear()}
            {datePickerView === 'years' && `${years[0]} - ${years[years.length - 1]}`}
          </button>
          <button onClick={() => {
            if (datePickerView === 'days') setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
            else if (datePickerView === 'months') setCurrentDate(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
            else setCurrentDate(prev => new Date(prev.getFullYear() + 12, prev.getMonth(), 1));
          }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {datePickerView === 'days' && (
          <>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="w-10 h-8 flex items-center justify-center text-xs font-semibold text-slate-500">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.slice(0, 35).map((day, index) => {
                const taskCount = getTaskCountForDate(day.date);
                const isSelected = selectedDate?.toDateString() === day.date.toDateString();
                const isCurrentDay = day.date.toDateString() === today.toDateString();
                return (
                  <button key={index} onClick={() => selectDate(day.date)}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-all relative ${
                      isCurrentDay ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' :
                      isSelected ? 'bg-indigo-100 text-indigo-700' :
                      day.isCurrentMonth ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-50'
                    }`}>
                    {day.date.getDate()}
                    {taskCount > 0 && !isCurrentDay && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {datePickerView === 'months' && (
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => (
              <button key={index} onClick={() => selectMonth(index)}
                className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  index === currentDate.getMonth() && currentDate.getFullYear() === new Date().getFullYear()
                    ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-700 hover:bg-slate-100'
                }`}>
                {month}
              </button>
            ))}
          </div>
        )}

        {datePickerView === 'years' && (
          <div className="grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto">
            {years.map(year => (
              <button key={year} onClick={() => selectYear(year)}
                className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  year === currentDate.getFullYear() ? 'bg-indigo-600 text-white shadow-lg' :
                  year === new Date().getFullYear() ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
                }`}>
                {year}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
          <button onClick={goToToday} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            {t('today')}
          </button>
          <button onClick={() => { setShowDatePicker(false); setDatePickerView('days'); }}
            className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  };

  // Render week view with timeline
  const renderWeekTimelineView = () => {
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

    return (
      <div className="flex flex-col h-[600px]">
        {/* Week headers */}
        <div className="flex border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-10">
          <div className="w-16 flex-shrink-0" /> {/* Time column spacer */}
          {daysInWeek.map((day, index) => (
            <div key={index} className="flex-1 min-w-[100px] py-3 text-center border-l border-slate-200">
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{weekDays[index]}</span>
                <span className={`mt-1 text-xl font-bold ${day.isToday ? 'text-indigo-600' : 'text-slate-800'}`}>
                  {day.date.getDate()}
                </span>
                {day.isToday && (
                  <span className="text-[10px] text-indigo-600 font-medium">{t('today')}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Timeline grid */}
        <div className="flex-1 overflow-y-auto" ref={weekTimelineRef}>
          <div className="flex relative">
            {/* Time column */}
            <div className="w-16 flex-shrink-0 bg-slate-50">
              {hours.map(hour => (
                <div key={hour} className="h-[60px] border-b border-slate-100 flex items-start justify-end pr-2 pt-0">
                  <span className="text-xs text-slate-400 font-medium">
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {daysInWeek.map((day, dayIndex) => {
              const dayTasks = tasksByDateAndHour[day.date.toDateString()] || [];
              const tasksWithPosition = dayTasks
                .map(task => ({ task, position: getTaskPosition(task, day.date.getDay()) }))
                .filter(t => t.position && t.position.top >= 0);

              return (
                <div key={dayIndex} className="flex-1 min-w-[100px] relative border-l border-slate-200">
                  {/* Hour grid lines */}
                  {hours.map(hour => (
                    <div key={hour} className="h-[60px] border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer"
                      onClick={() => {
                        const newDate = new Date(day.date);
                        newDate.setHours(hour);
                        onDateClick(newDate);
                      }}
                    />
                  ))}

                  {/* Tasks positioned by time */}
                  {tasksWithPosition.map(({ task, position }) => {
                    if (!position) return null;
                    const category = categories.find(c => c.id === task.categoryId);

                    // Get display time from schedule or dueDate
                    let displayTime = '';
                    if (task.schedule?.scheduleType === 'daily_hours' && task.schedule.slots[0]) {
                      displayTime = `${task.schedule.slots[0].startTime} - ${task.schedule.slots[0].endTime}`;
                    } else if (task.schedule?.scheduleType === 'weekly_days') {
                      const slot = task.schedule.slots.find(s => s.dayOfWeek === day.date.getDay());
                      if (slot?.startTime) {
                        displayTime = slot.endTime ? `${slot.startTime} - ${slot.endTime}` : slot.startTime;
                      }
                    } else if (task.dueDate) {
                      displayTime = new Date(task.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    }

                    return (
                      <div
                        key={task.id}
                        onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                        className={`absolute left-1 right-1 rounded-lg shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-all overflow-hidden ${getTaskPriorityBorderColor(task)} ${task.status === 'completed' ? 'opacity-60' : ''}`}
                        style={{
                          top: position.top,
                          height: Math.min(position.height, (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT - position.top),
                          backgroundColor: category ? `${category.color}15` : '#f1f5f9',
                        }}
                      >
                        <div className="p-1.5">
                          <p className={`text-xs font-medium truncate ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                            {task.title}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {displayTime}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Current time indicator */}
                  {day.isToday && (
                    <div
                      className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                      style={{ top: (new Date().getHours() - START_HOUR) * HOUR_HEIGHT + (new Date().getMinutes() / 60) * HOUR_HEIGHT }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayTasks = tasksByDate[currentDate.toDateString()] || [];

    return (
      <div className="flex-1 overflow-y-auto max-h-[500px]">
        <div className="divide-y divide-slate-100">
          {hours.map(hour => {
            const hourTasks = dayTasks.filter(task => {
              if (!task.dueDate) return false;
              const taskDate = new Date(task.dueDate);
              return taskDate.getHours() === hour;
            });

            return (
              <div key={hour} className="flex min-h-[60px] group">
                <div className="w-16 flex-shrink-0 p-2 text-right text-xs text-slate-400 font-medium border-r border-slate-100 group-hover:bg-slate-50">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div className="flex-1 p-1 cursor-pointer hover:bg-slate-50" onClick={() => onDateClick(currentDate)}>
                  {hourTasks.map(task => (
                    <div key={task.id} onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                      className={`text-xs px-2 py-1.5 rounded-lg mb-1 truncate text-white cursor-pointer hover:opacity-80 transition-all ${getTaskPriorityColor(task)} ${task.status === 'completed' ? 'opacity-60 line-through' : ''}`}>
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render month view
  const renderMonthView = () => (
    <>
      {/* Week Day Headers */}
      <div className="grid grid-cols-7 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
        {weekDays.map((day, index) => (
          <div key={index} className="py-3 text-center">
            <span className="text-sm font-semibold text-slate-600">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7">
        {daysInMonth.map((day, index) => {
          const dayTasks = tasksByDate[day.date.toDateString()] || [];
          const taskCount = dayTasks.length;
          const isSelected = selectedDate?.toDateString() === day.date.toDateString();

          return (
            <div key={index} onClick={() => setSelectedDate(day.date)}
              className={`min-h-[100px] p-2 border-b border-r border-slate-100 cursor-pointer transition-all ${
                isSelected ? 'bg-indigo-50 ring-2 ring-indigo-500 ring-inset' :
                day.isToday ? 'bg-gradient-to-br from-indigo-50/80 to-purple-50/50' : 'hover:bg-slate-50'
              } ${!day.isCurrentMonth ? 'opacity-40' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all ${
                  day.isToday ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200' :
                  isSelected ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-200'
                }`}>
                  {day.date.getDate()}
                </span>
                {taskCount > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[22px] h-6 px-1.5 rounded-full text-xs font-bold shadow-sm ${
                    taskCount >= 5 ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' :
                    taskCount >= 3 ? 'bg-gradient-to-r from-orange-400 to-amber-400 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {taskCount}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {dayTasks.slice(0, 3).map(task => (
                  <div key={task.id} onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                    className={`text-xs px-2 py-1 rounded-md truncate text-white cursor-pointer hover:opacity-85 transition-all shadow-sm ${getTaskPriorityColor(task)} ${task.status === 'completed' ? 'opacity-60 line-through' : ''}`}
                    title={task.title}>
                    {task.title}
                  </div>
                ))}
                {taskCount > 3 && (
                  <button onClick={(e) => { e.stopPropagation(); setSelectedDate(day.date); }}
                    className="text-xs text-indigo-600 px-2 font-medium hover:underline">
                    +{taskCount - 3} {t('more')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="relative" ref={datePickerRef}>
            <button onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-white font-semibold text-lg">{getViewTitle()}</span>
              <svg className={`w-4 h-4 text-white/70 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showDatePicker && renderDatePicker()}
          </div>

          <button onClick={() => navigate(1)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex bg-white/10 rounded-xl p-1 backdrop-blur-sm">
            {(['month', 'week', 'day'] as CalendarView[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === v ? 'bg-white text-indigo-600 shadow-lg' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}>
                {v === 'month' ? t('monthView') : v === 'week' ? t('weekView') : t('dayView')}
              </button>
            ))}
          </div>
          <button onClick={goToToday} className="px-5 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all text-sm font-semibold shadow-lg">
            {t('today')}
          </button>
        </div>
      </div>

      <div className="flex">
        <div className="flex-1">
          {view === 'day' ? (
            <div className="flex flex-col">
              <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="text-center">
                  <div className="text-sm font-medium text-indigo-600 uppercase tracking-wide">{weekDays[currentDate.getDay()]}</div>
                  <div className={`text-5xl font-bold mt-2 ${currentDate.toDateString() === today.toDateString() ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600' : 'text-slate-800'}`}>
                    {currentDate.getDate()}
                  </div>
                  <div className="text-sm text-slate-500 mt-2">
                    {months[currentDate.getMonth()]} {currentDate.getFullYear()} · {getTaskCountForDate(currentDate)} {t('tasksDue')}
                  </div>
                </div>
              </div>
              {renderDayView()}
            </div>
          ) : view === 'week' ? (
            renderWeekTimelineView()
          ) : (
            renderMonthView()
          )}
        </div>

        {/* Sidebar (month view only) */}
        {view === 'month' && (
          <div className="w-80 border-l border-slate-200 bg-gradient-to-b from-slate-50 to-white">
            <div className="p-4 border-b border-slate-200 bg-white">
              <h3 className="font-semibold text-slate-800 text-lg">
                {selectedDate ? formatDate(selectedDate) : t('selectDate')}
              </h3>
              {selectedDate && <p className="text-sm text-slate-500 mt-1">{selectedDateTasks.length} {t('tasksDue')}</p>}
            </div>

            {selectedDate && (
              <div className="p-4">
                <button onClick={() => onDateClick(selectedDate)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-semibold shadow-lg shadow-indigo-500/20 mb-4">
                  {t('addTaskForDate')}
                </button>

                {selectedDateTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-slate-500 text-sm">{t('noTasksDue')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDateTasks.map(task => {
                      const categoryId = typeof task.category === 'string' ? task.category : task.category?.id;
                      const category = categories.find(c => c.id === categoryId);
                      const avatar = getAssigneeAvatar(task);

                      return (
                        <div key={task.id} onClick={() => onTaskClick(task)}
                          className={`p-3 bg-white rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all border ${
                            task.status === 'completed' ? 'opacity-60 border-slate-200' : 'border-slate-200 hover:border-indigo-200'
                          } ${isOverdue(task.dueDate, task.status) ? 'border-l-4 border-l-red-500' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 shadow-sm ${getTaskPriorityColor(task)}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium text-slate-800 truncate ${task.status === 'completed' ? 'line-through' : ''}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {category && (
                                  <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: category.color }}>
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
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-4 border-t border-slate-200 bg-slate-50 text-xs flex-wrap">
        <span className="text-slate-500 font-medium">{t('priorityLegend')}</span>
        {[
          { color: 'bg-red-600', label: t('priorityCritical') },
          { color: 'bg-orange-500', label: t('priorityHigh') },
          { color: 'bg-amber-500', label: t('priorityMedium') },
          { color: 'bg-indigo-500', label: t('priorityLow') },
          { color: 'bg-emerald-500', label: t('completed') },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${item.color}`} />
            <span className="text-slate-600">{item.label}</span>
          </div>
        ))}

        <div className="flex items-center gap-2 ml-auto border-l border-slate-300 pl-4">
          <span className="text-slate-500 font-medium">{t('taskCount')}:</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">1-2</span>
          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 text-white font-bold">3-4</span>
          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold">5+</span>
        </div>
      </div>
    </div>
  );
}
