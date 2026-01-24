import { create } from 'zustand'

export interface Task {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  assignedAgent?: string
  estimatedMinutes?: number
}

interface TaskState {
  tasks: Task[]
  selectedTaskId: string | null
  isLoading: boolean

  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, update: Partial<Task>) => void
  removeTask: (id: string) => void
  selectTask: (id: string | null) => void
  getTask: (id: string) => Task | undefined
  loadTasks: (projectId?: string) => Promise<void>
  reset: () => void
}

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  isLoading: false,

  setTasks: (tasks) => { set({ tasks }); },
  addTask: (task) => { set((state) => ({ tasks: [...state.tasks, task] })); },
  updateTask: (id, update) =>
    { set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...update } : t))
    })); },
  removeTask: (id) =>
    { set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id)
    })); },
  selectTask: (id) => { set({ selectedTaskId: id }); },
  getTask: (id) => get().tasks.find((t) => t.id === id),
  loadTasks: async (projectId?: string) => {
    // Load tasks from backend via IPC
    set({ isLoading: true });
    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive check for non-Electron environments
      if (window.nexusAPI?.getTasks) {
        const tasks = await window.nexusAPI.getTasks(projectId) as Task[];
        console.log('[taskStore] Loaded tasks from backend:', tasks.length, projectId ? `(filtered by ${projectId})` : '(all)');
        set({ tasks, isLoading: false });
      } else {
        console.warn('[taskStore] nexusAPI.getTasks not available');
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('[taskStore] Failed to load tasks:', error);
      set({ isLoading: false });
    }
  },
  reset: () => { set({ tasks: [], selectedTaskId: null, isLoading: false }); }
}))

// Selector hooks for optimized re-renders
export const useTasks = () => useTaskStore((s) => s.tasks)
export const useSelectedTaskId = () => useTaskStore((s) => s.selectedTaskId)

/** Returns the currently selected task or undefined */
export const useSelectedTask = () => {
  const tasks = useTaskStore((s) => s.tasks)
  const selectedId = useTaskStore((s) => s.selectedTaskId)
  return tasks.find((t) => t.id === selectedId)
}

/** Returns tasks filtered by status */
export const useTasksByStatus = (status: Task['status']) =>
  useTaskStore((s) => s.tasks.filter((t) => t.status === status))
