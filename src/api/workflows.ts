import client, { apiCall } from './client';
import type { WorkflowConfig, WorkflowStatus, WorkflowTransition, ApiResponse } from '../types';

export interface CreateWorkflowDTO {
  name: string;
  description?: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  roleRestrictions?: Record<string, string[]>;
  isDefault?: boolean;
}

export const workflowsApi = {
  // Get all workflows
  async getAll(): Promise<WorkflowConfig[]> {
    return apiCall(client.get<ApiResponse<WorkflowConfig[]>>('/workflows'));
  },

  // Get default workflow
  async getDefault(): Promise<WorkflowConfig> {
    return apiCall(client.get<ApiResponse<WorkflowConfig>>('/workflows/default'));
  },

  // Get workflow by ID
  async getById(id: string): Promise<WorkflowConfig> {
    return apiCall(client.get<ApiResponse<WorkflowConfig>>(`/workflows/${id}`));
  },

  // Create workflow (admin only)
  async create(data: CreateWorkflowDTO): Promise<WorkflowConfig> {
    return apiCall(client.post<ApiResponse<WorkflowConfig>>('/workflows', data));
  },

  // Update workflow (admin only)
  async update(id: string, data: Partial<CreateWorkflowDTO>): Promise<WorkflowConfig> {
    return apiCall(client.put<ApiResponse<WorkflowConfig>>(`/workflows/${id}`, data));
  },

  // Delete workflow (admin only)
  async delete(id: string): Promise<void> {
    await client.delete(`/workflows/${id}`);
  },

  // Validate status transition
  async validateTransition(workflowId: string, fromStatus: string, toStatus: string, userRole: string): Promise<{ valid: boolean; reason?: string }> {
    return apiCall(client.post<ApiResponse<{ valid: boolean; reason?: string }>>(`/workflows/${workflowId}/validate-transition`, {
      fromStatus,
      toStatus,
      userRole,
    }));
  },
};

export default workflowsApi;
