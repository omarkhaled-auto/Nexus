import { describe, it, expect, beforeEach } from 'vitest';
import {
  StateFormatAdapter,
  StateValidationError,
  stateFormatAdapter,
} from './StateFormatAdapter';
import type {
  NexusState,
  FeatureState,
  TaskState,
} from '../persistence/state/StateManager';

describe('StateFormatAdapter', () => {
  let adapter: StateFormatAdapter;

  beforeEach(() => {
    adapter = new StateFormatAdapter();
  });

  describe('exportToSTATE_MD', () => {
    it('should export basic state to markdown', () => {
      const state: NexusState = {
        projectId: 'test-project',
        projectName: 'Test Project',
        status: 'planning',
        mode: 'genesis',
        features: [],
        currentFeatureIndex: 0,
        currentTaskIndex: 0,
        completedTasks: 0,
        totalTasks: 0,
        lastUpdatedAt: new Date('2025-01-20T12:00:00Z'),
        createdAt: new Date('2025-01-20T10:00:00Z'),
      };

      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('# Project State: Test Project');
      expect(markdown).toContain('**ID:** test-project');
      expect(markdown).toContain('**Mode:** genesis');
      expect(markdown).toContain('**Status:** planning');
      expect(markdown).toContain('░░░░░░░░░░ 0%');
    });

    it('should include features table', () => {
      const state: NexusState = {
        projectId: 'test-project',
        projectName: 'Test Project',
        status: 'executing',
        mode: 'genesis',
        features: [
          {
            id: 'feature-1',
            name: 'Authentication',
            description: 'User auth',
            status: 'in_progress',
            tasks: [],
            completedTasks: 5,
            totalTasks: 10,
          },
          {
            id: 'feature-2',
            name: 'Dashboard',
            description: 'Main dashboard',
            status: 'pending',
            tasks: [],
            completedTasks: 0,
            totalTasks: 5,
          },
        ],
        currentFeatureIndex: 0,
        currentTaskIndex: 0,
        completedTasks: 5,
        totalTasks: 15,
        lastUpdatedAt: new Date(),
        createdAt: new Date(),
      };

      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('## Features');
      expect(markdown).toContain('| Authentication | in_progress | 50% |');
      expect(markdown).toContain('| Dashboard | pending | 0% |');
    });

    it('should show progress bar correctly', () => {
      const state: NexusState = {
        projectId: 'test',
        projectName: 'Test',
        status: 'executing',
        mode: 'genesis',
        features: [],
        currentFeatureIndex: 0,
        currentTaskIndex: 0,
        completedTasks: 7,
        totalTasks: 10,
        lastUpdatedAt: new Date(),
        createdAt: new Date(),
      };

      const markdown = adapter.exportToSTATE_MD(state);

      // 70% = 7 filled, 3 empty
      expect(markdown).toContain('███████░░░ 70%');
    });

    it('should include recent tasks section', () => {
      const tasks: TaskState[] = [
        { id: 'task-1', name: 'Setup project', status: 'completed' },
        { id: 'task-2', name: 'Create schema', status: 'completed' },
        { id: 'task-3', name: 'Add auth', status: 'in_progress' },
        { id: 'task-4', name: 'Add tests', status: 'pending' },
      ];

      const state: NexusState = {
        projectId: 'test',
        projectName: 'Test',
        status: 'executing',
        mode: 'genesis',
        features: [
          {
            id: 'f1',
            name: 'Feature 1',
            description: '',
            status: 'in_progress',
            tasks,
            completedTasks: 2,
            totalTasks: 4,
          },
        ],
        currentFeatureIndex: 0,
        currentTaskIndex: 2,
        completedTasks: 2,
        totalTasks: 4,
        lastUpdatedAt: new Date(),
        createdAt: new Date(),
      };

      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('## Recent Tasks');
      expect(markdown).toContain('[x] Setup project');
      expect(markdown).toContain('[x] Create schema');
      expect(markdown).toContain('[-] Add auth (in progress)');
      expect(markdown).toContain('[ ] Add tests');
    });

    it('should include metadata section', () => {
      const state: NexusState = {
        projectId: 'test',
        projectName: 'Test',
        status: 'executing',
        mode: 'genesis',
        features: [],
        currentFeatureIndex: 0,
        currentTaskIndex: 0,
        completedTasks: 0,
        totalTasks: 0,
        lastUpdatedAt: new Date(),
        createdAt: new Date(),
        metadata: {
          version: '1.0.0',
          environment: 'development',
        },
      };

      const markdown = adapter.exportToSTATE_MD(state);

      expect(markdown).toContain('## Metadata');
      expect(markdown).toContain('- version: "1.0.0"');
      expect(markdown).toContain('- environment: "development"');
    });
  });

  describe('importFromSTATE_MD', () => {
    it('should import basic state from markdown', () => {
      const markdown = `# Project State: Test Project

## Status
- **ID:** test-project
- **Mode:** genesis
- **Status:** planning
- **Progress:** ░░░░░░░░░░ 0%

## Current Work
- No current feature
- Completed: 0/0 tasks

## Timestamps
- Created: 2025-01-20T10:00:00.000Z
- Last Updated: 2025-01-20T12:00:00.000Z
`;

      const state = adapter.importFromSTATE_MD(markdown);

      expect(state.projectId).toBe('test-project');
      expect(state.projectName).toBe('Test Project');
      expect(state.mode).toBe('genesis');
      expect(state.status).toBe('planning');
    });

    it('should parse features table', () => {
      const markdown = `# Project State: Test

## Status
- **ID:** test
- **Mode:** genesis
- **Status:** executing
- **Progress:** ██████████ 100%

## Features
| Feature | Status | Progress |
|---------|--------|----------|
| Authentication | completed | 100% |
| Dashboard | in_progress | 50% |

## Timestamps
- Created: 2025-01-20T10:00:00.000Z
- Last Updated: 2025-01-20T12:00:00.000Z
`;

      const state = adapter.importFromSTATE_MD(markdown);

      expect(state.features).toHaveLength(2);
      expect(state.features[0]?.name).toBe('Authentication');
      expect(state.features[0]?.status).toBe('completed');
      expect(state.features[1]?.name).toBe('Dashboard');
      expect(state.features[1]?.status).toBe('in_progress');
    });

    it('should throw StateValidationError for missing header', () => {
      const markdown = `## Status
- **ID:** test
- **Status:** planning
`;

      expect(() => adapter.importFromSTATE_MD(markdown)).toThrow(
        StateValidationError
      );
    });

    it('should throw StateValidationError for missing status', () => {
      const markdown = `# Project State: Test

## Status
- **ID:** test
`;

      expect(() => adapter.importFromSTATE_MD(markdown)).toThrow(
        StateValidationError
      );
    });

    it('should generate project ID from name if not provided', () => {
      const markdown = `# Project State: My Test Project

## Status
- **Mode:** genesis
- **Status:** planning
`;

      const state = adapter.importFromSTATE_MD(markdown);

      expect(state.projectId).toBe('my-test-project');
    });

    it('should handle Windows line endings', () => {
      const markdown = `# Project State: Test\r\n\r\n## Status\r\n- **ID:** test\r\n- **Mode:** genesis\r\n- **Status:** planning\r\n`;

      const state = adapter.importFromSTATE_MD(markdown);

      expect(state.projectName).toBe('Test');
      expect(state.projectId).toBe('test');
    });
  });

  describe('roundtrip', () => {
    it('should preserve core fields through export/import', () => {
      const originalState: NexusState = {
        projectId: 'my-project',
        projectName: 'My Project',
        status: 'executing',
        mode: 'evolution',
        features: [
          {
            id: 'auth',
            name: 'Authentication',
            description: 'Auth feature',
            status: 'completed',
            tasks: [],
            completedTasks: 5,
            totalTasks: 5,
          },
        ],
        currentFeatureIndex: 0,
        currentTaskIndex: 0,
        completedTasks: 5,
        totalTasks: 5,
        lastUpdatedAt: new Date(),
        createdAt: new Date(),
      };

      const markdown = adapter.exportToSTATE_MD(originalState);
      const importedState = adapter.importFromSTATE_MD(markdown);

      expect(importedState.projectId).toBe(originalState.projectId);
      expect(importedState.projectName).toBe(originalState.projectName);
      expect(importedState.status).toBe(originalState.status);
      expect(importedState.mode).toBe(originalState.mode);
      expect(importedState.features).toHaveLength(1);
      expect(importedState.features[0]?.name).toBe('Authentication');
      expect(importedState.features[0]?.status).toBe('completed');
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(stateFormatAdapter).toBeInstanceOf(StateFormatAdapter);
    });
  });

  describe('StateValidationError', () => {
    it('should contain error list', () => {
      const error = new StateValidationError(['Error 1', 'Error 2']);

      expect(error.errors).toEqual(['Error 1', 'Error 2']);
      expect(error.message).toContain('Error 1');
      expect(error.message).toContain('Error 2');
      expect(error.name).toBe('StateValidationError');
    });
  });
});
