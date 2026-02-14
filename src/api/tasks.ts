import client, { apiCall } from './client';
import type { Task, TaskFilters, PaginatedResponse, TaskHistory, StatusTimeLog, StatusTimeSummary, ApiResponse, TaskSchedule, TaskScheduleFormData, TaskScheduleOccurrence } from '../types';

export interface CreateTaskDTO {
  title: string;
  description?: string;
  categoryId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  assigneeId?: string;
  parentTaskId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskDTO extends Partial<CreateTaskDTO> {
  loggedHours?: number;
}

export interface ScheduleWithTask {
  id: string;
  taskId: string;
  scheduleId: string;
  occurrenceDate: string;
  startTime: string | null;
  endTime: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  completedAt: string | null;
  task: {
    id: string;
    title: string;
    priority: string;
    status: string;
    categoryId: string | null;
    category: { id: string; name: string; color: string } | null;
    assignee: { name: string; avatarUrl: string | null } | null;
  };
}

export const tasksApi = {
  // Get all tasks with filters
  async getAll(filters?: TaskFilters & { page?: number; pageSize?: number }): Promise<PaginatedResponse<Task>> {
    const params: Record<string, string | number> = {};

    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.assigneeId) params.assigneeId = filters.assigneeId;
      if (filters.search) params.search = filters.search;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.page) params.page = filters.page;
      if (filters.pageSize) params.pageSize = filters.pageSize;
    }

    const response = await client.get<PaginatedResponse<Task>>('/tasks', { params });
    return response.data;
  },

  // Get task by ID
  async getById(id: string): Promise<Task> {
    return apiCall(client.get<ApiResponse<Task>>(`/tasks/${id}`));
  },

  // Create task
  async create(data: CreateTaskDTO): Promise<Task> {
    return apiCall(client.post<ApiResponse<Task>>('/tasks', data));
  },

  // Update task
  async update(id: string, data: UpdateTaskDTO): Promise<Task> {
    return apiCall(client.put<ApiResponse<Task>>(`/tasks/${id}`, data));
  },

  // Delete task
  async delete(id: string): Promise<void> {
    await client.delete(`/tasks/${id}`);
  },

  // Update task status
  async updateStatus(id: string, status: string): Promise<Task> {
    return apiCall(client.put<ApiResponse<Task>>(`/tasks/${id}/status`, { status }));
  },

  // Update task assignee
  async updateAssignee(id: string, assigneeId: string | null): Promise<Task> {
    return apiCall(client.put<ApiResponse<Task>>(`/tasks/${id}`, { assigneeId }));
  },

  // Log time
  async logTime(id: string, hours: number): Promise<{ id: string; loggedHours: number }> {
    return apiCall(client.post<ApiResponse<{ id: string; loggedHours: number }>>(`/tasks/${id}/log-time`, { hours }));
  },

  // Get task history
  async getHistory(id: string): Promise<TaskHistory[]> {
    return apiCall(client.get<ApiResponse<TaskHistory[]>>(`/tasks/${id}/history`));
  },

  // Get task status time logs
  async getStatusTimes(taskId: string): Promise<StatusTimeLog[]> {
    return apiCall(client.get<ApiResponse<StatusTimeLog[]>>(`/tasks/${taskId}/status-times`));
  },

  // Get task status time summary
  async getStatusSummary(taskId: string): Promise<StatusTimeSummary[]> {
    return apiCall(client.get<ApiResponse<StatusTimeSummary[]>>(`/tasks/${taskId}/status-summary`));
  },

  // Get tasks for calendar
  async getCalendarTasks(startDate: string, endDate: string): Promise<Task[]> {
    return apiCall(client.get<ApiResponse<Task[]>>('/tasks', {
      params: { startDate, endDate, pageSize: 1000 },
    }));
  },

  // Get task schedule
  async getSchedule(taskId: string): Promise<TaskSchedule | null> {
    return apiCall(client.get<ApiResponse<TaskSchedule | null>>(`/tasks/${taskId}/schedule`));
  },

  // Create or update task schedule
  async saveSchedule(taskId: string, data: TaskScheduleFormData): Promise<TaskSchedule> {
    return apiCall(client.post<ApiResponse<TaskSchedule>>(`/tasks/${taskId}/schedule`, data));
  },

  // Delete task schedule
  async deleteSchedule(taskId: string): Promise<void> {
    await client.delete(`/tasks/${taskId}/schedule`);
  },

  // Get task occurrences
  async getOccurrences(taskId: string, startDate?: string, endDate?: string): Promise<TaskScheduleOccurrence[]> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return apiCall(client.get<ApiResponse<TaskScheduleOccurrence[]>>(`/tasks/${taskId}/occurrences`, { params }));
  },

  // Update occurrence status
  async updateOccurrence(taskId: string, occurrenceId: string, status: 'scheduled' | 'completed' | 'cancelled'): Promise<TaskScheduleOccurrence> {
    return apiCall(client.put<ApiResponse<TaskScheduleOccurrence>>(`/tasks/${taskId}/occurrences/${occurrenceId}`, { status }));
  },

  // Get all calendar occurrences (with task info)
  async getCalendarOccurrences(startDate: string, endDate: string): Promise<ScheduleWithTask[]> {
    return apiCall(client.get<ApiResponse<ScheduleWithTask[]>>('/tasks/calendar/occurrences', {
      params: { startDate, endDate },
    }));
  },
};

export default tasksApi;
