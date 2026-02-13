import { create } from 'zustand';
import type { CalendarView, Task } from '../types';
import { tasksApi } from '../api';

interface CalendarState {
  currentView: CalendarView;
  currentDate: Date;
  selectedDate: Date | null;
  tasks: Task[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setView: (view: CalendarView) => void;
  navigate: (direction: 'prev' | 'next' | 'today') => void;
  selectDate: (date: Date | null) => void;
  goToToday: () => void;
  fetchTasks: (startDate: Date, endDate: Date) => Promise<void>;
  clearError: () => void;
}

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  currentView: 'month',
  currentDate: new Date(),
  selectedDate: null,
  tasks: [],
  isLoading: false,
  error: null,

  setView: (view) => set({ currentView: view }),

  navigate: (direction) => {
    const { currentView, currentDate } = get();
    const newDate = new Date(currentDate);

    switch (currentView) {
      case 'month':
        if (direction === 'prev') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else if (direction === 'next') {
          newDate.setMonth(newDate.getMonth() + 1);
        } else {
          newDate.setTime(new Date().getTime());
        }
        break;
      case 'week':
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 7);
        } else if (direction === 'next') {
          newDate.setDate(newDate.getDate() + 7);
        } else {
          newDate.setTime(new Date().getTime());
        }
        break;
      case 'day':
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 1);
        } else if (direction === 'next') {
          newDate.setDate(newDate.getDate() + 1);
        } else {
          newDate.setTime(new Date().getTime());
        }
        break;
    }

    set({ currentDate: newDate });
  },

  selectDate: (date) => set({ selectedDate: date }),

  goToToday: () => set({ currentDate: new Date(), selectedDate: new Date() }),

  fetchTasks: async (startDate, endDate) => {
    set({ isLoading: true, error: null });
    try {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      const response = await tasksApi.getAll({
        startDate: start,
        endDate: end,
        pageSize: 500,
      });
      set({ tasks: response.data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useCalendarStore;
