/**
 * MergerAgent - Agent specialized for merge conflict resolution
 *
 * Phase 14B Task 16: Implements the merger agent that analyzes merge conflicts,
 * proposes resolutions, handles simple merges automatically, and escalates
 * complex conflicts to humans.
 *
 * @module execution/agents
 */

import type { ClaudeClient } from '../../llm/clients/ClaudeClient';
import type { AgentType } from '../../types/agent';
import type { Task } from '../../types/task';
import {
  BaseAgentRunner,
  type AgentConfig,
  type AgentContext,
  type AgentTaskResult,
} from './BaseAgentRunner';

// ============================================================================
// Types
// ============================================================================

/**
 * Severity level for merge conflicts
 */
export type ConflictSeverity = 'simple' | 'moderate' | 'complex' | 'critical';

/**
 * Type of conflict encountered
 */
export type ConflictType =
  | 'content'        // Same lines modified differently
  | 'rename'         // File renamed in different ways
  | 'delete-modify'  // Deleted in one branch, modified in another
  | 'semantic'       // Logic/semantic conflicts (no git conflict markers)
  | 'dependency';    // Package or import dependency conflicts

/**
 * Individual merge conflict
 */
export interface MergeConflict {
  file: string;
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  ourChanges: string;
  theirChanges: string;
  suggestedResolution?: string;
  needsManualReview: boolean;
}

/**
 * Merge resolution strategy
 */
export interface MergeResolution {
  file: string;
  strategy: 'ours' | 'theirs' | 'merge' | 'manual';
  resolvedContent?: string;
  explanation: string;
}

/**
 * Structured merge result
 */
export interface MergeOutput {
  success: boolean;
  conflicts: MergeConflict[];
  resolutions: MergeResolution[];
  unresolvedCount: number;
  summary: string;
  requiresHumanReview: boolean;
}

// ============================================================================
// System Prompt
// ============================================================================

const MERGER_SYSTEM_PROMPT = `You are an expert software engineer specializing in merge conflict resolution. Your job is to analyze merge conflicts, understand the intent of both sets of changes, and propose safe resolutions.

## Analysis Approach

### 1. Understand Context
- Identify what each branch was trying to accomplish
- Look at commit messages and related changes
- Consider the broader feature or fix being implemented

### 2. Conflict Classification
Classify each conflict by type and severity:

**Conflict Types:**
- content: Same lines modified differently
- rename: File renamed in different ways
- delete-modify: Deleted in one branch, modified in another
- semantic: Logic conflicts without git markers
- dependency: Package or import conflicts

**Severity Levels:**
- simple: Straightforward resolution (formatting, imports, non-overlapping logic)
- moderate: Requires careful analysis but clear resolution path
- complex: Multiple valid resolutions, needs deep understanding
- critical: Potential for breaking changes, needs human review

### 3. Resolution Strategies
- **ours**: Keep the current branch's version
- **theirs**: Accept the incoming branch's version
- **merge**: Combine both changes intelligently
- **manual**: Escalate to human for review

## Safety Rules

1. **NEVER** automatically resolve critical conflicts
2. **NEVER** resolve semantic conflicts without thorough analysis
3. **ALWAYS** flag delete-modify conflicts for review
4. **ALWAYS** preserve both sets of tests when merging test files
5. When in doubt, flag for human review

## Output Format
Provide your analysis in JSON format:
\`\`\`json
{
  "success": true/false,
  "conflicts": [
    {
      "file": "path/to/file.ts",
      "type": "content|rename|delete-modify|semantic|dependency",
      "severity": "simple|moderate|complex|critical",
      "description": "Clear description of the conflict",
      "ourChanges": "Summary of our changes",
      "theirChanges": "Summary of their changes",
      "suggestedResolution": "How to resolve this",
      "needsManualReview": true/false
    }
  ],
  "resolutions": [
    {
      "file": "path/to/file.ts",
      "strategy": "ours|theirs|merge|manual",
      "resolvedContent": "The merged content (if applicable)",
      "explanation": "Why this resolution was chosen"
    }
  ],
  "unresolvedCount": 0,
  "summary": "Overall merge analysis summary",
  "requiresHumanReview": true/false
}
\`\`\`

## Process
1. Parse all conflict markers in affected files
2. Classify each conflict by type and severity
3. Analyze the intent of both change sets
4. Propose resolutions for simple/moderate conflicts
5. Flag complex/critical conflicts for human review
6. Verify the merged result makes sense as a whole
7. Include [TASK_COMPLETE] when analysis is done

## Best Practices
- Consider the overall coherence of the merged code
- Check for semantic conflicts even where git didn't flag markers
- Preserve important changes from both branches when possible
- Be conservative - it's better to ask for human review than to break code
- Document your reasoning for each resolution`;

// ============================================================================
// MergerAgent Implementation
// ============================================================================

