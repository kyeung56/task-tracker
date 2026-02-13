import React, { useState } from 'react';

interface PeriodSelectorProps {
  value: 'week' | 'month' | 'quarter' | 'custom';
  onChange: (period: 'week' | 'month' | 'quarter' | 'custom') => void;
  onCustomRangeChange?: (start: string, end: string) => void;
  className?: string;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  value,
  onChange,
  onCustomRangeChange,
  className = '',
}) => {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const periods: { value: 'week' | 'month' | 'quarter' | 'custom'; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'custom', label: 'Custom' },
  ];

  const handlePeriodChange = (period: 'week' | 'month' | 'quarter' | 'custom') => {
    if (period === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
    onChange(period);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd && onCustomRangeChange) {
      onCustomRangeChange(customStart, customEnd);
    }
    setShowCustomPicker(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => handlePeriodChange(period.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              value === period.value
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Custom date picker dropdown */}
      {showCustomPicker && (
        <div className="absolute right-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodSelector;
