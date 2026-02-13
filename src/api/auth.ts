import client, { apiCall } from './client';
import type { User, AuthResponse, LoginCredentials, RegisterData, ApiResponse } from '../types';

export const authApi = {
  // Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await client.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    const { data } = response.data;

    // Store token
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  },

  // Register
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await client.post<ApiResponse<AuthResponse>>('/auth/register', data);
    const { data: result } = response.data;

    // Store token
    localStorage.setItem('auth_token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));

    return result;
  },

  // Logout
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  // Get current user
  async getCurrentUser(): Promise<User> {
    return apiCall(client.get<ApiResponse<User>>('/auth/me'));
  },

  // Update current user
  async updateCurrentUser(data: { name?: string; avatarUrl?: string }): Promise<User> {
    return apiCall(client.put<ApiResponse<User>>('/auth/me', data));
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await client.put('/auth/me/password', { currentPassword, newPassword });
  },

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  },

  // Get stored user
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },
};

export default authApi;
