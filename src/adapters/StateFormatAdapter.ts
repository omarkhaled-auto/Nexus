/**
 * StateFormatAdapter - Convert between internal state and STATE.md format
 *
 * Provides human-readable STATE.md export for debugging and session continuity,
 * and import functionality for restoring state from markdown.
 *
 * @module adapters/StateFormatAdapter
 */

import type {
  NexusState,
  FeatureState,
  TaskState,
} from '../persistence/state/StateManager';

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
    lines.push(`# Project State: ${state.projectName}`);
    lines.push('');

    // Status section (includes ID for lossless roundtrip)
    lines.push('## Status');
    lines.push(`- **ID:** ${state.projectId}`);
    lines.push(`- **Mode:** ${state.mode}`);
    lines.push(`- **Status:** ${state.status}`);
    lines.push(`- **Progress:** ${this.generateProgressBar(state)}`);
    lines.push('');

    // Current work section
    lines.push('## Current Work');
    const currentFeature = state.features.at(state.currentFeatureIndex);
    if (currentFeature) {
      lines.push(`- Current feature: ${currentFeature.name}`);
      const activeTask = currentFeature.tasks.find(
        (t) => t.status === 'in_progress'
      );
      if (activeTask) {
        lines.push(`- Active task: ${activeTask.name}`);
      } else {
        lines.push('- No active task');
      }
    } else {
      lines.push('- No current feature');
    }
    lines.push(`- Completed: ${state.completedTasks}/${state.totalTasks} tasks`);
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

    // Recent tasks section (from current feature)
    if (currentFeature && currentFeature.tasks.length > 0) {
      const recentTasks = currentFeature.tasks.slice(-10);
      lines.push('## Recent Tasks');
      for (const task of recentTasks) {
        const checkbox = this.getTaskCheckbox(task);
        const suffix = task.status === 'in_progress' ? ' (in progress)' : '';
        lines.push(`- ${checkbox} ${task.name}${suffix}`);
      }
      lines.push('');
    }

    // Metadata section
    if (state.metadata) {
      lines.push('## Metadata');
      for (const [key, value] of Object.entries(state.metadata)) {
        lines.push(`- ${key}: ${JSON.stringify(value)}`);
      }
      lines.push('');
    }

    // Timestamps section
    lines.push('## Timestamps');
    lines.push(`- Created: ${state.createdAt.toISOString()}`);
    lines.push(`- Last Updated: ${state.lastUpdatedAt.toISOString()}`);
    lines.push('');

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

    // Parse project ID (for lossless roundtrip)
    const idMatch = normalizedContent.match(/\*\*ID:\*\*\s*(\S+)/);
    const parsedProjectId = idMatch?.[1]?.trim();

    // Parse mode
    const modeMatch = normalizedContent.match(/\*\*Mode:\*\*\s*(\w+)/);
    const rawMode = modeMatch?.[1]?.trim();
    const mode = (rawMode ?? 'genesis') as NexusState['mode'];

    // Parse status section
    const statusMatch = normalizedContent.match(/\*\*Status:\*\*\s*(\w+)/);
    if (!statusMatch) {
      errors.push('Missing status in Status section');
    }
    const rawStatus = statusMatch?.[1]?.trim();
    const status = (rawStatus ?? 'initializing') as NexusState['status'];

    // Validate required sections
    if (errors.length > 0) {
      throw new StateValidationError(errors);
    }

    // Parse features table
    const features = this.parseFeaturesTable(normalizedContent);

    // Use parsed ID if available, otherwise generate from name (backwards compatibility)
    const projectId = parsedProjectId ?? this.generateProjectId(projectName);

    // Calculate totals
    let totalTasks = 0;
    let completedTasks = 0;
    for (const feature of features) {
      totalTasks += feature.totalTasks;
      completedTasks += feature.completedTasks;
    }

    // Build NexusState
    const now = new Date();
    return {
      projectId,
      projectName,
      status,
      mode,
      features,
      currentFeatureIndex: 0,
      currentTaskIndex: 0,
      completedTasks,
      totalTasks,
      lastUpdatedAt: now,
      createdAt: now,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateProgressBar(state: NexusState): string {
    // Calculate progress based on tasks
    const total = state.totalTasks;
    const completed = state.completedTasks;

    if (total === 0) {
      return '░░░░░░░░░░ 0%';
    }

    const percentage = Math.round((completed / total) * 100);
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    return `${bar} ${String(percentage)}%`;
  }

  private calculateFeatureProgress(feature: FeatureState): string {
    if (feature.status === 'completed') {
      return '100%';
    }
    if (feature.totalTasks === 0) {
      return '0%';
    }
    const percentage = Math.round(
      (feature.completedTasks / feature.totalTasks) * 100
    );
    return `${String(percentage)}%`;
  }

  private getTaskCheckbox(task: TaskState): string {
    switch (task.status) {
      case 'completed':
        return '[x]';
      case 'in_progress':
        return '[-]';
      default:
        return '[ ]';
    }
  }

  private parseFeaturesTable(content: string): FeatureState[] {
    const features: FeatureState[] = [];

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
      const cols = row
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c);
      if (cols.length >= 2) {
        const name = cols[0] ?? '';
        const status = (cols[1] ?? 'pending') as FeatureState['status'];
        const progressStr = (cols[2] ?? '0').replace('%', '');
        const progress = parseInt(progressStr, 10) || 0;

        // Estimate tasks based on progress
        const estimatedTotal = 10; // Default estimate
        const completedTasks = Math.round((progress / 100) * estimatedTotal);

        features.push({
          id: this.generateProjectId(name),
          name,
          description: '',
          status,
          tasks: [],
          completedTasks,
          totalTasks: estimatedTotal,
        });
      }
    }

    return features;
  }

  private generateProjectId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32);
  }
}

// Export singleton instance
export const stateFormatAdapter = new StateFormatAdapter();
