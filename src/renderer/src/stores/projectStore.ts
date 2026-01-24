import { create } from 'zustand'
import { useFeatureStore } from './featureStore'
import { useTaskStore } from './taskStore'

export interface Project {
  id: string
  name: string
  mode: 'genesis' | 'evolution'
  createdAt: string
  /** Path to project directory (Phase 21) */
  path?: string
}

/**
 * Partial project info for setting current project (Phase 21)
 * Allows setting project without all fields
 */
export interface CurrentProjectInfo {
  id: string
  name: string
  path?: string
  mode?: 'genesis' | 'evolution'
}

interface ProjectState {
  currentProject: Project | null
  projects: Project[]
  mode: 'genesis' | 'evolution' | null

  setProject: (project: Project) => void
  /** Set current project with partial info (Phase 21) */
  setCurrentProject: (info: CurrentProjectInfo) => void
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

export const useProjectStore = create<ProjectState>()((set, get) => ({
  ...initialState,

  setProject: (project) => { set({ currentProject: project, mode: project.mode }); },

  setCurrentProject: (info) => {
    const mode = info.mode || get().mode || 'genesis';

    // Clear stale data from previous project
    useFeatureStore.getState().reset();
    useTaskStore.getState().reset();
    console.log('[projectStore] Cleared features/tasks for project switch');

    set({
      currentProject: {
        id: info.id,
        name: info.name,
        path: info.path,
        mode,
        createdAt: new Date().toISOString(),
      },
      mode,
    });
  },

  setMode: (mode) => { set({ mode }); },
  addProject: (project) => { set((state) => ({ projects: [...state.projects, project] })); },
  clearProject: () => { set({ currentProject: null, mode: null }); },
  reset: () => { set({ ...initialState, projects: [] }); }
}))

// Selector hooks for optimized re-renders
export const useCurrentProject = () => useProjectStore((s) => s.currentProject)
export const useMode = () => useProjectStore((s) => s.mode)
export const useProjects = () => useProjectStore((s) => s.projects)
