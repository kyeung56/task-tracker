import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import type { DashboardTrend } from '../../types';

interface CompletionTrendChartProps {
  data: DashboardTrend[];
  height?: number;
  className?: string;
}

const CompletionTrendChart: React.FC<CompletionTrendChartProps> = ({
  data,
  height = 200,
  className = '',
}) => {
  const { t } = useLanguage();

  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('completionTrend')}
        </h3>
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          {t('noData')}
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.flatMap((d) => [d.completed, d.created]));
  const chartWidth = data.length * 40;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('completionTrend')}
      </h3>

      <div className="overflow-x-auto">
        <svg width={chartWidth} height={height} className="mx-auto">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => (
            <g key={percent}>
              <line
                x1="40"
                y1={height - 20 - (percent / 100) * (height - 40)}
                x2={chartWidth - 20}
                y2={height - 20 - (percent / 100) * (height - 40)}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x="35"
                y={height - 20 - (percent / 100) * (height - 40)}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {Math.round((maxValue * percent) / 100)}
              </text>
            </g>
          ))}

          {/* Created line */}
          <polyline
            fill="none"
            stroke="#93c5fd"
            strokeWidth="2"
            points={data
              .map(
                (d, i) =>
                  `${60 + i * 40},${height - 20 - (d.created / maxValue) * (height - 40)}`
              )
              .join(' ')}
          />

          {/* Completed line */}
          <polyline
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            points={data
              .map(
                (d, i) =>
                  `${60 + i * 40},${height - 20 - (d.completed / maxValue) * (height - 40)}`
              )
              .join(' ')}
          />

          {/* Data points */}
          {data.map((d, i) => (
            <g key={i}>
              {/* Created point */}
              <circle
                cx={60 + i * 40}
                cy={height - 20 - (d.created / maxValue) * (height - 40)}
                r="4"
                fill="#93c5fd"
              />
              {/* Completed point */}
              <circle
                cx={60 + i * 40}
                cy={height - 20 - (d.completed / maxValue) * (height - 40)}
                r="4"
                fill="#34d399"
              />
              {/* X-axis label */}
              <text
                x={60 + i * 40}
                y={height - 5}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                {formatDate(d.date)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-300" />
          <span className="text-sm text-gray-600 dark:text-gray-400">{t('chartCreated')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">{t('chartCompleted')}</span>
        </div>
      </div>
    </div>
  );
};

export default CompletionTrendChart;
