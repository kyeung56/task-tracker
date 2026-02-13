import client, { apiCall } from './client';
import type { Attachment } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const uploadsApi = {
  // Upload file
  async upload(file: File, taskId?: string, commentId?: string): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    if (taskId) formData.append('taskId', taskId);
    if (commentId) formData.append('commentId', commentId);

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/uploads`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const result = await response.json();
    return result.data;
  },

  // Get file URL
  getFileUrl(attachment: Attachment): string {
    return `${API_BASE_URL.replace('/api', '')}${attachment.filePath}`;
  },

  // Delete file
  async delete(id: string): Promise<void> {
    await client.delete(`/uploads/${id}`);
  },
};

export default uploadsApi;
