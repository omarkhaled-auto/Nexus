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

const initialState = {
  currentProject: null as Project | null,
  projects: [] as Project[],
  mode: null as 'genesis' | 'evolution' | null
}

export const useProjectStore = create<ProjectState>()((set) => ({
  ...initialState,

  setProject: (project) => set({ currentProject: project }),
  setMode: (mode) => set({ mode }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  clearProject: () => set({ currentProject: null, mode: null }),
  reset: () => set({ ...initialState, projects: [] })
}))
