import React, { useState, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { TimeTrackerProps } from '../types';

export default function TimeTracker({ taskId, loggedHours, estimatedHours, onUpdate }: TimeTrackerProps) {
  const { t } = useLanguage();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const [showInput, setShowInput] = useState<boolean>(false);
  const [manualHours, setManualHours] = useState<string>('');
  const [manualMinutes, setManualMinutes] = useState<string>('');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    const hoursToAdd = elapsed / 3600;
    onUpdate(taskId, loggedHours + hoursToAdd);
    setElapsed(0);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(manualHours) || 0;
    const minutes = parseFloat(manualMinutes) || 0;
    const totalToAdd = hours + (minutes / 60);
    if (totalToAdd > 0) {
      onUpdate(taskId, loggedHours + totalToAdd);
      setManualHours('');
      setManualMinutes('');
      setShowInput(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
        <span className="font-semibold text-slate-800">{loggedHours.toFixed(1)}h</span>
        {estimatedHours > 0 && (
          <span className="text-slate-400"> / {estimatedHours}h {t('est')}</span>
        )}
      </div>

      {isRunning ? (
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 font-mono text-sm bg-emerald-50 px-2 py-1 rounded-lg animate-pulse">
            {formatTime(elapsed)}
          </span>
          <button
            onClick={handleStop}
            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-all"
            title="Stop timer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={handleStart}
            className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
            title="Start timer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <button
            onClick={() => setShowInput(!showInput)}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
            title="Log time manually"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          </button>
        </div>
      )}

      {showInput && !isRunning && (
        <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5 animate-fadeIn">
          <input
            type="number"
            value={manualHours}
            onChange={(e) => setManualHours(e.target.value)}
            placeholder="h"
            min="0"
            step="0.5"
            className="w-12 px-2 py-1 text-xs bg-white border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <input
            type="number"
            value={manualMinutes}
            onChange={(e) => setManualMinutes(e.target.value)}
            placeholder="m"
            min="0"
            max="59"
            className="w-12 px-2 py-1 text-xs bg-white border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}
