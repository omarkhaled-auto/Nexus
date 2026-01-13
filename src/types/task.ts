// Task lifecycle
export type TaskStatus =
  | 'pending' // Not yet started
  | 'queued' // Ready for agent assignment
  | 'assigned' // Agent assigned, not started
  | 'executing' // Agent working on task
  | 'qa-loop' // In QA loop (build/lint/test/review)
  | 'review' // Awaiting human review
  | 'completed' // Successfully completed
  | 'failed' // Failed after max retries
  | 'blocked'; // Blocked by dependency or issue

// Task sizing per Master Book
export type TaskSize = 'atomic' | 'small';
// atomic: 5-15 minutes, single file
// small: 15-30 minutes, 1-2 files
// NO task can exceed 30 minutes (HARD LIMIT)

// Task type - distinguishes automated tasks from checkpoints
export type TaskType = 'auto' | 'checkpoint' | 'tdd';
// auto: fully automated task executed by agent
// checkpoint: requires human verification or decision
// tdd: test-driven development task (red-green-refactor cycle)

export interface Task {
  id: string;
  projectId: string;
  featureId?: string;
  subFeatureId?: string;
  name: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  size: TaskSize;

  // Execution context
  assignedAgent?: string;
  worktreePath?: string;
  branchName?: string;

  // Dependencies
  dependsOn: string[]; // Task IDs
  blockedBy?: string; // Blocking task/issue ID

  // QA tracking
  qaIterations: number;
  maxIterations: number; // Default 50
  lastQAResult?: QAResult;

  // Timing
  estimatedMinutes: number;
  actualMinutes?: number;
  startedAt?: Date;
  completedAt?: Date;

  // Output
  filesCreated: string[];
  filesModified: string[];
  testsWritten: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface TaskResult {
  taskId: string;
  status: 'success' | 'failure' | 'escalated';
  qaIterations: number;
  duration: number; // milliseconds
  filesChanged: FileChange[];
  testResults?: TestResult;
  reviewResult?: ReviewResult;
  error?: TaskError;
}

export interface FileChange {
  path: string;
  operation: 'create' | 'modify' | 'delete';
  additions: number;
  deletions: number;
}

export interface QAResult {
  iteration: number;
  timestamp: Date;
  buildResult: StageResult;
  lintResult: StageResult;
  testResult: StageResult;
  reviewResult?: ReviewResult;
  passed: boolean;
  nextAction: 'continue' | 'fix' | 'escalate';
}

export interface StageResult {
  stage: 'build' | 'lint' | 'test' | 'review';
  passed: boolean;
  errors: string[];
  warnings: string[];
  duration: number; // milliseconds
}

export interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  coverage?: number; // percentage
  duration: number;
  failures: TestFailure[];
}

export interface TestFailure {
  testName: string;
  file: string;
  error: string;
  stack?: string;
}

export interface ReviewResult {
  approved: boolean;
  reviewer: 'ai' | 'human';
  issues: ReviewIssue[];
  suggestions: string[];
  timestamp: Date;
}

export interface ReviewIssue {
  severity: 'critical' | 'major' | 'minor' | 'suggestion';
  category: 'security' | 'performance' | 'style' | 'logic' | 'test-coverage';
  file: string;
  line?: number;
  message: string;
  suggestedFix?: string;
}

export interface TaskError {
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
}
