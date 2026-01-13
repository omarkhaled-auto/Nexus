// Project lifecycle
export type ProjectStatus =
  | 'initializing'
  | 'interviewing'
  | 'planning'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'failed';

export type ProjectMode = 'genesis' | 'evolution';

// MoSCoW prioritization
export type Priority = 'must' | 'should' | 'could' | 'wont';

// Requirement categories
export type RequirementCategory =
  | 'functional'
  | 'non-functional'
  | 'ui-ux'
  | 'technical'
  | 'business-logic'
  | 'integration';

// Feature lifecycle
export type FeatureStatus =
  | 'backlog'
  | 'in-progress'
  | 'ai-review'
  | 'human-review'
  | 'done';

// Feature complexity - determines decomposition strategy
export type FeatureComplexity = 'simple' | 'complex';
// simple: 1-3 tasks, straightforward implementation
// complex: requires decomposition into sub-features, 4+ tasks

export interface Project {
  id: string;
  name: string;
  description: string;
  mode: ProjectMode;
  status: ProjectStatus;
  rootPath: string;
  repositoryUrl?: string;
  features: Feature[];
  requirements: Requirement[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metrics: ProjectMetrics;
}

export interface Feature {
  id: string;
  projectId: string;
  name: string;
  description: string;
  priority: Priority;
  status: FeatureStatus;
  complexity: FeatureComplexity;
  subFeatures: SubFeature[];
  estimatedTasks: number;
  completedTasks: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubFeature {
  id: string;
  featureId: string;
  name: string;
  description: string;
  status: FeatureStatus;
  taskIds: string[];
}

export interface Requirement {
  id: string;
  projectId: string;
  category: RequirementCategory;
  description: string;
  priority: Priority;
  source?: string; // Interview question or context
  userStories: string[]; // User stories derived from requirement
  acceptanceCriteria: string[]; // Criteria for verifying requirement is met
  linkedFeatures: string[];
  validated: boolean;
  createdAt: Date;
}

export interface ProjectMetrics {
  totalFeatures: number;
  completedFeatures: number;
  totalTasks: number;
  completedTasks: number;
  totalTokensUsed: number;
  totalCost: number;
  averageQAIterations: number;
  startedAt?: Date;
  estimatedCompletion?: Date;
}
