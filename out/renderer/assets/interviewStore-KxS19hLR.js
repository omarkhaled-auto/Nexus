import { Y as create } from "./index-DeoAs8is.js";
const initialState = {
  stage: "welcome",
  messages: [],
  requirements: [],
  isInterviewing: false,
  projectName: null,
  interviewStartTime: null,
  sessionId: null
};
function emitEvent(method, payload) {
  if (window.nexusAPI) {
    try {
      const fn = window.nexusAPI[method];
      void fn(payload);
    } catch {
    }
  }
}
const useInterviewStore = create()((set, get) => ({
  ...initialState,
  setStage: (stage) => {
    set({ stage });
  },
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
    emitEvent("emitInterviewMessage", {
      messageId: message.id,
      role: message.role,
      content: message.content
    });
  },
  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) => m.id === id ? { ...m, ...updates } : m)
    }));
  },
  addRequirement: (requirement) => {
    set((state) => ({
      requirements: [...state.requirements, requirement]
    }));
    emitEvent("emitInterviewRequirement", {
      requirementId: requirement.id,
      category: requirement.category,
      text: requirement.text,
      priority: requirement.priority
    });
  },
  updateRequirement: (id, updates) => {
    set((state) => ({
      requirements: state.requirements.map((r) => r.id === id ? { ...r, ...updates } : r)
    }));
  },
  removeRequirement: (id) => {
    set((state) => ({
      requirements: state.requirements.filter((r) => r.id !== id)
    }));
  },
  setProjectName: (name) => {
    set({ projectName: name });
  },
  setSessionId: (sessionId) => {
    set({ sessionId });
  },
  startInterview: () => {
    const state = get();
    set({
      isInterviewing: true,
      stage: "welcome",
      interviewStartTime: Date.now()
    });
    emitEvent("emitInterviewStarted", {
      projectName: state.projectName,
      mode: "genesis"
    });
  },
  completeInterview: () => {
    const state = get();
    const duration = state.interviewStartTime ? Math.round((Date.now() - state.interviewStartTime) / 1e3) : 0;
    const categories = [...new Set(state.requirements.map((r) => r.category))];
    set({
      isInterviewing: false,
      stage: "complete"
    });
    emitEvent("emitInterviewCompleted", {
      requirementCount: state.requirements.length,
      categories,
      duration
    });
  },
  reset: () => {
    set({
      ...initialState,
      messages: [],
      requirements: [],
      interviewStartTime: null,
      sessionId: null
    });
  }
}));
const useInterviewStage = () => useInterviewStore((s) => s.stage);
const useMessages = () => useInterviewStore((s) => s.messages);
const useRequirements = () => useInterviewStore((s) => s.requirements);
const useIsInterviewing = () => useInterviewStore((s) => s.isInterviewing);
const useSessionId = () => useInterviewStore((s) => s.sessionId);
export {
  useIsInterviewing as a,
  useInterviewStore as b,
  useSessionId as c,
  useRequirements as d,
  useInterviewStage as e,
  useMessages as u
};
