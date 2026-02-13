// ============================================
// Priority and Status Types
// ============================================

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'waiting'
  | 'completed'
  | 'cancelled'
  | 'deferred';

// Legacy status type for backward compatibility
export type Status = 'pending' | 'in-progress' | 'review' | 'completed';

// ============================================
// User and Permission Types
// ============================================

export interface Role {
  id: string;
  name: string;
  displayName: string;
  permissions: Record<string, boolean>;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role?: Role;
  isActive: boolean;
  createdAt: string;
}

// Legacy TeamMember for backward compatibility
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

// ============================================
// Task Types
// ============================================

export interface Task {
  id: string;
  title: string;
  description: string;
  categoryId: string | null;
  category?: Category | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  startDate: string | null;
  estimatedHours: number | null;
  loggedHours: number;
  assigneeId: string | null;
  assignee?: User | TeamMember | null;
  creatorId: string;
  creator?: User | TeamMember | null;
  parentTaskId: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;

  // Legacy field for backward compatibility
  category?: string;
  assignee?: string | null;
  comments?: Comment[];

  // Related data
  attachments?: Attachment[];
  history?: TaskHistory[];
  subTasks?: Task[];
}

// ============================================
// Comment Types
// ============================================

export interface Mention {
  userId: string;
  name: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  user?: User | TeamMember;
  content: string;
  mentions: Mention[];
  parentCommentId: string | null;
  replies?: Comment[];
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  // Legacy field for backward compatibility
  text: string;
  author: string;
}

// ============================================
// Attachment Types
// ============================================

export interface Attachment {
  id: string;
  taskId: string;
  commentId: string | null;
  uploaderId: string;
  uploader?: User | TeamMember;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  thumbnailPath: string | null;
  createdAt: string;
}

// ============================================
// History Types
// ============================================

export type HistoryActionType =
  | 'created'
  | 'status_change'
  | 'priority_change'
  | 'assignee_change'
  | 'due_date_change'
  | 'updated'
  | 'completed'
  | 'reopened'
  | 'comment_added';

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  user?: User | TeamMember;
  actionType: HistoryActionType;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// Status Time Log Types
// ============================================

export interface StatusTimeLog {
  id: string;
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  enteredAt: string;
  exitedAt: string | null;
  durationSeconds: number | null;
  userId: string;
  user?: User | null;
  createdAt: string;
}

export interface StatusTimeSummary {
  status: TaskStatus;
  totalTimeSeconds: number;
  visitCount: number;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType =
  | 'task_assigned'
  | 'mentioned'
  | 'status_changed'
  | 'priority_changed'
  | 'due_soon'
  | 'overdue'
  | 'comment_added';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string | null;
  taskId: string | null;
  task?: Task | null;
  actorId: string | null;
  actor?: User | null;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

// ============================================
// Workflow Types
// ============================================

export interface WorkflowStatus {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface WorkflowTransition {
  from: string;
  to: string[];
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  roleRestrictions: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Category Types
// ============================================

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  sortOrder?: number;
  createdAt?: string;
}

// ============================================
// Filter and Sort Types
// ============================================

export interface FilterState {
  search: string;
  categoryId: string;
  priority: string;
  status: string;
  assigneeId: string;
  startDate?: string;
  endDate?: string;
}

// Legacy filter state for backward compatibility
export interface LegacyFilterState {
  search: string;
  category: string;
  priority: string;
  status: string;
  assignee: string;
}

export type SortOption =
  | 'created'
  | 'createdAsc'
  | 'dueDate'
  | 'dueDateDesc'
  | 'priority'
  | 'priorityDesc'
  | 'title'
  | 'assignee'
  | 'updatedAt';

// ============================================
// Task Stats Types
// ============================================

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  review: number;
  pending: number;
  overdue: number;
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardPeriod {
  start: string;
  end: string;
  label: string;
}

export interface DashboardOverview {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

export interface DashboardTrend {
  date: string;
  completed: number;
  created: number;
}

export interface DashboardAssigneeStat {
  userId: string;
  userName: string;
  total: number;
  completed: number;
  inProgress: number;
}

export interface DashboardCategoryStat {
  categoryId: string;
  categoryName: string;
  color: string;
  count: number;
  percentage: number;
}

export interface DashboardOverdueTrend {
  date: string;
  overdueCount: number;
}

export interface DashboardStats {
  period: DashboardPeriod;
  overview: DashboardOverview;
  trends: DashboardTrend[];
  byAssignee: DashboardAssigneeStat[];
  byCategory: DashboardCategoryStat[];
  overdueTrend: DashboardOverdueTrend[];
}

export interface TeamWorkload {
  id: string;
  name: string;
  avatarUrl: string | null;
  totalTasks: number;
  activeTasks: number;
  overdueTasks: number;
  totalEstimatedHours: number;
  totalLoggedHours: number;
}

// ============================================
// Calendar Types
// ============================================

export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarDay {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  tasks: Task[];
  taskCount: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// ============================================
// Auth Types
// ============================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ============================================
// Component Prop Types
// ============================================

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

export interface FilterBarProps {
  filters: LegacyFilterState;
  setFilters: React.Dispatch<React.SetStateAction<LegacyFilterState>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  categories: Category[];
  teamMembers: TeamMember[] | User[];
}

export interface TaskListProps {
  tasks: Task[];
  categories: Category[];
  teamMembers: TeamMember[] | User[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onTimeUpdate: (taskId: string, loggedHours: number) => void;
}

export interface TaskItemProps {
  task: Task;
  categories: Category[];
  teamMembers: TeamMember[] | User[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onTimeUpdate: (taskId: string, loggedHours: number) => void;
}

export interface TaskFormProps {
  task: Task | null;
  categories: Category[];
  teamMembers: TeamMember[] | User[];
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
  teamMembers: TeamMember[] | User[];
  onTaskClick: (task: Task) => void;
  onDateClick: (date: Date) => void;
}

export interface DashboardProps {
  tasks: Task[];
  teamMembers: TeamMember[] | User[];
}

// ============================================
// Language Context Types
// ============================================

export interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

// ============================================
// Translation Types
// ============================================

export type TranslationKey = string;
export type Translations = Record<string, string | string[] | Record<string, string>>;

// ============================================
// Color Mapping Types
// ============================================

export type PriorityColorMap = Record<Priority, string>;
export type StatusColorMap = Record<TaskStatus, string>;

// ============================================
// Store Types
// ============================================

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  categoryId?: string;
  assigneeId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: SortOption;
  sortOrder?: 'ASC' | 'DESC';
}

export interface UIState {
  isSidebarOpen: boolean;
  isDrawerOpen: boolean;
  drawerContent: React.ReactNode | null;
  activeModal: string | null;
  isLoading: boolean;
}
