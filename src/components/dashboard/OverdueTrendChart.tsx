import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import type { DashboardOverdueTrend } from '../../types';

interface OverdueTrendChartProps {
  data: DashboardOverdueTrend[];
  height?: number;
  className?: string;
}

const OverdueTrendChart: React.FC<OverdueTrendChartProps> = ({
  data,
  height = 150,
  className = '',
}) => {
  const { t } = useLanguage();

  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('overdueTrend')}
        </h3>
        <div className="flex items-center justify-center h-24 text-gray-500 dark:text-gray-400">
          {t('noOverdueTasks')}
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.overdueCount), 1);
  const chartWidth = data.length * 40;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('overdueTrend')}
      </h3>

      <div className="overflow-x-auto">
        <svg width={chartWidth} height={height} className="mx-auto">
          {/* Background */}
          <rect x="40" y="10" width={chartWidth - 60} height={height - 40} fill="#fef2f2" rx="4" className="dark:fill-red-900/20" />

          {/* Grid lines */}
          {[0, 50, 100].map((percent) => (
            <line
              key={percent}
              x1="40"
              y1={10 + (percent / 100) * (height - 50)}
              x2={chartWidth - 20}
              y2={10 + (percent / 100) * (height - 50)}
              stroke="#fecaca"
              strokeWidth="1"
              strokeDasharray="4"
              className="dark:stroke-red-800"
            />
          ))}

          {/* Area fill */}
          <path
            d={`M 40 ${height - 30} ${data
              .map(
                (d, i) =>
                  `L ${60 + i * 40} ${height - 30 - (d.overdueCount / maxValue) * (height - 50)}`
              )
              .join(' ')} L ${60 + (data.length - 1) * 40} ${height - 30} Z`}
            fill="#fee2e2"
            className="dark:fill-red-900/30"
          />

          {/* Line */}
          <polyline
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            points={data
              .map(
                (d, i) =>
                  `${60 + i * 40},${height - 30 - (d.overdueCount / maxValue) * (height - 50)}`
              )
              .join(' ')}
          />

          {/* Data points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle
                cx={60 + i * 40}
                cy={height - 30 - (d.overdueCount / maxValue) * (height - 50)}
                r="4"
                fill="#ef4444"
              />
              {d.overdueCount > 0 && (
                <text
                  x={60 + i * 40}
                  y={height - 30 - (d.overdueCount / maxValue) * (height - 50) - 8}
                  textAnchor="middle"
                  className="text-xs fill-red-600 font-medium"
                >
                  {d.overdueCount}
                </text>
              )}
              <text
                x={60 + i * 40}
                y={height - 10}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                {formatDate(d.date)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default OverdueTrendChart;
