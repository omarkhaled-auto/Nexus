/**
 * Test Data Fixtures
 *
 * Predefined test data for E2E tests including features, requirements,
 * checkpoints, and other test scenarios.
 */

/**
 * Feature test data
 */
export interface TestFeature {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'planning' | 'in_progress' | 'ai_review' | 'human_review' | 'done';
  complexity: 'simple' | 'moderate' | 'complex';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Requirement test data
 */
export interface TestRequirement {
  id: string;
  content: string;
  type: 'functional' | 'non_functional' | 'constraint';
  priority: 'must' | 'should' | 'could' | 'wont';
  category?: string;
  createdAt?: string;
}

/**
 * Checkpoint test data
 */
export interface TestCheckpoint {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  projectPath: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent test data
 */
export interface TestAgent {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'waiting' | 'error';
  currentTask?: string;
  progress?: number;
}

/**
 * Chat message test data
 */
export interface TestMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Sample features for Kanban testing
 */
export const sampleFeatures: TestFeature[] = [
  {
    id: 'feat-001',
    title: 'User Authentication',
    description: 'Implement JWT-based authentication with login and registration',
    status: 'backlog',
    complexity: 'complex',
    priority: 'critical',
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-01-20T10:00:00Z',
  },
  {
    id: 'feat-002',
    title: 'Dashboard Analytics',
    description: 'Create real-time analytics dashboard with charts and metrics',
    status: 'planning',
    complexity: 'moderate',
    priority: 'high',
    createdAt: '2025-01-20T10:15:00Z',
    updatedAt: '2025-01-20T11:00:00Z',
  },
  {
    id: 'feat-003',
    title: 'API Rate Limiting',
    description: 'Add rate limiting middleware to protect API endpoints',
    status: 'in_progress',
    complexity: 'simple',
    priority: 'medium',
    createdAt: '2025-01-20T10:30:00Z',
    updatedAt: '2025-01-20T12:00:00Z',
  },
  {
    id: 'feat-004',
    title: 'Database Backup',
    description: 'Automated daily database backup system',
    status: 'ai_review',
    complexity: 'moderate',
    priority: 'high',
    createdAt: '2025-01-20T10:45:00Z',
    updatedAt: '2025-01-20T13:00:00Z',
  },
  {
    id: 'feat-005',
    title: 'Email Notifications',
    description: 'Send email notifications for important events',
    status: 'human_review',
    complexity: 'simple',
    priority: 'medium',
    createdAt: '2025-01-20T11:00:00Z',
    updatedAt: '2025-01-20T14:00:00Z',
  },
  {
    id: 'feat-006',
    title: 'Dark Mode',
    description: 'Add dark mode theme support',
    status: 'done',
    complexity: 'simple',
    priority: 'low',
    createdAt: '2025-01-20T11:15:00Z',
    updatedAt: '2025-01-20T15:00:00Z',
  },
];

/**
 * Sample requirements for Interview testing
 */
export const sampleRequirements: TestRequirement[] = [
  {
    id: 'req-001',
    content: 'Users must be able to log in with email and password',
    type: 'functional',
    priority: 'must',
    category: 'Authentication',
    createdAt: '2025-01-20T10:00:00Z',
  },
  {
    id: 'req-002',
    content: 'Application must respond within 200ms for 95% of requests',
    type: 'non_functional',
    priority: 'should',
    category: 'Performance',
    createdAt: '2025-01-20T10:05:00Z',
  },
  {
    id: 'req-003',
    content: 'Must use React 18+ and TypeScript',
    type: 'constraint',
    priority: 'must',
    category: 'Technical',
    createdAt: '2025-01-20T10:10:00Z',
  },
  {
    id: 'req-004',
    content: 'Support OAuth authentication with Google and GitHub',
    type: 'functional',
    priority: 'should',
    category: 'Authentication',
    createdAt: '2025-01-20T10:15:00Z',
  },
  {
    id: 'req-005',
    content: 'API must be RESTful and follow OpenAPI 3.0 specification',
    type: 'constraint',
    priority: 'must',
    category: 'API',
    createdAt: '2025-01-20T10:20:00Z',
  },
  {
    id: 'req-006',
    content: 'Dashboard should update in real-time using WebSocket',
    type: 'functional',
    priority: 'could',
    category: 'Dashboard',
    createdAt: '2025-01-20T10:25:00Z',
  },
  {
    id: 'req-007',
    content: 'Database must support transactions and ACID compliance',
    type: 'non_functional',
    priority: 'must',
    category: 'Database',
    createdAt: '2025-01-20T10:30:00Z',
  },
  {
    id: 'req-008',
    content: 'Application must be accessible (WCAG 2.1 Level AA)',
    type: 'non_functional',
    priority: 'should',
    category: 'Accessibility',
    createdAt: '2025-01-20T10:35:00Z',
  },
];

/**
 * Sample checkpoints for checkpoint testing
 */
export const sampleCheckpoints: TestCheckpoint[] = [
  {
    id: 'cp-001',
    name: 'Initial Setup Complete',
    description: 'Project initialized with basic structure',
    createdAt: '2025-01-20T09:00:00Z',
    projectPath: '/test/project',
    metadata: {
      features: 0,
      tasks: 0,
      progress: 0,
    },
  },
  {
    id: 'cp-002',
    name: 'Authentication Implementation',
    description: 'User authentication feature completed',
    createdAt: '2025-01-20T12:00:00Z',
    projectPath: '/test/project',
    metadata: {
      features: 1,
      tasks: 5,
      progress: 20,
    },
  },
  {
    id: 'cp-003',
    name: 'Dashboard MVP',
    description: 'Basic dashboard with analytics ready',
    createdAt: '2025-01-20T15:00:00Z',
    projectPath: '/test/project',
    metadata: {
      features: 3,
      tasks: 12,
      progress: 50,
    },
  },
];

/**
 * Sample agents for execution testing
 */
export const sampleAgents: TestAgent[] = [
  {
    id: 'agent-001',
    name: 'Planning Agent',
    status: 'working',
    currentTask: 'Decomposing feature into tasks',
    progress: 45,
  },
  {
    id: 'agent-002',
    name: 'Implementation Agent',
    status: 'working',
    currentTask: 'Implementing authentication logic',
    progress: 67,
  },
  {
    id: 'agent-003',
    name: 'QA Agent',
    status: 'waiting',
    currentTask: 'Waiting for implementation',
    progress: 0,
  },
  {
    id: 'agent-004',
    name: 'Review Agent',
    status: 'idle',
    currentTask: undefined,
    progress: 0,
  },
];

/**
 * Sample chat messages for interview testing
 */
export const sampleMessages: TestMessage[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: 'I want to build a task management application',
    timestamp: '2025-01-20T10:00:00Z',
  },
  {
    id: 'msg-002',
    role: 'assistant',
    content: 'Great! Let me help you with that. Can you tell me more about the key features you need?',
    timestamp: '2025-01-20T10:00:05Z',
  },
  {
    id: 'msg-003',
    role: 'user',
    content: 'I need user authentication, task creation, and team collaboration features',
    timestamp: '2025-01-20T10:01:00Z',
  },
  {
    id: 'msg-004',
    role: 'assistant',
    content: 'Excellent. I\'ve extracted the following requirements:\n\n1. User Authentication\n2. Task Creation and Management\n3. Team Collaboration Features\n\nShould we discuss any technical constraints?',
    timestamp: '2025-01-20T10:01:10Z',
  },
];

/**
 * Factory functions for creating test data with custom overrides
 */
export const testDataFactory = {
  /**
   * Create a test feature with optional overrides
   */
  feature(overrides?: Partial<TestFeature>): TestFeature {
    return {
      id: `feat-${Date.now()}`,
      title: 'Test Feature',
      description: 'A test feature for E2E testing',
      status: 'backlog',
      complexity: 'moderate',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a test requirement with optional overrides
   */
  requirement(overrides?: Partial<TestRequirement>): TestRequirement {
    return {
      id: `req-${Date.now()}`,
      content: 'Test requirement content',
      type: 'functional',
      priority: 'must',
      category: 'Test',
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a test checkpoint with optional overrides
   */
  checkpoint(overrides?: Partial<TestCheckpoint>): TestCheckpoint {
    return {
      id: `cp-${Date.now()}`,
      name: 'Test Checkpoint',
      description: 'A test checkpoint for E2E testing',
      createdAt: new Date().toISOString(),
      projectPath: '/test/project',
      metadata: {},
      ...overrides,
    };
  },

  /**
   * Create a test agent with optional overrides
   */
  agent(overrides?: Partial<TestAgent>): TestAgent {
    return {
      id: `agent-${Date.now()}`,
      name: 'Test Agent',
      status: 'idle',
      progress: 0,
      ...overrides,
    };
  },

  /**
   * Create a test message with optional overrides
   */
  message(overrides?: Partial<TestMessage>): TestMessage {
    return {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: 'Test message content',
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create multiple features at once
   */
  features(count: number, overrides?: Partial<TestFeature>): TestFeature[] {
    return Array.from({ length: count }, (_, i) =>
      testDataFactory.feature({
        id: `feat-test-${i + 1}`,
        title: `Test Feature ${i + 1}`,
        ...overrides,
      })
    );
  },

  /**
   * Create multiple requirements at once
   */
  requirements(count: number, overrides?: Partial<TestRequirement>): TestRequirement[] {
    return Array.from({ length: count }, (_, i) =>
      testDataFactory.requirement({
        id: `req-test-${i + 1}`,
        content: `Test requirement ${i + 1} content`,
        ...overrides,
      })
    );
  },
};

/**
 * Test scenarios - predefined sets of data for common test cases
 */
export const testScenarios = {
  /**
   * Empty state - no data
   */
  empty: {
    features: [] as TestFeature[],
    requirements: [] as TestRequirement[],
    checkpoints: [] as TestCheckpoint[],
    agents: [] as TestAgent[],
  },

  /**
   * Minimal data - one of each
   */
  minimal: {
    features: [sampleFeatures[0]],
    requirements: [sampleRequirements[0]],
    checkpoints: [sampleCheckpoints[0]],
    agents: [sampleAgents[0]],
  },

  /**
   * Complete workflow - all stages represented
   */
  completeWorkflow: {
    features: sampleFeatures,
    requirements: sampleRequirements,
    checkpoints: sampleCheckpoints,
    agents: sampleAgents,
  },

  /**
   * Active execution - agents working on features
   */
  activeExecution: {
    features: sampleFeatures.slice(0, 3),
    requirements: sampleRequirements.slice(0, 5),
    checkpoints: sampleCheckpoints.slice(0, 2),
    agents: sampleAgents.filter((a) => a.status === 'working' || a.status === 'waiting'),
  },
};
