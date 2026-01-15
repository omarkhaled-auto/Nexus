// Feature status - 6-column Kanban pipeline
export type FeatureStatus =
  | 'backlog'
  | 'planning'
  | 'in_progress'
  | 'ai_review'
  | 'human_review'
  | 'done'

// Feature complexity levels
export type FeatureComplexity = 'simple' | 'moderate' | 'complex'

// Feature priority levels
export type FeaturePriority = 'low' | 'medium' | 'high' | 'critical'

// Single feature in the Kanban board
export interface Feature {
  id: string
  title: string
  description: string
  status: FeatureStatus
  complexity: FeatureComplexity
  progress: number // 0-100 percentage
  assignedAgent: string | null
  tasks: string[] // Task IDs
  priority: FeaturePriority
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  qaIterations?: number // Number of QA iterations completed (max 50)
}

// Column counts for the Kanban board
export interface ColumnCounts {
  backlog: number
  planning: number
  in_progress: number
  ai_review: number
  human_review: number
  done: number
}
