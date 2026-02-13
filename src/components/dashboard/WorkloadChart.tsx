import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import type { DashboardAssigneeStat, TeamWorkload } from '../../types';

interface WorkloadChartProps {
  data: DashboardAssigneeStat[] | TeamWorkload[];
  className?: string;
}

const WorkloadChart: React.FC<WorkloadChartProps> = ({ data, className = '' }) => {
  const { t } = useLanguage();

  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('teamWorkload')}
        </h3>
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          {t('noData')}
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.total || 0), 1);

  const getBarColor = (stat: DashboardAssigneeStat | TeamWorkload) => {
    if ('overdueTasks' in stat && stat.overdueTasks > 0) {
      return 'bg-red-500';
    }
    if ('activeTasks' in stat && stat.activeTasks > 5) {
      return 'bg-orange-500';
    }
    if ('inProgress' in stat && stat.inProgress > 3) {
      return 'bg-yellow-500';
    }
    return 'bg-indigo-500';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('teamWorkload')}
      </h3>

      <div className="space-y-4">
        {data.slice(0, 8).map((member, index) => {
          const userName = 'userName' in member ? member.userName : member.name;
          const total = member.total;
          const completed = 'completed' in member ? member.completed : 0;
          const active = 'inProgress' in member ? member.inProgress : ('activeTasks' in member ? member.activeTasks : 0);
          const percentage = (total / maxValue) * 100;

          return (
            <div key={index} className="flex items-center gap-3">
              {/* User info */}
              <div className="w-24 flex-shrink-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {userName}
                </div>
              </div>

              {/* Bar */}
              <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                {/* Completed */}
                <div
                  className="absolute left-0 top-0 h-full bg-green-400 transition-all"
                  style={{ width: `${(completed / maxValue) * 100}%` }}
                />
                {/* Active */}
                <div
                  className="absolute top-0 h-full bg-indigo-400 transition-all"
                  style={{
                    left: `${(completed / maxValue) * 100}%`,
                    width: `${(active / maxValue) * 100}%`,
                  }}
                />
              </div>

              {/* Count */}
              <div className="w-8 text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                {total}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">{t('chartCompleted')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-indigo-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">{t('chartActive')}</span>
        </div>
      </div>
    </div>
  );
};

export default WorkloadChart;
