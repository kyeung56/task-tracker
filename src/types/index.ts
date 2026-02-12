// Task related types
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'pending' | 'in-progress' | 'review' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  dueDate: string | null;
  assignee: string | null;
  estimatedHours: number;
  loggedHours: number;
  tags: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

export interface FilterState {
  search: string;
  category: string;
  priority: string;
  status: string;
  assignee: string;
}

// Language context types
export interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

// Component prop types
export interface HeaderProps {
  onToggleCategoryManager: () => void;
  onToggleTeamManager: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
}

export interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  taskStats: TaskStats;
  onNewTask: () => void;
  onToggleCategoryManager: () => void;
  onToggleTeamManager: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  review: number;
  pending: number;
  overdue: number;
}

export interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  categories: Category[];
  teamMembers: TeamMember[];
}

export interface TaskListProps {
  tasks: Task[];
  categories: Category[];
  teamMembers: TeamMember[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onTimeUpdate: (taskId: string, loggedHours: number) => void;
}

export interface TaskItemProps {
  task: Task;
  categories: Category[];
  teamMembers: TeamMember[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onTimeUpdate: (taskId: string, loggedHours: number) => void;
}

export interface TaskFormProps {
  task: Task | null;
  categories: Category[];
  teamMembers: TeamMember[];
  defaultDueDate: string | null;
  onSave: (task: Task) => void;
  onCancel: () => void;
}

export interface CategoryManagerProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  onClose: () => void;
}

export interface TeamManagerProps {
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  onClose: () => void;
}

export interface TimeTrackerProps {
  taskId: string;
  loggedHours: number;
  estimatedHours: number;
  onUpdate: (taskId: string, loggedHours: number) => void;
}

export interface CalendarProps {
  tasks: Task[];
  categories: Category[];
  teamMembers: TeamMember[];
  onTaskClick: (task: Task) => void;
  onDateClick: (date: Date) => void;
}

export interface DashboardProps {
  tasks: Task[];
  teamMembers: TeamMember[];
}

// Translation types
export type TranslationKey = string;
export type Translations = Record<string, string | string[] | Record<string, string>>;

// Sort types
export type SortOption = 'created' | 'createdAsc' | 'dueDate' | 'dueDateDesc' | 'priority' | 'priorityDesc' | 'title' | 'assignee';

// Color mapping types
export type PriorityColorMap = Record<Priority, string>;
export type StatusColorMap = Record<Status, string>;
