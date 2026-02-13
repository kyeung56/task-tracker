import React, { useState, useEffect } from 'react';
import { tasksApi } from '../../api';
import type { StatusTimeLog, TaskStatus } from '../../types';
import StatusBadge from './StatusBadge';

interface StatusTimeLineProps {
  taskId: string;
  expanded?: boolean;
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '-';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}小时${minutes}分`;
  }
  if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  }
  return `${secs}秒`;
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const StatusTimeLine: React.FC<StatusTimeLineProps> = ({ taskId, expanded: initialExpanded = false }) => {
  const [statusTimes, setStatusTimes] = useState<StatusTimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(initialExpanded);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatusTimes = async () => {
      try {
        setLoading(true);
        const data = await tasksApi.getStatusTimes(taskId);
        setStatusTimes(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch status times:', err);
        setError('加载状态时间失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStatusTimes();
  }, [taskId]);

  if (loading) {
    return (
      <div className="py-4 text-center text-sm text-slate-500">
        <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  if (statusTimes.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-slate-400">
        暂无状态变更记录
      </div>
    );
  }

  return (
    <div className="status-time-line">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors mb-2"
      >
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        状态变更历史 ({statusTimes.length})
      </button>

      {expanded && (
        <div className="relative pl-6 space-y-4 mt-3">
          {/* Timeline line */}
          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200"></div>

          {statusTimes.map((log) => (
            <div key={log.id} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{
                  backgroundColor: getStatusColor(log.toStatus),
                }}
              ></div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  {log.fromStatus && (
                    <>
                      <StatusBadge status={log.fromStatus} size="sm" />
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                  <StatusBadge status={log.toStatus} size="sm" />
                </div>

                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>进入: {formatDateTime(log.enteredAt)}</span>
                  </div>

                  {log.exitedAt && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>离开: {formatDateTime(log.exitedAt)}</span>
                    </div>
                  )}

                  {log.durationSeconds !== null && (
                    <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>停留: {formatDuration(log.durationSeconds)}</span>
                    </div>
                  )}

                  {!log.exitedAt && (
                    <div className="flex items-center gap-1.5 text-green-600 font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span>当前状态</span>
                    </div>
                  )}

                  {log.user && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-medium text-indigo-600">
                        {log.user.name.charAt(0)}
                      </div>
                      <span>{log.user.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

export default StatusTimeLine;
