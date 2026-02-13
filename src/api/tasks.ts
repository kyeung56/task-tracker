import client, { apiCall } from './client';
import type { Task, TaskFilters, PaginatedResponse, TaskHistory } from '../types';

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

  // Get tasks for calendar
  async getCalendarTasks(startDate: string, endDate: string): Promise<Task[]> {
    return apiCall(client.get<ApiResponse<Task[]>>('/tasks', {
      params: { startDate, endDate, pageSize: 1000 },
    }));
  },
};

export default tasksApi;
