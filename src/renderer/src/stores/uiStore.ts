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

// Selector hooks for optimized re-renders
export const useSidebarOpen = () => useUIStore((s) => s.sidebarOpen)
export const useIsLoading = () => useUIStore((s) => s.isLoading)
export const useError = () => useUIStore((s) => s.error)
export const useToasts = () => useUIStore((s) => s.toasts)

/** Returns true if there is an active error */
export const useHasError = () => useUIStore((s) => s.error !== null)
