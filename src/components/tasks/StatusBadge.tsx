import React from 'react';
import type { TaskStatus } from '../../types';
import { Badge } from '../common';

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className = '', onClick }) => {
  const statusConfig: Record<TaskStatus, { variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
    pending: {
      variant: 'default',
      label: 'Pending',
    },
    in_progress: {
      variant: 'primary',
      label: 'In Progress',
    },
    waiting: {
      variant: 'warning',
      label: 'Waiting',
    },
    review: {
      variant: 'info',
      label: 'Review',
    },
    completed: {
      variant: 'success',
      label: 'Completed',
    },
    cancelled: {
      variant: 'danger',
      label: 'Cancelled',
    },
    deferred: {
      variant: 'warning',
      label: 'Deferred',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size={size} className={className} onClick={onClick}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
