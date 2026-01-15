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

const initialState = {
  sidebarOpen: true,
  isLoading: false,
  error: null as string | null,
  toasts: [] as Toast[]
}

export const useUIStore = create<UIState>()((set) => ({
  ...initialState,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  addToast: (toast) => set((state) => ({ toasts: [...state.toasts, toast] })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    })),
  reset: () => set({ ...initialState, toasts: [] })
}))
