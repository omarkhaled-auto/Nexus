import { create } from 'zustand'
import type {
  InterviewStage,
  InterviewMessage,
  Requirement,
  RequirementCategory
} from '../types/interview'

interface InterviewState {
  // State
  stage: InterviewStage
  messages: InterviewMessage[]
  requirements: Requirement[]
  isInterviewing: boolean
  projectName: string | null

  // Actions
  setStage: (stage: InterviewStage) => void
  addMessage: (message: InterviewMessage) => void
  updateMessage: (id: string, updates: Partial<InterviewMessage>) => void
  addRequirement: (requirement: Requirement) => void
  updateRequirement: (id: string, updates: Partial<Requirement>) => void
  removeRequirement: (id: string) => void
  setProjectName: (name: string) => void
  startInterview: () => void
  completeInterview: () => void
  reset: () => void
}

const initialState = {
  stage: 'welcome' as InterviewStage,
  messages: [] as InterviewMessage[],
  requirements: [] as Requirement[],
  isInterviewing: false,
  projectName: null as string | null
}

export const useInterviewStore = create<InterviewState>()((set) => ({
  ...initialState,

  setStage: (stage) => set({ stage }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message]
    })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m))
    })),

  addRequirement: (requirement) =>
    set((state) => ({
      requirements: [...state.requirements, requirement]
    })),

  updateRequirement: (id, updates) =>
    set((state) => ({
      requirements: state.requirements.map((r) => (r.id === id ? { ...r, ...updates } : r))
    })),

  removeRequirement: (id) =>
    set((state) => ({
      requirements: state.requirements.filter((r) => r.id !== id)
    })),

  setProjectName: (name) => set({ projectName: name }),

  startInterview: () =>
    set({
      isInterviewing: true,
      stage: 'welcome'
    }),

  completeInterview: () =>
    set({
      isInterviewing: false,
      stage: 'complete'
    }),

  reset: () =>
    set({
      ...initialState,
      messages: [],
      requirements: []
    })
}))

// Selector hooks for optimized re-renders
export const useInterviewStage = () => useInterviewStore((s) => s.stage)
export const useMessages = () => useInterviewStore((s) => s.messages)
export const useRequirements = () => useInterviewStore((s) => s.requirements)
export const useIsInterviewing = () => useInterviewStore((s) => s.isInterviewing)
export const useProjectName = () => useInterviewStore((s) => s.projectName)

/** Returns the most recent message */
export const useLatestMessage = () =>
  useInterviewStore((s) => (s.messages.length > 0 ? s.messages[s.messages.length - 1] : null))

/** Filter requirements by category */
export const useRequirementsByCategory = (category: RequirementCategory) =>
  useInterviewStore((s) => s.requirements.filter((r) => r.category === category))
