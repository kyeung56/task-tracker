import client, { apiCall } from './client';
import type { User, Role } from '../types';

export const usersApi = {
  // Get all users
  async getAll(): Promise<User[]> {
    return apiCall(client.get<ApiResponse<User[]>>('/users'));
  },

  // Get user by ID
  async getById(id: string): Promise<User> {
    return apiCall(client.get<ApiResponse<User>>(`/users/${id}`));
  },

  // Update user (admin only)
  async update(id: string, data: { name?: string; email?: string; roleId?: string; isActive?: boolean }): Promise<User> {
    return apiCall(client.put<ApiResponse<User>>(`/users/${id}`, data));
  },

  // Get all roles
  async getRoles(): Promise<Role[]> {
    return apiCall(client.get<ApiResponse<Role[]>>('/users/roles/all'));
  },
};

export default usersApi;
