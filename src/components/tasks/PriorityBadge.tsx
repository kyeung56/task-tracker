import React from 'react';
import type { Priority } from '../../types';
import { Badge } from '../common';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md', className = '' }) => {
  const priorityConfig = {
    low: {
      variant: 'default' as const,
      label: 'Low',
      icon: (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      ),
    },
    medium: {
      variant: 'info' as const,
      label: 'Medium',
      icon: (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      ),
    },
    high: {
      variant: 'warning' as const,
      label: 'High',
      icon: (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      ),
    },
    critical: {
      variant: 'danger' as const,
      label: 'Critical',
      icon: (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7M5 19l7-7 7 7" />
        </svg>
      ),
    },
  };

  const config = priorityConfig[priority];

  return (
    <Badge variant={config.variant} size={size} className={`inline-flex items-center ${className}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
};

export default PriorityBadge;