/**
 * Agent specialized for merge conflict analysis and resolution.
 *
 * Uses Claude to analyze merge conflicts, understand the intent of
 * conflicting changes, and propose safe resolutions while flagging
 * complex conflicts for human review.
 *
 * @example
 * ```typescript
 * const mergerAgent = new MergerAgent(claudeClient);
 * const result = await mergerAgent.execute(task, context);
 * const mergeResult = mergerAgent.parseMergeOutput(result.output);
 * ```
 */
export class MergerAgent extends BaseAgentRunner {
  /**
   * Create a new MergerAgent
   *
   * @param claudeClient - Claude client for LLM interactions
   * @param config - Optional agent configuration
   */
  constructor(claudeClient: ClaudeClient, config?: AgentConfig) {
    super(claudeClient, config);
  }

  /**
   * Get the agent type identifier
   */
  getAgentType(): AgentType {
    return 'merger';
  }

  /**
   * Execute a merge conflict resolution task
   *
   * @param task - The task containing merge conflict information
   * @param context - Execution context with working directory and files
   * @returns Task execution result with merge output
   */
  async execute(task: Task, context: AgentContext): Promise<AgentTaskResult> {
    const prompt = this.buildTaskPrompt(task, context);
    return this.runAgentLoop(task, context, prompt);
  }

  /**
   * Get the system prompt for the merger agent
   */
  protected getSystemPrompt(): string {
    return MERGER_SYSTEM_PROMPT;
  }

  /**
   * Build the task prompt for the LLM
   *
   * @param task - The task containing merge information
   * @param context - Execution context
   * @returns Formatted prompt string
   */
  protected buildTaskPrompt(task: Task, context: AgentContext): string {
    const sections: string[] = [];

    // Task header
    sections.push(`# Merge Conflict Resolution: ${task.name}`);
    sections.push('');

    // Description
    sections.push('## Merge Context');
    sections.push(task.description || 'Resolve merge conflicts between branches.');
    sections.push('');

    // Files with conflicts
    if (task.files && task.files.length > 0) {
      sections.push('## Files with Conflicts');
      task.files.forEach((f) => {
        sections.push(`- ${f}`);
      });
      sections.push('');
    }

    // Merge criteria / acceptance criteria
    if (task.testCriteria && task.testCriteria.length > 0) {
      sections.push('## Merge Requirements');
      task.testCriteria.forEach((c, i) => {
        sections.push(`${i + 1}. ${c}`);
      });
      sections.push('');
    }

    // Dependencies - related tasks that might provide context
    if (task.dependencies && task.dependencies.length > 0) {
      sections.push('## Related Tasks');
      sections.push('These tasks may provide context for the merge:');
      task.dependencies.forEach((d) => {
        sections.push(`- ${d}`);
      });
      sections.push('');
    }

    // Context section
    sections.push(this.buildContextSection(context));
    sections.push('');

    // Merge instructions
    sections.push('## Resolution Instructions');
    sections.push('1. Analyze all conflict markers in the affected files');
    sections.push('2. Classify each conflict by type and severity');
    sections.push('3. Understand the intent of both sets of changes');
    sections.push('4. Propose safe resolutions for simple/moderate conflicts');
    sections.push('5. Flag complex/critical conflicts for human review');
    sections.push('6. Verify the merged result maintains code coherence');
    sections.push('');
    sections.push('Provide your analysis in the JSON format specified in the system prompt.');
    sections.push('When complete, include [TASK_COMPLETE] with your merge summary.');

    return sections.join('\n');
  }

  /**
   * Check if the task is complete based on the LLM response
   *
   * @param response - The LLM response content
   * @param _task - The task being executed (unused but required by interface)
   * @returns True if task is complete
   */
  protected isTaskComplete(response: string, _task: Task): boolean {
    const lowerResponse = response.toLowerCase();

    // Primary completion marker
    if (response.includes('[TASK_COMPLETE]')) {
      return true;
    }

    // Alternative completion phrases for merge
    const completionPhrases = [
      'merge complete',
      'merge analysis complete',
      'conflict resolution complete',
      'resolution complete',
      'merge is complete',
      'finished resolving',
      'conflicts resolved',
    ];

    // Also check for JSON output with success field (indicates analysis is done)
    const hasJsonMerge = response.includes('"success"') && response.includes('"conflicts"');

    return hasJsonMerge || completionPhrases.some((phrase) => lowerResponse.includes(phrase));
  }

  /**
   * Override continuation prompt for merger-specific guidance
   */
  protected getContinuationPrompt(): string {
    return `Please continue with your merge analysis.
If you need to examine more files or conflict details, describe what you're analyzing.
If you have completed the analysis, provide the JSON output and include [TASK_COMPLETE] with:
1. All identified conflicts with classifications
2. Proposed resolutions for each
3. Which conflicts require human review
4. A summary of the merge state`;
  }

