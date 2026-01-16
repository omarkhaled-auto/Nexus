import { create } from 'zustand'

/**
 * @deprecated Use sonner toast instead: import { toast } from '@/lib/toast'
 * This interface is kept for backward compatibility.
 */
export interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'error'
}

interface UIState {
  sidebarOpen: boolean
  isLoading: boolean
  error: string | null
  /** @deprecated Use sonner toast instead */
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  toasts: Toast[]
  showShortcuts: boolean

  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  /** @deprecated Use sonner toast instead */
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  addToast: (toast: Toast) => void
  removeToast: (id: string) => void
  setShowShortcuts: (show: boolean) => void
  reset: () => void
}

const initialState = {
  sidebarOpen: true,
  isLoading: false,
  error: null as string | null,
  /** @deprecated Use sonner toast instead */
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  toasts: [] as Toast[],
  showShortcuts: false,
}

export const useUIStore = create<UIState>()((set) => ({
  ...initialState,

  toggleSidebar: () => { set((state) => ({ sidebarOpen: !state.sidebarOpen })); },
  setSidebar: (open) => { set({ sidebarOpen: open }); },
  setLoading: (loading) => { set({ isLoading: loading }); },
  setError: (error) => { set({ error }); },
  clearError: () => { set({ error: null }); },
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- kept for backward compatibility
  addToast: (toast) => { set((state) => ({ toasts: [...state.toasts, toast] })); },
  removeToast: (id) =>
    { set((state) => ({
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      toasts: state.toasts.filter((t) => t.id !== id)
    })); },
  setShowShortcuts: (show) => { set({ showShortcuts: show }); },
  reset: () => {
    set({
      ...initialState,
      toasts: [],
      showShortcuts: false
    });
  }
}))

// Selector hooks for optimized re-renders
export const useSidebarOpen = () => useUIStore((s) => s.sidebarOpen)
export const useIsLoading = () => useUIStore((s) => s.isLoading)
export const useError = () => useUIStore((s) => s.error)
// eslint-disable-next-line @typescript-eslint/no-deprecated -- kept for backward compatibility
export const useToasts = () => useUIStore((s) => s.toasts)
export const useShowShortcuts = () => useUIStore((s) => s.showShortcuts)

/** Returns true if there is an active error */
export const useHasError = () => useUIStore((s) => s.error !== null)
