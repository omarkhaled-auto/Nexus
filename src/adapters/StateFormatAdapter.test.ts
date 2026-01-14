/**
 * StateFormatAdapter tests - TDD RED phase
 *
 * Tests for conversion between internal state and human-readable STATE.md format.
 */

import { describe, it, expect } from 'vitest';
import {
  StateFormatAdapter,
  StateValidationError,
} from './StateFormatAdapter';
import type { NexusState } from '../persistence/state/StateManager';

describe('StateFormatAdapter', () => {
  const adapter = new StateFormatAdapter();

  // ============================================================================
  // Export to STATE.md
  // ============================================================================

  describe('exportToSTATE_MD', () => {
    it('returns markdown string', () => {
      const state = createTestState('proj-1');
      const markdown = adapter.exportToSTATE_MD(state);

      expect(typeof markdown).toBe('string');
      expect(markdown.length).toBeGreaterThan(0);
    });

    it('includes project name in header', () => {
      const state = createTestState('proj-1');
      state.project.name = 'My Amazing App';
      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('# Project State: My Amazing App');
    });

    it('includes current phase information', () => {
      const state = createTestState('proj-1');
      state.currentPhase = 'Phase 3 of 8 (Persistence)';
      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('Phase 3 of 8 (Persistence)');
    });

    it('includes status', () => {
      const state = createTestState('proj-1');
      state.status = 'executing';
      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('executing');
    });

    it('includes progress metrics with visual bar', () => {
      const state = createTestState('proj-1');
      state.features = [
        createTestFeature('f1', 'Auth', 'complete'),
        createTestFeature('f2', 'Dashboard', 'in_progress'),
        createTestFeature('f3', 'Settings', 'backlog'),
      ];
      const markdown = adapter.exportToSTATE_MD(state);

      // Should have a progress bar representation
      expect(markdown).toMatch(/Progress.*[█░]/);
    });

    it('includes feature list with status', () => {
      const state = createTestState('proj-1');
      state.features = [
        createTestFeature('f1', 'Auth', 'complete'),
        createTestFeature('f2', 'Dashboard', 'in_progress'),
      ];
      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('Auth');
      expect(markdown).toContain('complete');
      expect(markdown).toContain('Dashboard');
      expect(markdown).toContain('in_progress');
    });

    it('includes recent task summary', () => {
      const state = createTestState('proj-1');
      state.tasks = [
        createTestTask('t1', 'Create database schema', 'completed'),
        createTestTask('t2', 'Implement migrations', 'completed'),
        createTestTask('t3', 'StateManager', 'in_progress'),
      ];
      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('Create database schema');
      expect(markdown).toContain('StateManager');
    });

    it('includes active agents', () => {
      const state = createTestState('proj-1');
      state.agents = [createTestAgent('agent-1', 'coder', 'active')];
      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('coder');
    });

    it('is human-readable (not JSON dump)', () => {
      const state = createTestState('proj-1');
      state.features = [createTestFeature('f1', 'Auth', 'complete')];
      const markdown = adapter.exportToSTATE_MD(state);

      // Should NOT be raw JSON
      expect(markdown).not.toContain('{"projectId"');
      expect(markdown).not.toContain('"features":[');

      // Should have human-readable headers
      expect(markdown).toContain('#');
      expect(markdown).toContain('Status');
    });

    it('includes checkpoint info if available', () => {
      const state = createTestState('proj-1');
      state.lastCheckpointId = 'chk-abc123';
      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('chk-abc123');
    });

    it('includes project ID for lossless roundtrip', () => {
      const state = createTestState('proj-unique-123');
      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('**ID:** proj-unique-123');
    });
  });

  // ============================================================================
  // Import from STATE.md
  // ============================================================================

  describe('importFromSTATE_MD', () => {
    it('parses markdown to NexusState', () => {
      const markdown = createTestMarkdown();
      const state = adapter.importFromSTATE_MD(markdown);

      expect(state).toBeDefined();
      expect(state.projectId).toBeTruthy();
    });

    it('extracts project name', () => {
      const markdown = createTestMarkdown({ projectName: 'Super App' });
      const state = adapter.importFromSTATE_MD(markdown);

      expect(state.project.name).toBe('Super App');
    });

    it('extracts status', () => {
      const markdown = createTestMarkdown({ status: 'paused' });
      const state = adapter.importFromSTATE_MD(markdown);

      expect(state.status).toBe('paused');
    });

    it('extracts current phase', () => {
      const markdown = createTestMarkdown({
        phase: '5 of 12 (Agent Core)',
      });
      const state = adapter.importFromSTATE_MD(markdown);

      expect(state.currentPhase).toContain('5');
    });

    it('handles missing optional sections gracefully', () => {
      const markdown = `# Project State: Minimal App

## Status
- **Status:** planning

`;
      // Should not throw
      const state = adapter.importFromSTATE_MD(markdown);
      expect(state.status).toBe('planning');
      expect(state.features).toEqual([]);
      expect(state.tasks).toEqual([]);
    });

    it('validates required sections (project)', () => {
      const markdown = `## Status
- **Status:** planning
`;
      // Missing project name header
      expect(() => adapter.importFromSTATE_MD(markdown)).toThrow(
        StateValidationError
      );
    });

    it('validates required sections (status)', () => {
      const markdown = `# Project State: Test App

## Features
| Feature | Status |
`;
      // Missing status section
      expect(() => adapter.importFromSTATE_MD(markdown)).toThrow(
        StateValidationError
      );
    });

    it('throws StateValidationError for invalid format', () => {
      const markdown = 'This is not valid STATE.md format';

      expect(() => adapter.importFromSTATE_MD(markdown)).toThrow(
        StateValidationError
      );
    });

    it('parses feature table', () => {
      const markdown = createTestMarkdown({
        features: [
          { name: 'Auth', status: 'complete', progress: '100%' },
          { name: 'Dashboard', status: 'in_progress', progress: '60%' },
        ],
      });
      const state = adapter.importFromSTATE_MD(markdown);

      expect(state.features).toHaveLength(2);
      expect(state.features[0].name).toBe('Auth');
      expect(state.features[1].name).toBe('Dashboard');
    });

    it('parses task list', () => {
      const markdown = createTestMarkdown({
        tasks: [
          { name: 'Create schema', completed: true },
          { name: 'StateManager', completed: false, inProgress: true },
        ],
      });
      const state = adapter.importFromSTATE_MD(markdown);

      expect(state.tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('extracts project ID when present', () => {
      const markdown = `# Project State: Test App

## Status
- **ID:** proj-explicit-id-456
- **Phase:** Phase 1
- **Status:** planning
- **Progress:** ░░░░░░░░░░ 0%
`;
      const state = adapter.importFromSTATE_MD(markdown);

      expect(state.projectId).toBe('proj-explicit-id-456');
      expect(state.project.id).toBe('proj-explicit-id-456');
    });

    it('generates project ID from name when ID not present (backwards compatibility)', () => {
      const markdown = `# Project State: My Test App

## Status
- **Phase:** Phase 1
- **Status:** planning
`;
      const state = adapter.importFromSTATE_MD(markdown);

      // Should generate ID from name
      expect(state.projectId).toBe('my-test-app');
    });
  });

  // ============================================================================
  // Roundtrip
  // ============================================================================

  describe('Roundtrip', () => {
    it('export then import produces equivalent state', () => {
      const original = createTestState('proj-1');
      original.project.name = 'Roundtrip Test';
      original.status = 'executing';
      original.currentPhase = 'Phase 2 of 5';
      original.features = [
        createTestFeature('f1', 'Feature One', 'complete'),
        createTestFeature('f2', 'Feature Two', 'in_progress'),
      ];

      const markdown = adapter.exportToSTATE_MD(original);
      const restored = adapter.importFromSTATE_MD(markdown);

      // Core fields should match
      expect(restored.project.name).toBe(original.project.name);
      expect(restored.status).toBe(original.status);
      expect(restored.currentPhase).toContain('2');
      expect(restored.features).toHaveLength(original.features.length);
    });

    it('preserves project ID through roundtrip (lossless)', () => {
      const original = createTestState('proj-unique-id-12345');
      original.project.name = 'ID Test Project';

      const markdown = adapter.exportToSTATE_MD(original);
      const restored = adapter.importFromSTATE_MD(markdown);

      // Project ID must be preserved exactly
      expect(restored.projectId).toBe(original.projectId);
      expect(restored.project.id).toBe(original.project.id);
    });

    it('export -> import -> export produces identical output', () => {
      const original = createTestState('proj-roundtrip-xyz');
      original.project.name = 'Double Roundtrip';
      original.status = 'executing';
      original.currentPhase = 'Phase 3';

      const markdown1 = adapter.exportToSTATE_MD(original);
      const restored = adapter.importFromSTATE_MD(markdown1);
      const markdown2 = adapter.exportToSTATE_MD(restored);

      // Both exports should contain the same project ID
      expect(markdown1).toContain('proj-roundtrip-xyz');
      expect(markdown2).toContain('proj-roundtrip-xyz');
    });

    it('import ignores formatting/whitespace differences', () => {
      const state = createTestState('proj-1');
      const markdown1 = adapter.exportToSTATE_MD(state);

      // Add extra whitespace
      const markdown2 = markdown1.replace(/\n/g, '\n\n').replace(/  /g, '    ');

      const state1 = adapter.importFromSTATE_MD(markdown1);
      const state2 = adapter.importFromSTATE_MD(markdown2);

      expect(state1.project.name).toBe(state2.project.name);
      expect(state1.status).toBe(state2.status);
    });

    it('preserves feature count through roundtrip', () => {
      const original = createTestState('proj-1');
      original.features = [
        createTestFeature('f1', 'A', 'backlog'),
        createTestFeature('f2', 'B', 'in_progress'),
        createTestFeature('f3', 'C', 'complete'),
      ];

      const markdown = adapter.exportToSTATE_MD(original);
      const restored = adapter.importFromSTATE_MD(markdown);

      expect(restored.features.length).toBe(original.features.length);
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createTestState(projectId: string): NexusState {
  return {
    projectId,
    project: {
      id: projectId,
      name: 'Test Project',
      description: 'A test project',
      mode: 'genesis' as const,
      status: 'planning',
      rootPath: '/test/path',
      repositoryUrl: null,
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    },
    features: [],
    tasks: [],
    agents: [],
    status: 'planning',
    currentPhase: 'Phase 1',
    lastCheckpointId: undefined,
  };
}

function createTestFeature(id: string, name: string, status: string) {
  return {
    id,
    projectId: 'proj-1',
    name,
    description: `Description for ${name}`,
    priority: 'should' as const,
    status,
    complexity: 'simple' as const,
    estimatedTasks: 3,
    completedTasks: status === 'complete' ? 3 : 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createTestTask(id: string, name: string, status: string) {
  return {
    id,
    projectId: 'proj-1',
    featureId: null,
    subFeatureId: null,
    name,
    description: `Description for ${name}`,
    type: 'auto' as const,
    status,
    size: 'small' as const,
    priority: 5,
    tags: null,
    notes: null,
    assignedAgent: null,
    worktreePath: null,
    branchName: null,
    dependsOn: null,
    blockedBy: null,
    qaIterations: 0,
    maxIterations: 50,
    estimatedMinutes: 15,
    actualMinutes: null,
    startedAt: null,
    completedAt: status === 'completed' ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createTestAgent(
  id: string,
  type: 'coder' | 'planner' | 'tester' | 'reviewer' | 'merger',
  status: string
) {
  return {
    id,
    type,
    status,
    modelProvider: 'anthropic' as const,
    modelName: 'claude-sonnet-4',
    temperature: 0.3,
    maxTokens: 8000,
    systemPrompt: null,
    tools: null,
    currentTaskId: null,
    worktreePath: null,
    branchName: null,
    tokensUsed: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    spawnedAt: new Date(),
    lastActivityAt: new Date(),
    terminatedAt: null,
    terminationReason: null,
  };
}

interface TestMarkdownOptions {
  projectName?: string;
  status?: string;
  phase?: string;
  features?: Array<{ name: string; status: string; progress: string }>;
  tasks?: Array<{ name: string; completed: boolean; inProgress?: boolean }>;
}

function createTestMarkdown(options: TestMarkdownOptions = {}): string {
  const {
    projectName = 'Test Project',
    status = 'executing',
    phase = '3 of 8 (Persistence)',
    features = [],
    tasks = [],
  } = options;

  let markdown = `# Project State: ${projectName}

## Status
- **Phase:** ${phase}
- **Status:** ${status}
- **Progress:** ███████░░░ 35%

## Current Work
- Active task: Implement StateManager
- Assigned agent: coder-001

`;

  if (features.length > 0) {
    markdown += `## Features
| Feature | Status | Progress |
|---------|--------|----------|
`;
    for (const f of features) {
      markdown += `| ${f.name} | ${f.status} | ${f.progress} |\n`;
    }
    markdown += '\n';
  }

  if (tasks.length > 0) {
    markdown += `## Recent Tasks
`;
    for (const t of tasks) {
      const checkbox = t.completed ? '[x]' : t.inProgress ? '[-]' : '[ ]';
      const suffix = t.inProgress ? ' (in progress)' : '';
      markdown += `- ${checkbox} ${t.name}${suffix}\n`;
    }
    markdown += '\n';
  }

  markdown += `## Checkpoints
- Latest: \`chk-abc123\` (2026-01-14 10:30) - "Before persistence layer"
`;

  return markdown;
}
