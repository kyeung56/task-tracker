import { create } from 'zustand';
import type { Task, TaskFilters, TaskStats, CreateTaskDTO, UpdateTaskDTO } from '../types';
import { tasksApi } from '../api';

interface TaskState {
  tasks: Task[];
  selectedTask: Task | null;
  filters: TaskFilters;
  stats: TaskStats;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };

  // Actions
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  fetchTaskById: (id: string) => Promise<Task>;
  createTask: (task: CreateTaskDTO) => Promise<Task>;
  updateTask: (id: string, updates: UpdateTaskDTO) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskStatus: (id: string, status: string) => Promise<void>;
  logTime: (id: string, hours: number) => Promise<void>;
  setSelectedTask: (task: Task | null) => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
}

const initialFilters: TaskFilters = {
  status: undefined,
  priority: undefined,
  categoryId: undefined,
  assigneeId: undefined,
  search: undefined,
  startDate: undefined,
  endDate: undefined,
  sortBy: 'created',
  sortOrder: 'DESC',
};

const initialStats: TaskStats = {
  total: 0,
  completed: 0,
  inProgress: 0,
  review: 0,
  pending: 0,
  overdue: 0,
};

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  selectedTask: null,
  filters: initialFilters,
  stats: initialStats,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 50,
    total: 0,
  },

  fetchTasks: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const currentFilters = filters || get().filters;
      const response = await tasksApi.getAll({
        ...currentFilters,
        page: get().pagination.page,
        pageSize: get().pagination.pageSize,
      });

      const tasks = response.data;
      const meta = response.meta;

      // Calculate stats
      const stats: TaskStats = {
        total: meta?.total || tasks.length,
        completed: tasks.filter((t) => t.status === 'completed').length,
        inProgress: tasks.filter((t) => t.status === 'in_progress').length,
        review: tasks.filter((t) => t.status === 'review').length,
        pending: tasks.filter((t) => t.status === 'pending').length,
        overdue: tasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'cancelled'
        ).length,
      };

      set({
        tasks,
        stats,
        filters: currentFilters,
        pagination: {
          page: meta?.page || 1,
          pageSize: meta?.pageSize || 50,
          total: meta?.total || 0,
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        isLoading: false,
      });
    }
  },

  fetchTaskById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const task = await tasksApi.getById(id);
      set({ selectedTask: task, isLoading: false });
      return task;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch task',
        isLoading: false,
      });
      throw error;
    }
  },

  createTask: async (taskData) => {
    set({ isLoading: true, error: null });
    try {
      const task = await tasksApi.create(taskData);
      set((state) => ({
        tasks: [task, ...state.tasks],
        stats: {
          ...state.stats,
          total: state.stats.total + 1,
          pending: state.stats.pending + 1,
        },
        isLoading: false,
      }));
      return task;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create task',
        isLoading: false,
      });
      throw error;
    }
  },

  updateTask: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const task = await tasksApi.update(id, updates);
      set((state) => {
        const tasks = state.tasks.map((t) => (t.id === id ? task : t));
        const stats = calculateStats(tasks);
        return {
          tasks,
          stats,
          selectedTask: state.selectedTask?.id === id ? task : state.selectedTask,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update task',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await tasksApi.delete(id);
      set((state) => {
        const tasks = state.tasks.filter((t) => t.id !== id);
        const stats = calculateStats(tasks);
        return {
          tasks,
          stats,
          selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete task',
        isLoading: false,
      });
      throw error;
    }
  },

  updateTaskStatus: async (id, status) => {
    try {
      const task = await tasksApi.updateStatus(id, status);
      set((state) => {
        const tasks = state.tasks.map((t) => (t.id === id ? task : t));
        const stats = calculateStats(tasks);
        return {
          tasks,
          stats,
          selectedTask: state.selectedTask?.id === id ? task : state.selectedTask,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update status',
      });
      throw error;
    }
  },

  logTime: async (id, hours) => {
    try {
      const result = await tasksApi.logTime(id, hours);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, loggedHours: result.loggedHours } : t
        ),
        selectedTask:
          state.selectedTask?.id === id
            ? { ...state.selectedTask, loggedHours: result.loggedHours }
            : state.selectedTask,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to log time',
      });
      throw error;
    }
  },

  setSelectedTask: (task) => set({ selectedTask: task }),

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    }));
  },

  clearFilters: () => set({ filters: initialFilters, pagination: { ...get().pagination, page: 1 } }),

  clearError: () => set({ error: null }),
}));

function calculateStats(tasks: Task[]): TaskStats {
  return {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress' || t.status === 'waiting').length,
    review: tasks.filter((t) => t.status === 'review').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    overdue: tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'cancelled'
    ).length,
  };
}

export default useTaskStore;
