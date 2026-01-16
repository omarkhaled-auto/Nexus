// Store exports
export { useProjectStore, type Project } from './projectStore'
export { useTaskStore, type Task } from './taskStore'
export { useAgentStore, type AgentStatus } from './agentStore'
export { useUIStore, type Toast } from './uiStore'
export { useInterviewStore } from './interviewStore'
export { useFeatureStore } from './featureStore'
export { useMetricsStore } from './metricsStore'
export { useSettingsStore } from './settingsStore'

// Selector exports - projectStore
export { useCurrentProject, useMode, useProjects } from './projectStore'

// Selector exports - taskStore
export {
  useTasks,
  useSelectedTaskId,
  useSelectedTask,
  useTasksByStatus
} from './taskStore'

// Selector exports - agentStore
export {
  useAgents,
  useAgentsArray,
  useActiveAgents,
  useAgentsByType
} from './agentStore'

// Selector exports - uiStore
export {
  useSidebarOpen,
  useIsLoading,
  useError,
  useToasts,
  useHasError
} from './uiStore'

// Selector exports - interviewStore
export {
  useInterviewStage,
  useMessages,
  useRequirements,
  useRequirementsByCategory,
  useIsInterviewing,
  useLatestMessage,
  useProjectName
} from './interviewStore'

// Selector exports - featureStore
export {
  useFeatures,
  useFeaturesByStatus,
  useFeature,
  useFeatureCount,
  useColumnCounts
} from './featureStore'

// Selector exports - metricsStore
export {
  useOverview,
  useTimeline,
  useAgentMetrics,
  useCosts,
  useIsMetricsLoading,
  useActiveAgentCount,
  useTaskProgress,
  useLastUpdated
} from './metricsStore'

// Selector exports - settingsStore
export {
  useSettings,
  useRawSettings,
  useThemeSetting,
  useHasApiKey,
  useSettingsLoading,
  useSettingsDirty
} from './settingsStore'
