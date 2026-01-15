import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'error'
}

interface UIState {
  sidebarOpen: boolean
  isLoading: boolean
  error: string | null
  toasts: Toast[]

  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  addToast: (toast: Toast) => void
  removeToast: (id: string) => void
  reset: () => void
}

// Stub implementation - tests will fail
export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  isLoading: false,
  error: null,
  toasts: [],

  toggleSidebar: () => {},
  setSidebar: () => {},
  setLoading: () => {},
  setError: () => {},
  clearError: () => {},
  addToast: () => {},
  removeToast: () => {},
  reset: () => {}
}))
