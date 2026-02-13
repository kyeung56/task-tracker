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
      label: '待处理',
    },
    in_progress: {
      variant: 'primary',
      label: '进行中',
    },
    waiting: {
      variant: 'warning',
      label: '等待确认',
    },
    completed: {
      variant: 'success',
      label: '已完成',
    },
    cancelled: {
      variant: 'danger',
      label: '已取消',
    },
    deferred: {
      variant: 'info',
      label: '已延期',
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
