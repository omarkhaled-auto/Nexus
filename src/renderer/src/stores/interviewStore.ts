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
  interviewStartTime: number | null

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
  projectName: null as string | null,
  interviewStartTime: null as number | null
}

/**
 * Safely emit event via IPC (only in Electron context)
 */
function emitEvent<T>(method: keyof typeof window.nexusAPI, payload: T): void {
  if (typeof window !== 'undefined' && window.nexusAPI) {
    try {
       
      const fn = window.nexusAPI[method] as (p: T) => Promise<void>
      void fn(payload)
    } catch {
      // Silently ignore errors in event emission
    }
  }
}

export const useInterviewStore = create<InterviewState>()((set, get) => ({
  ...initialState,

  setStage: (stage) => { set({ stage }); },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }))

    // Emit INTERVIEW_MESSAGE event
    emitEvent('emitInterviewMessage', {
      messageId: message.id,
      role: message.role,
      content: message.content
    })
  },

  updateMessage: (id, updates) =>
    { set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m))
    })); },

  addRequirement: (requirement) => {
    set((state) => ({
      requirements: [...state.requirements, requirement]
    }))

    // Emit INTERVIEW_REQUIREMENT event
    emitEvent('emitInterviewRequirement', {
      requirementId: requirement.id,
      category: requirement.category,
      text: requirement.text,
      priority: requirement.priority
    })
  },

  updateRequirement: (id, updates) =>
    { set((state) => ({
      requirements: state.requirements.map((r) => (r.id === id ? { ...r, ...updates } : r))
    })); },

  removeRequirement: (id) =>
    { set((state) => ({
      requirements: state.requirements.filter((r) => r.id !== id)
    })); },

  setProjectName: (name) => { set({ projectName: name }); },

  startInterview: () => {
    const state = get()
    set({
      isInterviewing: true,
      stage: 'welcome',
      interviewStartTime: Date.now()
    })

    // Emit INTERVIEW_STARTED event
    emitEvent('emitInterviewStarted', {
      projectName: state.projectName,
      mode: 'genesis' as const
    })
  },

  completeInterview: () => {
    const state = get()
    const duration = state.interviewStartTime
      ? Math.round((Date.now() - state.interviewStartTime) / 1000)
      : 0

    // Get unique categories from requirements
    const categories = [...new Set(state.requirements.map((r) => r.category))]

    set({
      isInterviewing: false,
      stage: 'complete'
    })

    // Emit INTERVIEW_COMPLETED event
    emitEvent('emitInterviewCompleted', {
      requirementCount: state.requirements.length,
      categories,
      duration
    })
  },

  reset: () =>
    { set({
      ...initialState,
      messages: [],
      requirements: [],
      interviewStartTime: null
    }); }
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
