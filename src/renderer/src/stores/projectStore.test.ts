import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from './projectStore'

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  describe('mode management', () => {
    it('should initialize with null mode', () => {
      expect(useProjectStore.getState().mode).toBeNull()
    })

    it('should set mode to genesis', () => {
      useProjectStore.getState().setMode('genesis')
      expect(useProjectStore.getState().mode).toBe('genesis')
    })

    it('should set mode to evolution', () => {
      useProjectStore.getState().setMode('evolution')
      expect(useProjectStore.getState().mode).toBe('evolution')
    })
  })

  describe('project management', () => {
    it('should initialize with null currentProject', () => {
      expect(useProjectStore.getState().currentProject).toBeNull()
    })

    it('should set current project', () => {
      const project = {
        id: 'p1',
        name: 'Test',
        mode: 'genesis' as const,
        createdAt: new Date().toISOString()
      }
      useProjectStore.getState().setProject(project)
      expect(useProjectStore.getState().currentProject).toEqual(project)
    })

    it('should add project to list', () => {
      const project = {
        id: 'p1',
        name: 'Test',
        mode: 'genesis' as const,
        createdAt: new Date().toISOString()
      }
      useProjectStore.getState().addProject(project)
      expect(useProjectStore.getState().projects).toContainEqual(project)
    })

    it('should clear project and mode', () => {
      useProjectStore.getState().setMode('genesis')
      useProjectStore.getState().setProject({
        id: 'p1',
        name: 'Test',
        mode: 'genesis',
        createdAt: ''
      })
      useProjectStore.getState().clearProject()
      expect(useProjectStore.getState().currentProject).toBeNull()
      expect(useProjectStore.getState().mode).toBeNull()
    })

    it('should reset to initial state', () => {
      useProjectStore.getState().setMode('genesis')
      useProjectStore.getState().reset()
      expect(useProjectStore.getState().mode).toBeNull()
      expect(useProjectStore.getState().projects).toEqual([])
    })
  })
})
