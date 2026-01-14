/**
 * StateFormatAdapter - Convert between internal state and STATE.md format
 *
 * Provides human-readable STATE.md export for debugging and session continuity,
 * and import functionality for restoring state from markdown.
 */

import type { NexusState } from '../persistence/state/StateManager';
import type { Feature, Task } from '../persistence/database/schema';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when state validation fails during import
 */
export class StateValidationError extends Error {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`State validation failed: ${errors.join(', ')}`);
    this.name = 'StateValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================================================
// StateFormatAdapter Implementation
// ============================================================================

/**
 * StateFormatAdapter converts between NexusState and human-readable STATE.md format.
 *
 * Features:
 * - Export state to readable markdown with progress bars
 * - Import state from markdown (for session restore)
 * - Lossless roundtrip for core fields
 */
export class StateFormatAdapter {
  /**
   * Export NexusState to human-readable STATE.md format.
   *
   * @param state The state to export
   * @returns Markdown string representation
   */
  exportToSTATE_MD(state: NexusState): string {
    const lines: string[] = [];

    // Header with project name
    lines.push(`# Project State: ${state.project.name}`);
    lines.push('');

    // Status section
    lines.push('## Status');
    lines.push(`- **Phase:** ${state.currentPhase ?? 'Not started'}`);
    lines.push(`- **Status:** ${state.status}`);
    lines.push(`- **Progress:** ${this.generateProgressBar(state)}`);
    lines.push('');

    // Current work section
    lines.push('## Current Work');
    const activeTask = state.tasks.find((t) => t.status === 'in_progress');
    if (activeTask) {
      lines.push(`- Active task: ${activeTask.name}`);
      if (activeTask.assignedAgent) {
        lines.push(`- Assigned agent: ${activeTask.assignedAgent}`);
      }
    } else {
      lines.push('- No active task');
    }
    lines.push('');

    // Features section
    if (state.features.length > 0) {
      lines.push('## Features');
      lines.push('| Feature | Status | Progress |');
      lines.push('|---------|--------|----------|');
      for (const feature of state.features) {
        const progress = this.calculateFeatureProgress(feature);
        lines.push(`| ${feature.name} | ${feature.status} | ${progress} |`);
      }
      lines.push('');
    }

    // Recent tasks section
    const recentTasks = state.tasks.slice(-10);
    if (recentTasks.length > 0) {
      lines.push('## Recent Tasks');
      for (const task of recentTasks) {
        const checkbox = this.getTaskCheckbox(task);
        const suffix = task.status === 'in_progress' ? ' (in progress)' : '';
        lines.push(`- ${checkbox} ${task.name}${suffix}`);
      }
      lines.push('');
    }

    // Agents section
    const activeAgents = state.agents.filter(
      (a) => a.status === 'active' || a.status === 'working'
    );
    if (activeAgents.length > 0) {
      lines.push('## Active Agents');
      for (const agent of activeAgents) {
        lines.push(`- ${agent.type} (${agent.id}): ${agent.status}`);
      }
      lines.push('');
    }

    // Checkpoints section
    if (state.lastCheckpointId) {
      lines.push('## Checkpoints');
      lines.push(`- Latest: \`${state.lastCheckpointId}\``);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Import NexusState from STATE.md markdown content.
   *
   * @param content The markdown content to parse
   * @returns Parsed NexusState
   * @throws StateValidationError if required sections are missing
   */
  importFromSTATE_MD(content: string): NexusState {
    const errors: string[] = [];

    // Normalize whitespace
    const normalizedContent = content.replace(/\r\n/g, '\n');

    // Parse project name from header
    const projectMatch = normalizedContent.match(
      /^#\s*Project State:\s*(.+)$/m
    );
    if (!projectMatch) {
      errors.push('Missing project header (# Project State: ...)');
    }
    const projectName = projectMatch?.[1]?.trim() ?? '';

    // Parse status section
    const statusMatch = normalizedContent.match(
      /\*\*Status:\*\*\s*(\w+)/
    );
    if (!statusMatch) {
      errors.push('Missing status in Status section');
    }
    const status = (statusMatch?.[1]?.trim() ?? 'planning') as NexusState['status'];

    // Parse phase
    const phaseMatch = normalizedContent.match(
      /\*\*Phase:\*\*\s*(.+)$/m
    );
    const currentPhase = phaseMatch?.[1]?.trim();

    // Validate required sections
    if (errors.length > 0) {
      throw new StateValidationError(errors);
    }

    // Parse features table
    const features = this.parseFeaturesTable(normalizedContent);

    // Parse tasks list
    const tasks = this.parseTasksList(normalizedContent);

    // Parse checkpoint
    const checkpointMatch = normalizedContent.match(
      /Latest:\s*`([^`]+)`/
    );
    const lastCheckpointId = checkpointMatch?.[1]?.trim();

    // Generate project ID from name
    const projectId = this.generateProjectId(projectName);

    // Build NexusState
    return {
      projectId,
      project: {
        id: projectId,
        name: projectName,
        description: null,
        mode: 'genesis',
        status,
        rootPath: '/imported',
        repositoryUrl: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      },
      features,
      tasks,
      agents: [],
      status,
      currentPhase,
      lastCheckpointId,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateProgressBar(state: NexusState): string {
    // Calculate progress based on features or tasks
    let completed = 0;
    let total = 0;

    if (state.features.length > 0) {
      total = state.features.length;
      completed = state.features.filter((f) => f.status === 'complete').length;
    } else if (state.tasks.length > 0) {
      total = state.tasks.length;
      completed = state.tasks.filter((t) => t.status === 'completed').length;
    }

    if (total === 0) {
      return '░░░░░░░░░░ 0%';
    }

    const percentage = Math.round((completed / total) * 100);
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    return `${bar} ${String(percentage)}%`;
  }

  private calculateFeatureProgress(feature: Feature): string {
    if (feature.status === 'complete') {
      return '100%';
    }
    if (feature.estimatedTasks === 0) {
      return '0%';
    }
    const percentage = Math.round(
      (feature.completedTasks ?? 0) / (feature.estimatedTasks ?? 1) * 100
    );
    return `${String(percentage)}%`;
  }

  private getTaskCheckbox(task: Task): string {
    switch (task.status) {
      case 'completed':
        return '[x]';
      case 'in_progress':
        return '[-]';
      default:
        return '[ ]';
    }
  }

  private parseFeaturesTable(content: string): Feature[] {
    const features: Feature[] = [];

    // Find features table
    const tableMatch = content.match(
      /## Features\n\|[^\n]+\n\|[-|\s]+\n((?:\|[^\n]+\n?)+)/
    );
    if (!tableMatch) {
      return features;
    }

    const tableContent = tableMatch[1];
    if (!tableContent) {
      return features;
    }

    const rows = tableContent.trim().split('\n');
    for (const row of rows) {
      const cols = row.split('|').map((c) => c.trim()).filter((c) => c);
      if (cols.length >= 2) {
        const name = cols[0] ?? '';
        const status = cols[1] ?? 'backlog';
        const progress = (cols[2] ?? '0').replace('%', '');

        features.push({
          id: this.generateProjectId(name),
          projectId: '', // Will be set by caller
          name,
          description: null,
          priority: 'should',
          status,
          complexity: 'simple',
          estimatedTasks: 100,
          completedTasks: parseInt(progress, 10),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return features;
  }

  private parseTasksList(content: string): Task[] {
    const tasks: Task[] = [];

    // Find tasks section
    const tasksMatch = content.match(
      /## Recent Tasks\n((?:-\s*\[[^\]]\][^\n]+\n?)+)/
    );
    if (!tasksMatch) {
      return tasks;
    }

    const tasksContent = tasksMatch[1];
    if (!tasksContent) {
      return tasks;
    }

    const lines = tasksContent.trim().split('\n');
    for (const line of lines) {
      const taskMatch = line.match(
        /-\s*\[([x\s-])\]\s*(.+?)(?:\s*\(in progress\))?$/
      );
      if (taskMatch) {
        const checkmark = taskMatch[1] ?? ' ';
        const name = (taskMatch[2] ?? '').trim();
        let status: string;
        if (checkmark === 'x') {
          status = 'completed';
        } else if (checkmark === '-') {
          status = 'in_progress';
        } else {
          status = 'pending';
        }

        tasks.push({
          id: this.generateProjectId(name),
          projectId: '', // Will be set by caller
          featureId: null,
          subFeatureId: null,
          name,
          description: null,
          type: 'auto',
          status,
          size: 'small',
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
        });
      }
    }

    return tasks;
  }

  private generateProjectId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32);
  }
}
