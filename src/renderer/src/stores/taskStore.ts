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

  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, update: Partial<Task>) => void
  removeTask: (id: string) => void
  selectTask: (id: string | null) => void
  getTask: (id: string) => Task | undefined
  reset: () => void
}

// Stub implementation - tests will fail
export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  selectedTaskId: null,

  setTasks: () => {},
  addTask: () => {},
  updateTask: () => {},
  removeTask: () => {},
  selectTask: () => {},
  getTask: () => undefined,
  reset: () => {}
}))
