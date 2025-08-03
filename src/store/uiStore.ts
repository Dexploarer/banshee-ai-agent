import { create } from 'zustand';

interface Toast {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

interface UIState {
  // Navigation
  sidebarOpen: boolean;
  currentPortal: string;

  // Loading states
  globalLoading: boolean;
  loadingMessage?: string;

  // Toasts
  toasts: Toast[];

  // Modals
  activeModal: string | null;
  modalData: any;

  // Search
  searchOpen: boolean;
  searchQuery: string;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCurrentPortal: (portal: string) => void;

  // Loading actions
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Modal actions
  openModal: (modal: string, data?: any) => void;
  closeModal: () => void;

  // Search actions
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  sidebarOpen: true,
  currentPortal: 'dashboard',
  globalLoading: false,
  loadingMessage: '',
  toasts: [],
  activeModal: null,
  modalData: null,
  searchOpen: false,
  searchQuery: '',

  // Navigation actions
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCurrentPortal: (portal) => set({ currentPortal: portal }),

  // Loading actions
  setGlobalLoading: (loading, message) =>
    set({ globalLoading: loading, loadingMessage: message || '' }),

  // Toast actions
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast = { ...toast, id };

    set((state) => ({ toasts: [...state.toasts, newToast] }));

    // Auto-remove toast after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration || 5000);
    }
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearToasts: () => set({ toasts: [] }),

  // Modal actions
  openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Search actions
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));

// Helper functions for common toast patterns
export const toast = {
  success: (title: string, description?: string) => {
    useUIStore
      .getState()
      .addToast({ title, description: description || '', type: 'success', duration: 5000 });
  },
  error: (title: string, description?: string) => {
    useUIStore
      .getState()
      .addToast({ title, description: description || '', type: 'error', duration: 8000 });
  },
  warning: (title: string, description?: string) => {
    useUIStore
      .getState()
      .addToast({ title, description: description || '', type: 'warning', duration: 6000 });
  },
  info: (title: string, description?: string) => {
    useUIStore
      .getState()
      .addToast({ title, description: description || '', type: 'info', duration: 4000 });
  },
};
