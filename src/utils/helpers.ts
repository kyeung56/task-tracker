import { Task, Category, TeamMember, LegacyFilterState, PriorityColorMap, StatusColorMap, Priority, TaskStatus } from '../types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatDate(dateString: string | Date | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export function isDueToday(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}

export function isDueSoon(dueDate: string | null, status: TaskStatus, hoursThreshold: number = 24): boolean {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false;
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= hoursThreshold;
}

export function getDueUrgency(task: Task): 'overdue' | 'today' | 'soon' | 'normal' {
  if (isOverdue(task.dueDate, task.status)) return 'overdue';
  if (isDueToday(task.dueDate, task.status)) return 'today';
  if (isDueSoon(task.dueDate, task.status)) return 'soon';
  return 'normal';
}

export function sortTasks(tasks: Task[], sortBy: string): Task[] {
  const sorted = [...tasks];

  // Helper to get urgency score (lower = more urgent)
  const getUrgencyScore = (task: Task): number => {
    if (task.status === 'completed' || task.status === 'cancelled') return 100;
    const urgency = getDueUrgency(task);
    switch (urgency) {
      case 'overdue': return 0;
      case 'today': return 1;
      case 'soon': return 2;
      default: return 50;
    }
  };

  // Helper to get priority score (lower = higher priority)
  const getPriorityScore = (task: Task): number => {
    const priorityOrder: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[task.priority] ?? 3;
  };

  // First sort by urgency, then by the selected criteria
  const urgencySorted = sorted.sort((a, b) => {
    const urgencyDiff = getUrgencyScore(a) - getUrgencyScore(b);
    if (urgencyDiff !== 0) return urgencyDiff;
    return 0;
  });

  switch (sortBy) {
    case 'dueDate':
      return urgencySorted.sort((a, b) => {
        const urgencyDiff = getUrgencyScore(a) - getUrgencyScore(b);
        if (urgencyDiff !== 0) return urgencyDiff;
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    case 'dueDateDesc':
      return urgencySorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      });
    case 'priority': {
      return urgencySorted.sort((a, b) => {
        const urgencyDiff = getUrgencyScore(a) - getUrgencyScore(b);
        if (urgencyDiff !== 0) return urgencyDiff;
        return getPriorityScore(a) - getPriorityScore(b);
      });
    }
    case 'priorityDesc': {
      return urgencySorted.sort((a, b) => {
        if (getUrgencyScore(a) < 50 || getUrgencyScore(b) < 50) {
          return getUrgencyScore(a) - getUrgencyScore(b);
        }
        return getPriorityScore(b) - getPriorityScore(a);
      });
    }
    case 'created':
      return urgencySorted.sort((a, b) => {
        const urgencyDiff = getUrgencyScore(a) - getUrgencyScore(b);
        if (urgencyDiff !== 0) return urgencyDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    case 'createdAsc':
      return urgencySorted.sort((a, b) => {
        const urgencyDiff = getUrgencyScore(a) - getUrgencyScore(b);
        if (urgencyDiff !== 0) return urgencyDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    case 'title':
      return urgencySorted.sort((a, b) => {
        const urgencyDiff = getUrgencyScore(a) - getUrgencyScore(b);
        if (urgencyDiff !== 0) return urgencyDiff;
        return a.title.localeCompare(b.title);
      });
    case 'assignee':
      return urgencySorted.sort((a, b) => {
        const urgencyDiff = getUrgencyScore(a) - getUrgencyScore(b);
        if (urgencyDiff !== 0) return urgencyDiff;
        if (!a.assignee && !b.assignee) return 0;
        if (!a.assignee) return 1;
        if (!b.assignee) return -1;
        return a.assignee.localeCompare(b.assignee);
      });
    default:
      return urgencySorted;
  }
}

export function filterTasks(tasks: Task[], filters: LegacyFilterState, _teamMembers: TeamMember[] = []): Task[] {
  return tasks.filter(task => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(searchLower);
      const matchesDesc = task.description?.toLowerCase().includes(searchLower);
      const matchesTags = task.tags?.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesDesc && !matchesTags) return false;
    }

    if (filters.category && task.categoryId !== filters.category) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.assignee && task.assigneeId !== filters.assignee) return false;

    return true;
  });
}

export const defaultCategories: Category[] = [
  { id: 'development', name: 'Development', color: '#3B82F6' },
  { id: 'design', name: 'Design', color: '#8B5CF6' },
  { id: 'marketing', name: 'Marketing', color: '#10B981' },
  { id: 'sales', name: 'Sales', color: '#F59E0B' },
  { id: 'support', name: 'Support', color: '#EF4444' },
  { id: 'operations', name: 'Operations', color: '#6366F1' },
];

export const priorityColors: PriorityColorMap = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export const statusColors: StatusColorMap = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  waiting: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  deferred: 'bg-orange-100 text-orange-800',
};

export function exportToCSV(tasks: Task[], categories: Category[], teamMembers: TeamMember[]): void {
  const headers = ['Title', 'Description', 'Category', 'Priority', 'Status', 'Assignee', 'Due Date', 'Estimated Hours', 'Logged Hours', 'Tags', 'Created At'];

  const rows = tasks.map(task => {
    const category = categories.find(c => c.id === task.category);
    const assignee = teamMembers.find(m => m.id === task.assignee);

    return [
      `"${task.title.replace(/"/g, '""')}"`,
      `"${(task.description || '').replace(/"/g, '""')}"`,
      category?.name || '',
      task.priority,
      task.status,
      assignee?.name || '',
      task.dueDate || '',
      task.estimatedHours || 0,
      task.loggedHours || 0,
      task.tags || '',
      task.createdAt
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(tasks: Task[], categories: Category[], teamMembers: TeamMember[]): void {
  const data = {
    exportDate: new Date().toISOString(),
    tasks,
    categories,
    teamMembers
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `task-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
