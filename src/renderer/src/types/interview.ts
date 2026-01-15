// Interview stages - 7 stage progression
export type InterviewStage =
  | 'welcome'
  | 'project_overview'
  | 'technical_requirements'
  | 'features'
  | 'constraints'
  | 'review'
  | 'complete'

// Requirement categories
export type RequirementCategory =
  | 'functional'
  | 'non_functional'
  | 'technical'
  | 'constraint'
  | 'user_story'

// Requirement priority (MoSCoW)
export type RequirementPriority = 'must' | 'should' | 'could' | 'wont'

// Single requirement
export interface Requirement {
  id: string
  category: RequirementCategory
  text: string
  priority: RequirementPriority
  extractedAt: string // ISO timestamp
  fromMessageId: string // Links back to source message
}

// Chat message
export interface InterviewMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean // For streaming responses
}

// Full interview state (data portion)
export interface InterviewData {
  stage: InterviewStage
  messages: InterviewMessage[]
  requirements: Requirement[]
  isInterviewing: boolean
  projectName: string | null
}
