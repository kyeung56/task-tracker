import React, { useState, useEffect } from 'react';
import { tasksApi } from '../../api';
import type { StatusTimeSummary, TaskStatus } from '../../types';
import StatusBadge from './StatusBadge';

interface StatusTimeSummaryProps {
  taskId: string;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
};

const getStatusColor = (status: TaskStatus): string => {
  const colors: Record<TaskStatus, string> = {
    pending: '#6b7280',
    in_progress: '#3b82f6',
    waiting: '#f59e0b',
    completed: '#10b981',
    cancelled: '#ef4444',
    deferred: '#f97316',
  };
  return colors[status] || '#6b7280';
};

const StatusTimeSummaryComponent: React.FC<StatusTimeSummaryProps> = ({ taskId }) => {
  const [summary, setSummary] = useState<StatusTimeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await tasksApi.getStatusSummary(taskId);
        setSummary(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch status summary:', err);
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [taskId]);

  if (loading) {
    return (
      <div className="py-2">
        <div className="animate-pulse flex space-x-2">
          <div className="h-4 bg-slate-200 rounded w-16"></div>
          <div className="h-4 bg-slate-200 rounded w-12"></div>
          <div className="h-4 bg-slate-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-2 text-xs text-red-500">
        {error}
      </div>
    );
  }

  if (summary.length === 0) {
    return (
      <div className="py-2 text-xs text-slate-400">
        暂无时间统计
      </div>
    );
  }

  const totalTime = summary.reduce((acc, s) => acc + s.totalTimeSeconds, 0);

  return (
    <div className="status-time-summary">
      <div className="text-xs text-slate-500 mb-2">时间分布</div>

      {/* Bar chart */}
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-3">
        {summary.map((item) => {
          const percentage = totalTime > 0 ? (item.totalTimeSeconds / totalTime) * 100 : 0;
          return (
            <div
              key={item.status}
              className="h-full transition-all duration-300"
              style={{
                width: `${percentage}%`,
                backgroundColor: getStatusColor(item.status),
                minWidth: percentage > 5 ? 'auto' : '2px',
              }}
              title={`${item.status}: ${formatDuration(item.totalTimeSeconds)} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {summary.map((item) => {
          const percentage = totalTime > 0 ? (item.totalTimeSeconds / totalTime) * 100 : 0;
          return (
            <div key={item.status} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: getStatusColor(item.status) }}
              />
              <StatusBadge status={item.status} size="sm" />
              <span className="text-xs text-slate-600 ml-auto">
                {formatDuration(item.totalTimeSeconds)}
              </span>
              <span className="text-xs text-slate-400">
                ({percentage.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">总计时间</span>
        <span className="text-xs font-bold text-indigo-600">
          {formatDuration(totalTime)}
        </span>
      </div>
    </div>
  );
};

export default StatusTimeSummaryComponent;
