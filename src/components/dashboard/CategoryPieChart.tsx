import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import type { DashboardCategoryStat } from '../../types';

interface CategoryPieChartProps {
  data: DashboardCategoryStat[];
  className?: string;
}

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data, className = '' }) => {
  const { t } = useLanguage();

  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('tasksByCategory')}
        </h3>
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          {t('noData')}
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, cat) => sum + cat.count, 0);

  // Generate pie chart path
  const generatePiePath = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(radius, radius, radius, startAngle);
    const end = polarToCartesian(radius, radius, radius, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
      `M ${radius} ${radius}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      'Z',
    ].join(' ');
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  let currentAngle = 0;
  const segments = data.map((cat) => {
    const angle = (cat.count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      ...cat,
      path: generatePiePath(startAngle, endAngle, 80),
      startAngle,
      endAngle,
    };
  });

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('tasksByCategory')}
      </h3>

      <div className="flex items-center justify-center">
        {/* Pie chart */}
        <svg width="160" height="160" className="flex-shrink-0">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          ))}
          {/* Center circle (donut hole) */}
          <circle cx="80" cy="80" r="40" fill="white" className="dark:fill-gray-800" />
          <text x="80" y="75" textAnchor="middle" className="text-2xl font-bold fill-gray-900 dark:fill-white">
            {total}
          </text>
          <text x="80" y="95" textAnchor="middle" className="text-xs fill-gray-500">
            {t('chartTotal')}
          </text>
        </svg>

        {/* Legend */}
        <div className="ml-4 space-y-2">
          {data.slice(0, 5).map((cat, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-24">
                {cat.categoryName}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {cat.percentage}%
              </span>
            </div>
          ))}
          {data.length > 5 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              +{data.length - 5} {t('more')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryPieChart;
