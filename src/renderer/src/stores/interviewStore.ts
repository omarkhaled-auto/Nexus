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
  sessionId: string | null

  // Actions
  setStage: (stage: InterviewStage) => void
  addMessage: (message: InterviewMessage) => void
  updateMessage: (id: string, updates: Partial<InterviewMessage>) => void
  addRequirement: (requirement: Requirement) => void
  updateRequirement: (id: string, updates: Partial<Requirement>) => void
  removeRequirement: (id: string) => void
  setProjectName: (name: string) => void
  setSessionId: (sessionId: string | null) => void
  startInterview: () => void
  completeInterview: () => void
  restoreSession: (messages: InterviewMessage[], requirements: Requirement[]) => void
  reset: () => void
}

const initialState = {
  stage: 'welcome' as InterviewStage,
  messages: [] as InterviewMessage[],
  requirements: [] as Requirement[],
  isInterviewing: false,
  projectName: null as string | null,
  interviewStartTime: null as number | null,
  sessionId: null as string | null
}

/**
 * Safely emit event via IPC (only in Electron context)
 */
function emitEvent(method: keyof typeof window.nexusAPI, payload: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive check for non-Electron environments
  if (window.nexusAPI) {
    try {
       
      const fn = window.nexusAPI[method] as (p: unknown) => Promise<void>
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

  setSessionId: (sessionId) => { set({ sessionId }); },

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

  restoreSession: (messages, requirements) => {
    // Restore messages and requirements from a resumed session
    // This is used when loading an existing session from the database
    // Use 'functional' as the default stage for restored sessions with messages
    // (we're continuing mid-interview, likely discussing features/requirements)
    set({
      messages,
      requirements,
      stage: messages.length > 0 ? 'functional' : 'welcome'
    })
  },

  reset: () =>
    { set({
      ...initialState,
      messages: [],
      requirements: [],
      interviewStartTime: null,
      sessionId: null
    }); }
}))

// Selector hooks for optimized re-renders
export const useInterviewStage = () => useInterviewStore((s) => s.stage)
export const useMessages = () => useInterviewStore((s) => s.messages)
export const useRequirements = () => useInterviewStore((s) => s.requirements)
export const useIsInterviewing = () => useInterviewStore((s) => s.isInterviewing)
export const useProjectName = () => useInterviewStore((s) => s.projectName)
export const useSessionId = () => useInterviewStore((s) => s.sessionId)

/** Returns the most recent message */
export const useLatestMessage = () =>
  useInterviewStore((s) => (s.messages.length > 0 ? s.messages[s.messages.length - 1] : null))

/** Filter requirements by category */
export const useRequirementsByCategory = (category: RequirementCategory) =>
  useInterviewStore((s) => s.requirements.filter((r) => r.category === category))
