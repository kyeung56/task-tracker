import React from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  variant = 'default',
  className = '',
}) => {
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800',
    primary: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700',
    success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
    danger: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
  };

  const iconVariantClasses = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    primary: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400',
    success: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400',
    danger: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400',
  };

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {trend >= 0 ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
              {trendLabel && (
                <span className="text-sm text-gray-500 dark:text-gray-400">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${iconVariantClasses[variant]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
