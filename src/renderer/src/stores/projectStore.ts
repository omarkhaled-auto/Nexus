import { create } from 'zustand'

export interface Project {
  id: string
  name: string
  mode: 'genesis' | 'evolution'
  createdAt: string
}

interface ProjectState {
  currentProject: Project | null
  projects: Project[]
  mode: 'genesis' | 'evolution' | null

  setProject: (project: Project) => void
  setMode: (mode: 'genesis' | 'evolution') => void
  addProject: (project: Project) => void
  clearProject: () => void
  reset: () => void
}

// Stub implementation - tests will fail
export const useProjectStore = create<ProjectState>()((set) => ({
  currentProject: null,
  projects: [],
  mode: null,

  setProject: () => {},
  setMode: () => {},
  addProject: () => {},
  clearProject: () => {},
  reset: () => {}
}))
