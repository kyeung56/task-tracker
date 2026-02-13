import React from 'react';
import type { CalendarView } from '../../types';

interface CalendarHeaderProps {
  currentView: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentView,
  currentDate,
  onViewChange,
  onNavigate,
}) => {
  const formatTitle = () => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    if (currentView === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });
      const year = startOfWeek.getFullYear();

      if (startMonth === endMonth) {
        return `${startMonth} ${year}`;
      }
      return `${startMonth} - ${endMonth} ${year}`;
    }
    if (currentView === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return currentDate.toLocaleDateString('en-US', options);
  };

  const viewOptions: { value: CalendarView; label: string }[] = [
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' },
  ];

  return (
    <div className="flex items-center justify-between mb-4">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('prev')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Previous"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => onNavigate('today')}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Today
        </button>

        <button
          onClick={() => onNavigate('next')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Next"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white ml-2">
          {formatTitle()}
        </h2>
      </div>

      {/* View selector */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {viewOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onViewChange(option.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              currentView === option.value
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CalendarHeader;
