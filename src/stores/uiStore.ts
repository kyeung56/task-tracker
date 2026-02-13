import { create } from 'zustand';
import type { UIState } from '../types';

interface UIActions {
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  openDrawer: (content: React.ReactNode) => void;
  closeDrawer: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setLoading: (isLoading: boolean) => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  isSidebarOpen: true,
  isDrawerOpen: false,
  drawerContent: null,
  activeModal: null,
  isLoading: false,
};

export const useUIStore = create<UIStore>((set) => ({
  ...initialState,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  openSidebar: () => set({ isSidebarOpen: true }),

  closeSidebar: () => set({ isSidebarOpen: false }),

  openDrawer: (content) => set({ isDrawerOpen: true, drawerContent: content }),

  closeDrawer: () => set({ isDrawerOpen: false, drawerContent: null }),

  openModal: (modalId) => set({ activeModal: modalId }),

  closeModal: () => set({ activeModal: null }),

  setLoading: (isLoading) => set({ isLoading }),
}));

export default useUIStore;
