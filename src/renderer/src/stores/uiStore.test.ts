import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.getState().reset()
  })

  describe('sidebar state', () => {
    it('should initialize with sidebar open', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true)
    })

    it('should toggle sidebar', () => {
      useUIStore.getState().toggleSidebar()
      expect(useUIStore.getState().sidebarOpen).toBe(false)
      useUIStore.getState().toggleSidebar()
      expect(useUIStore.getState().sidebarOpen).toBe(true)
    })

    it('should set sidebar explicitly', () => {
      useUIStore.getState().setSidebar(false)
      expect(useUIStore.getState().sidebarOpen).toBe(false)
      useUIStore.getState().setSidebar(true)
      expect(useUIStore.getState().sidebarOpen).toBe(true)
    })
  })

  describe('loading states', () => {
    it('should initialize with loading false', () => {
      expect(useUIStore.getState().isLoading).toBe(false)
    })

    it('should set loading state', () => {
      useUIStore.getState().setLoading(true)
      expect(useUIStore.getState().isLoading).toBe(true)
      useUIStore.getState().setLoading(false)
      expect(useUIStore.getState().isLoading).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should initialize with no error', () => {
      expect(useUIStore.getState().error).toBeNull()
    })

    it('should set error message', () => {
      useUIStore.getState().setError('Something went wrong')
      expect(useUIStore.getState().error).toBe('Something went wrong')
    })

    it('should clear error', () => {
      useUIStore.getState().setError('Something went wrong')
      useUIStore.getState().clearError()
      expect(useUIStore.getState().error).toBeNull()
    })
  })

  describe('toast notifications', () => {
    it('should add toast notification', () => {
      const toast = { id: 't1', message: 'Success!', type: 'success' as const }
      useUIStore.getState().addToast(toast)
      expect(useUIStore.getState().toasts).toContainEqual(toast)
    })

    it('should remove toast by id', () => {
      const toast = { id: 't1', message: 'Success!', type: 'success' as const }
      useUIStore.getState().addToast(toast)
      useUIStore.getState().removeToast('t1')
      expect(useUIStore.getState().toasts).toEqual([])
    })
  })
})
