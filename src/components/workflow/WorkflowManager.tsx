import { useState } from 'react';

interface WorkflowManagerProps {
  onClose: () => void;
}

// Default workflow statuses (6 statuses)
const DEFAULT_STATUSES = [
  { id: 'pending', name: '待处理', color: '#6b7280', order: 1 },
  { id: 'in_progress', name: '进行中', color: '#3b82f6', order: 2 },
  { id: 'waiting', name: '等待确认', color: '#f59e0b', order: 3 },
  { id: 'completed', name: '已完成', color: '#10b981', order: 4 },
  { id: 'cancelled', name: '已取消', color: '#ef4444', order: 5 },
  { id: 'deferred', name: '已延期', color: '#f97316', order: 6 },
];

// Default transitions
const DEFAULT_TRANSITIONS = [
  { from: 'pending', to: ['in_progress', 'cancelled'] },
  { from: 'in_progress', to: ['waiting', 'completed', 'deferred', 'cancelled'] },
  { from: 'waiting', to: ['in_progress', 'completed', 'deferred'] },
  { from: 'deferred', to: ['in_progress', 'cancelled'] },
];

const WorkflowManager: React.FC<WorkflowManagerProps> = ({ onClose }) => {
  const [statuses] = useState(DEFAULT_STATUSES);
  const [transitions, setTransitions] = useState(DEFAULT_TRANSITIONS);
  const [hasChanges, setHasChanges] = useState(false);

  const toggleTransition = (fromStatus: string, toStatus: string) => {
    setTransitions((prev) => {
      const existing = prev.find((t) => t.from === fromStatus);
      if (existing) {
        const hasTransition = existing.to.includes(toStatus);
        if (hasTransition) {
          const newTo = existing.to.filter((t) => t !== toStatus);
          if (newTo.length === 0) {
            return prev.filter((t) => t.from !== fromStatus);
          }
          return prev.map((t) =>
            t.from === fromStatus ? { ...t, to: newTo } : t
          );
        } else {
          return prev.map((t) =>
            t.from === fromStatus ? { ...t, to: [...t.to, toStatus] } : t
          );
        }
      } else {
        return [...prev, { from: fromStatus, to: [toStatus] }];
      }
    });
    setHasChanges(true);
  };

  const isTransitionAllowed = (fromStatus: string, toStatus: string): boolean => {
    const transition = transitions.find((t) => t.from === fromStatus);
    return transition?.to.includes(toStatus) || false;
  };

  const handleReset = () => {
    setTransitions(DEFAULT_TRANSITIONS);
    setHasChanges(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div>
            <h2 className="text-xl font-semibold text-white">工作流设置</h2>
            <p className="text-sm text-white/70 mt-1">
              配置任务状态和转换规则
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Status List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">状态列表</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {statuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="font-medium text-slate-700">{status.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">#{status.order}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transition Matrix */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">转换规则矩阵</h3>
            <p className="text-xs text-slate-500 mb-4">
              点击复选框启用/禁用状态之间的转换。行表示当前状态，列表示可转换到的目标状态。
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200">
                      从 \ 到
                    </th>
                    {statuses.map((status) => (
                      <th
                        key={status.id}
                        className="p-2 text-center text-xs font-medium text-slate-700 border border-slate-200"
                        style={{ backgroundColor: `${status.color}15` }}
                      >
                        {status.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((fromStatus) => (
                    <tr key={fromStatus.id}>
                      <td
                        className="p-2 text-xs font-medium text-slate-700 border border-slate-200"
                        style={{ backgroundColor: `${fromStatus.color}15` }}
                      >
                        {fromStatus.name}
                      </td>
                      {statuses.map((toStatus) => {
                        const allowed = isTransitionAllowed(fromStatus.id, toStatus.id);
                        const isSameStatus = fromStatus.id === toStatus.id;

                        return (
                          <td
                            key={toStatus.id}
                            className="p-2 text-center border border-slate-200"
                          >
                            <button
                              onClick={() => !isSameStatus && toggleTransition(fromStatus.id, toStatus.id)}
                              disabled={isSameStatus}
                              className={`w-6 h-6 rounded transition-all ${
                                isSameStatus
                                  ? 'bg-slate-100 cursor-not-allowed'
                                  : allowed
                                  ? 'bg-indigo-500 hover:bg-indigo-600'
                                  : 'bg-slate-100 hover:bg-slate-200'
                              }`}
                              title={isSameStatus ? '不能转换到相同状态' : allowed ? '点击禁用' : '点击启用'}
                            >
                              {!isSameStatus && (
                                <svg
                                  className={`w-4 h-4 mx-auto ${allowed ? 'text-white' : 'text-slate-400'}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-500">
            {hasChanges && (
              <span className="text-amber-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                有未保存的更改（仅本地模式有效）
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                hasChanges
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              重置
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowManager;
