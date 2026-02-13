import client, { apiCall } from './client';
import type { Category } from '../types';

export interface CreateCategoryDTO {
  name: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

export const categoriesApi = {
  // Get all categories
  async getAll(): Promise<Category[]> {
    return apiCall(client.get<ApiResponse<Category[]>>('/categories'));
  },

  // Create category
  async create(data: CreateCategoryDTO): Promise<Category> {
    return apiCall(client.post<ApiResponse<Category>>('/categories', data));
  },

  // Update category
  async update(id: string, data: Partial<CreateCategoryDTO>): Promise<Category> {
    return apiCall(client.put<ApiResponse<Category>>(`/categories/${id}`, data));
  },

  // Delete category
  async delete(id: string): Promise<void> {
    await client.delete(`/categories/${id}`);
  },
};

export default categoriesApi;
