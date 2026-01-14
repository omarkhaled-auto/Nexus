// TaskSchemaAdapter Tests
// Hotfix #5 - Issue 1

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskSchemaAdapter } from './TaskSchemaAdapter';
import type { PlanningTask, TaskType } from '../planning/types';

describe('TaskSchemaAdapter', () => {
  let adapter: TaskSchemaAdapter;

  beforeEach(() => {
    adapter = new TaskSchemaAdapter();
  });

  describe('fromGSDPlan', () => {
    it('should parse empty XML to empty array', () => {
      const result = adapter.fromGSDPlan('');
      expect(result).toEqual([]);
    });

    it('should parse single task from XML', () => {
      const xml = `
        <task type="auto">
          <action>Create login endpoint</action>
          <files>src/api/auth/login.ts</files>
          <done>Valid credentials return cookie, invalid return 401</done>
          <verify>curl -X POST localhost:3000/api/auth/login returns 200</verify>
        </task>
      `;

      const tasks = adapter.fromGSDPlan(xml);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].description).toBe('Create login endpoint');
      expect(tasks[0].type).toBe('auto');
      expect(tasks[0].files).toEqual(['src/api/auth/login.ts']);
    });

    it('should parse multiple tasks from XML', () => {
      const xml = `
        <task type="auto">
          <action>Task 1</action>
          <files>file1.ts</files>
        </task>
        <task type="auto">
          <action>Task 2</action>
          <files>file2.ts</files>
        </task>
        <task type="auto">
          <action>Task 3</action>
          <files>file3.ts</files>
        </task>
      `;

      const tasks = adapter.fromGSDPlan(xml);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].description).toBe('Task 1');
      expect(tasks[1].description).toBe('Task 2');
      expect(tasks[2].description).toBe('Task 3');
    });

    it('should handle tdd="true" attribute', () => {
      const xml = `
        <task type="auto" tdd="true">
          <action>Create user model with TDD</action>
          <files>src/models/User.ts</files>
          <done>User model validates email format</done>
        </task>
      `;

      const tasks = adapter.fromGSDPlan(xml);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].type).toBe('tdd');
    });

    it('should parse checkpoint task', () => {
      const xml = `
        <task type="checkpoint:human-verify" gate="blocking">
          <action>Verify deployment works</action>
          <done>Site loads at https://example.com</done>
        </task>
      `;

      const tasks = adapter.fromGSDPlan(xml);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].type).toBe('checkpoint');
    });

    it('should handle comma-separated files', () => {
      const xml = `
        <task type="auto">
          <action>Refactor services</action>
          <files>src/services/auth.ts, src/services/user.ts, src/services/api.ts</files>
        </task>
      `;

      const tasks = adapter.fromGSDPlan(xml);

      expect(tasks[0].files).toEqual([
        'src/services/auth.ts',
        'src/services/user.ts',
        'src/services/api.ts',
      ]);
    });

    it('should skip malformed tasks', () => {
      const xml = `
        <task type="auto">
          <action>Valid task</action>
        </task>
        <task>
          incomplete
        <task type="auto">
          <action>Another valid task</action>
        </task>
      `;

      const tasks = adapter.fromGSDPlan(xml);

      expect(tasks).toHaveLength(2);
    });
  });

  describe('toGSDPlan', () => {
    it('should convert empty array to empty tasks element', () => {
      const result = adapter.toGSDPlan([]);
      expect(result).toBe('<tasks>\n</tasks>');
    });

    it('should convert planning task to XML', () => {
      const tasks: PlanningTask[] = [
        {
          id: 'task-1',
          name: 'Create endpoint',
          description: 'Create login endpoint',
          type: 'auto',
          size: 'atomic',
          estimatedMinutes: 15,
          dependsOn: [],
          files: ['src/api/auth.ts'],
          testCriteria: ['Returns 200 on success'],
        },
      ];

      const xml = adapter.toGSDPlan(tasks);

      expect(xml).toContain('<task type="auto">');
      expect(xml).toContain('<action>Create login endpoint</action>');
      expect(xml).toContain('<files>src/api/auth.ts</files>');
      expect(xml).toContain('<done>Returns 200 on success</done>');
    });

    it('should include tdd attribute for TDD tasks', () => {
      const tasks: PlanningTask[] = [
        {
          id: 'task-1',
          name: 'TDD Task',
          description: 'Create with TDD',
          type: 'tdd',
          size: 'small',
          estimatedMinutes: 25,
          dependsOn: [],
        },
      ];

      const xml = adapter.toGSDPlan(tasks);

      expect(xml).toContain('tdd="true"');
    });

    it('should escape XML special characters', () => {
      const tasks: PlanningTask[] = [
        {
          id: 'task-1',
          name: 'Special chars',
          description: 'Handle <special> & "chars"',
          type: 'auto',
          size: 'atomic',
          estimatedMinutes: 10,
          dependsOn: [],
        },
      ];

      const xml = adapter.toGSDPlan(tasks);

      expect(xml).toContain('&lt;special&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;chars&quot;');
    });
  });

  describe('parseGSDTask', () => {
    it('should parse complete task element', () => {
      const taskElement = `
        <task type="auto" tdd="true">
          <action>Create user service</action>
          <files>src/services/user.ts</files>
          <done>User service has CRUD methods</done>
          <verify>All tests pass</verify>
        </task>
      `;

      const gsdTask = adapter.parseGSDTask(taskElement);

      expect(gsdTask.type).toBe('auto');
      expect(gsdTask.tdd).toBe(true);
      expect(gsdTask.action).toBe('Create user service');
      expect(gsdTask.files).toEqual(['src/services/user.ts']);
      expect(gsdTask.done).toBe('User service has CRUD methods');
      expect(gsdTask.verify).toBe('All tests pass');
    });

    it('should handle missing optional elements', () => {
      const taskElement = `
        <task type="auto">
          <action>Simple task</action>
        </task>
      `;

      const gsdTask = adapter.parseGSDTask(taskElement);

      expect(gsdTask.type).toBe('auto');
      expect(gsdTask.tdd).toBe(false);
      expect(gsdTask.action).toBe('Simple task');
      expect(gsdTask.files).toEqual([]);
      expect(gsdTask.done).toBe('');
      expect(gsdTask.verify).toBe('');
    });

    it('should throw on empty task element', () => {
      expect(() => adapter.parseGSDTask('')).toThrow('Empty task element');
    });

    it('should decode XML entities', () => {
      const taskElement = `
        <task type="auto">
          <action>Handle &lt;code&gt; &amp; &quot;strings&quot;</action>
        </task>
      `;

      const gsdTask = adapter.parseGSDTask(taskElement);

      expect(gsdTask.action).toBe('Handle <code> & "strings"');
    });
  });

  describe('validateTask', () => {
    it('should validate correct task', () => {
      const task: PlanningTask = {
        id: 'task-1',
        name: 'Valid task',
        description: 'A valid description',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 15,
        dependsOn: [],
      };

      const result = adapter.validateTask(task);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for task without id', () => {
      const task: PlanningTask = {
        id: '',
        name: 'Task',
        description: 'Description',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 15,
        dependsOn: [],
      };

      const result = adapter.validateTask(task);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Task must have an id');
    });

    it('should fail validation for task exceeding 30 minutes', () => {
      const task: PlanningTask = {
        id: 'task-1',
        name: 'Long task',
        description: 'A very long task',
        type: 'auto',
        size: 'small',
        estimatedMinutes: 45,
        dependsOn: [],
      };

      const result = adapter.validateTask(task);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds 30-minute limit'))).toBe(true);
    });

    it('should warn for task under 5 minutes', () => {
      const task: PlanningTask = {
        id: 'task-1',
        name: 'Tiny task',
        description: 'A tiny task',
        type: 'auto',
        size: 'atomic',
        estimatedMinutes: 3,
        dependsOn: [],
      };

      const result = adapter.validateTask(task);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('very small'))).toBe(true);
    });

    it('should warn for TDD task without test criteria', () => {
      const task: PlanningTask = {
        id: 'task-1',
        name: 'TDD task',
        description: 'A TDD task',
        type: 'tdd',
        size: 'small',
        estimatedMinutes: 25,
        dependsOn: [],
        testCriteria: [],
      };

      const result = adapter.validateTask(task);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('TDD task should have test criteria'))).toBe(true);
    });

    it('should fail for invalid task type', () => {
      const task = {
        id: 'task-1',
        name: 'Invalid type',
        description: 'Description',
        type: 'invalid' as TaskType,
        size: 'atomic' as const,
        estimatedMinutes: 15,
        dependsOn: [],
      };

      const result = adapter.validateTask(task);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid task type'))).toBe(true);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve task data through XML round-trip', () => {
      const originalTasks: PlanningTask[] = [
        {
          id: 'task-1',
          name: 'Create API',
          description: 'Create REST API endpoint',
          type: 'auto',
          size: 'atomic',
          estimatedMinutes: 15,
          dependsOn: [],
          files: ['src/api/endpoint.ts'],
          testCriteria: ['Endpoint returns 200'],
        },
      ];

      // Convert to XML
      const xml = adapter.toGSDPlan(originalTasks);

      // Convert back to tasks
      const parsedTasks = adapter.fromGSDPlan(xml);

      expect(parsedTasks).toHaveLength(1);
      expect(parsedTasks[0].description).toBe(originalTasks[0].description);
      expect(parsedTasks[0].type).toBe(originalTasks[0].type);
      expect(parsedTasks[0].files).toEqual(originalTasks[0].files);
    });
  });
});