  /**
   * Parse the merge output from the LLM response
   *
   * @param output - Raw LLM output containing merge JSON
   * @returns Parsed merge output or null if parsing fails
   */
  parseMergeOutput(output: string | undefined): MergeOutput | null {
    if (!output) {
      return null;
    }

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = output.match(/```json\s*([\s\S]*?)\s*```/) ||
                        output.match(/```\s*([\s\S]*?)\s*```/) ||
                        output.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[1]);

      return {
        success: parsed.success === true,
        conflicts: Array.isArray(parsed.conflicts)
          ? parsed.conflicts.map((c: Partial<MergeConflict>) => ({
              file: c.file || 'unknown',
              type: c.type || 'content',
              severity: c.severity || 'moderate',
              description: c.description || 'No description',
              ourChanges: c.ourChanges || '',
              theirChanges: c.theirChanges || '',
              suggestedResolution: c.suggestedResolution,
              needsManualReview: c.needsManualReview ?? false,
            }))
          : [],
        resolutions: Array.isArray(parsed.resolutions)
          ? parsed.resolutions.map((r: Partial<MergeResolution>) => ({
              file: r.file || 'unknown',
              strategy: r.strategy || 'manual',
              resolvedContent: r.resolvedContent,
              explanation: r.explanation || 'No explanation',
            }))
          : [],
        unresolvedCount: parsed.unresolvedCount ?? 0,
        summary: parsed.summary || 'No summary provided',
        requiresHumanReview: parsed.requiresHumanReview ?? false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the count of conflicts by severity
   *
   * @param conflicts - Array of merge conflicts
   * @returns Object with counts by severity
   */
  getConflictCounts(conflicts: MergeConflict[]): Record<ConflictSeverity, number> {
    const counts: Record<ConflictSeverity, number> = {
      simple: 0,
      moderate: 0,
      complex: 0,
      critical: 0,
    };

    for (const conflict of conflicts) {
      counts[conflict.severity]++;
    }

    return counts;
  }

  /**
   * Get the count of conflicts by type
   *
   * @param conflicts - Array of merge conflicts
   * @returns Object with counts by type
   */
  getConflictsByType(conflicts: MergeConflict[]): Record<ConflictType, number> {
    const counts: Record<ConflictType, number> = {
      content: 0,
      rename: 0,
      'delete-modify': 0,
      semantic: 0,
      dependency: 0,
    };

    for (const conflict of conflicts) {
      counts[conflict.type]++;
    }

    return counts;
  }

  /**
   * Determine if merge can be auto-completed based on conflicts
   *
   * @param conflicts - Array of merge conflicts
   * @returns True if merge can be auto-completed, false if human review needed
   */
  canAutoComplete(conflicts: MergeConflict[]): boolean {
    const counts = this.getConflictCounts(conflicts);

    // Cannot auto-complete if there are critical or complex conflicts
    if (counts.critical > 0 || counts.complex > 0) {
      return false;
    }

    // Cannot auto-complete if any conflict needs manual review
    if (conflicts.some((c) => c.needsManualReview)) {
      return false;
    }

    // Cannot auto-complete delete-modify conflicts
    if (conflicts.some((c) => c.type === 'delete-modify')) {
      return false;
    }

    return true;
  }

  /**
   * Get files that need human review
   *
   * @param conflicts - Array of merge conflicts
   * @returns Array of file paths needing human review
   */
  getFilesNeedingReview(conflicts: MergeConflict[]): string[] {
    return conflicts
      .filter((c) => c.needsManualReview || c.severity === 'critical' || c.severity === 'complex')
      .map((c) => c.file);
  }

  /**
   * Summarize the merge state for human review
   *
   * @param output - Parsed merge output
   * @returns Human-readable summary
   */
  summarizeMerge(output: MergeOutput): string {
    const lines: string[] = [];

    lines.push(`Merge Status: ${output.success ? 'Success' : 'Needs Attention'}`);
    lines.push(`Total Conflicts: ${output.conflicts.length}`);
    lines.push(`Unresolved: ${output.unresolvedCount}`);

    if (output.requiresHumanReview) {
      lines.push('');
      lines.push('HUMAN REVIEW REQUIRED:');
      const reviewFiles = this.getFilesNeedingReview(output.conflicts);
      reviewFiles.forEach((f) => {
        lines.push(`  - ${f}`);
      });
    }

    const counts = this.getConflictCounts(output.conflicts);
    lines.push('');
    lines.push('Conflict Breakdown:');
    lines.push(`  Simple: ${counts.simple}`);
    lines.push(`  Moderate: ${counts.moderate}`);
    lines.push(`  Complex: ${counts.complex}`);
    lines.push(`  Critical: ${counts.critical}`);

    lines.push('');
    lines.push(`Summary: ${output.summary}`);

    return lines.join('\n');
  }
}
