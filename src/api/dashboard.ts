import client, { apiCall } from './client';
import type { DashboardStats, TeamWorkload, ApiResponse } from '../types';

export type Period = 'week' | 'month' | 'quarter' | 'custom';

export const dashboardApi = {
  // Get dashboard stats
  async getStats(period: Period = 'month', startDate?: string, endDate?: string): Promise<DashboardStats> {
    const params: Record<string, string> = { period };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return apiCall(client.get<ApiResponse<DashboardStats>>('/dashboard/stats', { params }));
  },

  // Get team workload
  async getTeamWorkload(): Promise<TeamWorkload[]> {
    return apiCall(client.get<ApiResponse<TeamWorkload[]>>('/dashboard/team-workload'));
  },
};

export default dashboardApi;
