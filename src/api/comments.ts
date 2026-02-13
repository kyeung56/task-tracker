import client, { apiCall } from './client';
import type { Comment, Mention, ApiResponse } from '../types';

export interface CreateCommentDTO {
  content: string;
  mentions?: Mention[];
  parentCommentId?: string;
}

export interface UpdateCommentDTO {
  content: string;
  mentions?: Mention[];
}

export const commentsApi = {
  // Get comments for a task
  async getByTaskId(taskId: string): Promise<Comment[]> {
    return apiCall(client.get<ApiResponse<Comment[]>>(`/comments/task/${taskId}`));
  },

  // Create comment
  async create(taskId: string, data: CreateCommentDTO): Promise<Comment> {
    return apiCall(client.post<ApiResponse<Comment>>(`/comments/task/${taskId}`, data));
  },

  // Update comment
  async update(id: string, data: UpdateCommentDTO): Promise<Comment> {
    return apiCall(client.put<ApiResponse<Comment>>(`/comments/${id}`, data));
  },

  // Delete comment
  async delete(id: string): Promise<void> {
    await client.delete(`/comments/${id}`);
  },
};

export default commentsApi;
