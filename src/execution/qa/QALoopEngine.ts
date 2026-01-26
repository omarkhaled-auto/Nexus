/**
 * QALoopEngine - Adapter that wraps QARunner to provide the run() interface
 * expected by NexusCoordinator.
 *
 * This bridges the gap between:
 * - QARunner (has build, lint, test, review methods)
 * - NexusCoordinator (expects qaEngine.run(task, coder))
 *
 * The engine implements a retry loop where:
 * 1. Run QA steps (build -> lint -> test -> review)
 * 2. If all pass: return success
 * 3. If fail: retry up to maxIterations
 * 4. If max iterations reached: escalate
 *
 * Layer 4: Execution - QA subsystem
 */

import type {
  QARunner,
  BuildResult,
  LintResult,
  TestResult,
  ReviewResult,
} from '../iteration/types';
import type { AgentPool } from '../../orchestration/agents/AgentPool';
import type { Task } from '../../types/task';
import type { RunTaskContext } from '../../orchestration/agents/AgentPool';

// ============================================================================
// Types
// ============================================================================

/**
 * Task structure expected by run()
 */
export interface QALoopTask {
  id: string;
  name: string;
  description: string;
  files: string[];
  worktree?: string;
  /**
   * Path to the user's project folder (NOT Nexus-master).
   * Used to set the working directory for Claude CLI calls
   * so generated files go to the correct location.
   */
  projectPath?: string;
}

/**
 * Result returned by run()
 */
export interface QALoopResult {
  success: boolean;
  escalated?: boolean;
  reason?: string;
  iterations: number;
  lastBuild?: BuildResult;
  lastLint?: LintResult;
  lastTest?: TestResult;
  lastReview?: ReviewResult;
}

/**
 * Configuration for QALoopEngine
 */
export interface QALoopEngineConfig {
  /** QARunner with build/lint/test/review methods */
  qaRunner: QARunner;
  /** Maximum iterations before escalation (default: 50) */
  maxIterations?: number;
  /** Whether to stop on first failure or continue to collect all errors */
  stopOnFirstFailure?: boolean;
  /** Working directory for QA operations */
  workingDir?: string;
  /** AgentPool for code generation/fixing (optional, enables coder agent calls) */
  agentPool?: AgentPool;
}

// ============================================================================
// QALoopEngine Class
// ============================================================================

/**
 * QALoopEngine - Provides the run() interface for NexusCoordinator
 *
 * This is an adapter that wraps QARunner to provide the interface that
 * NexusCoordinator expects. It handles the retry loop logic internally.
 *
 * @example
 * ```typescript
 * const qaRunner = QARunnerFactory.create({ workingDir: '/path/to/project' });
 * const qaEngine = new QALoopEngine({ qaRunner, maxIterations: 5 });
 *
 * // Use with NexusCoordinator
 * const result = await qaEngine.run(
 *   { id: 'task-1', name: 'Implement feature', description: '...', files: [] },
 *   coder
 * );
 *
 * if (result.success) {
 *   console.log('QA passed!');
 * } else if (result.escalated) {
 *   console.log('Escalated after max iterations');
 * }
 * ```
 */
export class QALoopEngine {
  private readonly qaRunner: QARunner;
  private readonly maxIterations: number;
  private readonly stopOnFirstFailure: boolean;
  private readonly workingDir?: string;
  private readonly agentPool?: AgentPool;

  constructor(config: QALoopEngineConfig) {
    this.qaRunner = config.qaRunner;
    this.maxIterations = config.maxIterations ?? 50;
    this.stopOnFirstFailure = config.stopOnFirstFailure ?? true;
    this.workingDir = config.workingDir;
    this.agentPool = config.agentPool;
  }

  /**
   * Generate or fix code using the CoderAgent
   *
   * This method calls the CoderAgent to either:
   * - Generate initial code for a task (mode='generate')
   * - Fix errors from build/lint failures (mode='fix')
   *
   * @param task - The task being worked on
   * @param mode - 'generate' for initial code, 'fix' for error fixing
   * @param errors - Error details to fix (only used in 'fix' mode)
   * @returns true if code generation/fix was successful
   */
  private async generateOrFixCode(
    task: QALoopTask,
    mode: 'generate' | 'fix',
    errors?: string[]
  ): Promise<boolean> {
    if (!this.agentPool) {
      console.warn('[QALoopEngine] No agentPool - skipping code generation');
      return false;
    }

    const workingDir = task.projectPath || task.worktree || this.workingDir;
    if (!workingDir) {
      console.error('[QALoopEngine] No working directory for code generation');
      return false;
    }

    // Get or spawn a coder agent
    let coderAgent = this.agentPool.getAvailableByType('coder');
    if (!coderAgent) {
      try {
        coderAgent = this.agentPool.spawn('coder');
      } catch (spawnError) {
        console.error('[QALoopEngine] Failed to spawn coder agent:', spawnError);
        return false;
      }
    }

    // Build context for agent
    const context: RunTaskContext = {
      workingDir,
      relevantFiles: task.files,
      previousAttempts: mode === 'fix' ? errors : undefined,
    };

    // Convert QALoopTask to Task format expected by agent
    const agentTask: Task = {
      id: task.id,
      name: task.name,
      description: mode === 'fix'
        ? `Fix the following errors:\n${errors?.join('\n') ?? 'Unknown errors'}\n\nOriginal task: ${task.description}`
        : task.description,
      type: 'auto',
      status: 'in_progress',
      priority: 'high',
      files: task.files,
      createdAt: new Date(),
    };

    console.log(`[QALoopEngine] Calling CoderAgent to ${mode} code...`);
    console.log(`[QALoopEngine] Working directory: ${workingDir}`);

    try {
      const result = await this.agentPool.runTask(coderAgent, agentTask, context);

      // Release agent after use
      try {
        this.agentPool.release(coderAgent.id);
      } catch {
        // Agent may already be released by runTask
      }

      if (result.success) {
        console.log(`[QALoopEngine] CoderAgent ${mode} succeeded`);
      } else {
        console.log(`[QALoopEngine] CoderAgent ${mode} failed: ${result.error ?? 'unknown'}`);
      }

      return result.success;
    } catch (error) {
      console.error(`[QALoopEngine] CoderAgent ${mode} error:`, error);

      // Release agent on error
      try {
        this.agentPool.release(coderAgent.id);
      } catch {
        // Agent may already be released
      }

      return false;
    }
  }

  /**
   * Run the QA loop on a task
   *
   * This is the main method that NexusCoordinator calls. It:
   * 1. Runs build step (if available)
   * 2. Runs lint step (if available)
   * 3. Runs test step (if available)
   * 4. Runs review step (if available)
   * 5. Returns success if all pass
   * 6. Tracks iterations and escalates if max reached
   *
   * @param task - Task to run QA on
   * @param _coder - Agent that did the coding (currently unused, for future use)
   * @returns QA loop result
   */
  async run(task: QALoopTask, _coder: unknown): Promise<QALoopResult> {
    let iteration = 0;
    let lastBuild: BuildResult | undefined;
    let lastLint: LintResult | undefined;
    let lastTest: TestResult | undefined;
    let lastReview: ReviewResult | undefined;

    // Determine effective working directory: prefer projectPath, then worktree, then default
    const effectiveWorkingDir = task.projectPath || task.worktree || this.workingDir || process.cwd();

    console.log(`[QALoopEngine] Starting QA loop for task ${task.id}: ${task.name}`);
    console.log(`[QALoopEngine] Project path: ${task.projectPath ?? 'NOT PROVIDED'}`);
    console.log(`[QALoopEngine] Worktree: ${task.worktree ?? 'NONE'}`);
    console.log(`[QALoopEngine] Effective working directory: ${effectiveWorkingDir}`);

    // Generate initial code before first iteration (if agentPool available)
    if (this.agentPool) {
      console.log(`[QALoopEngine] Generating initial code for task ${task.id}...`);
      const generated = await this.generateOrFixCode(task, 'generate');
      if (!generated) {
        console.warn(`[QALoopEngine] Initial code generation failed or skipped`);
      }
    } else {
      console.log(`[QALoopEngine] No agentPool - skipping initial code generation`);
    }

    while (iteration < this.maxIterations) {
      iteration++;
      console.log(`[QALoopEngine] Iteration ${iteration}/${this.maxIterations}`);

      let allPassed = true;
      const failureReasons: string[] = [];
      const errorDetails: string[] = []; // Collect errors for CoderAgent fixing

      // 1. Build step
      if (this.qaRunner.build) {
        console.log(`[QALoopEngine] Running build step in ${effectiveWorkingDir}...`);
        try {
          lastBuild = await this.qaRunner.build(task.id, effectiveWorkingDir);
          if (!lastBuild.success) {
            allPassed = false;
            failureReasons.push(`Build failed with ${lastBuild.errors.length} errors`);
            // Collect detailed error messages for CoderAgent
            errorDetails.push(...lastBuild.errors.map(e =>
              typeof e === 'string' ? e : `${e.file ?? 'unknown'}:${e.line ?? 0} - ${e.message}`
            ));
            console.log(`[QALoopEngine] Build failed: ${lastBuild.errors.length} errors`);

            // Call CoderAgent to fix build errors before next iteration
            if (this.agentPool && this.stopOnFirstFailure) {
              console.log(`[QALoopEngine] Calling CoderAgent to fix build errors...`);
              await this.generateOrFixCode(task, 'fix', errorDetails);
            }

            if (this.stopOnFirstFailure) {
              continue; // Try next iteration
            }
          } else {
            console.log(`[QALoopEngine] Build passed`);
          }
        } catch (error) {
          allPassed = false;
          const errorMsg = error instanceof Error ? error.message : String(error);
          failureReasons.push(`Build error: ${errorMsg}`);
          errorDetails.push(`Build execution error: ${errorMsg}`);
          console.error(`[QALoopEngine] Build error:`, error);

          // Call CoderAgent to fix on error too
          if (this.agentPool && this.stopOnFirstFailure) {
            console.log(`[QALoopEngine] Calling CoderAgent to fix build error...`);
            await this.generateOrFixCode(task, 'fix', errorDetails);
          }

          if (this.stopOnFirstFailure) {
            continue;
          }
        }
      }

      // 2. Lint step (only if build passed or stopOnFirstFailure is false)
      if (this.qaRunner.lint && (allPassed || !this.stopOnFirstFailure)) {
        console.log(`[QALoopEngine] Running lint step in ${effectiveWorkingDir}...`);
        try {
          lastLint = await this.qaRunner.lint(task.id, effectiveWorkingDir);
          if (!lastLint.success || lastLint.errors.length > 0) {
            allPassed = false;
            failureReasons.push(`Lint failed with ${lastLint.errors.length} errors`);
            // Collect detailed lint errors for CoderAgent
            errorDetails.push(...lastLint.errors.map(e =>
              typeof e === 'string' ? e : `${e.file ?? 'unknown'}:${e.line ?? 0} - ${e.message}${e.code ? ` (${e.code})` : ''}`
            ));
            console.log(`[QALoopEngine] Lint failed: ${lastLint.errors.length} errors`);

            // Call CoderAgent to fix lint errors before next iteration
            if (this.agentPool && this.stopOnFirstFailure) {
              console.log(`[QALoopEngine] Calling CoderAgent to fix lint errors...`);
              await this.generateOrFixCode(task, 'fix', errorDetails);
            }

            if (this.stopOnFirstFailure) {
              continue;
            }
          } else {
            console.log(`[QALoopEngine] Lint passed`);
          }
        } catch (error) {
          allPassed = false;
          const errorMsg = error instanceof Error ? error.message : String(error);
          failureReasons.push(`Lint error: ${errorMsg}`);
          errorDetails.push(`Lint execution error: ${errorMsg}`);
          console.error(`[QALoopEngine] Lint error:`, error);

          // Call CoderAgent to fix on error too
          if (this.agentPool && this.stopOnFirstFailure) {
            console.log(`[QALoopEngine] Calling CoderAgent to fix lint error...`);
            await this.generateOrFixCode(task, 'fix', errorDetails);
          }

          if (this.stopOnFirstFailure) {
            continue;
          }
        }
      }

      // 3. Test step (only if previous steps passed or stopOnFirstFailure is false)
      if (this.qaRunner.test && (allPassed || !this.stopOnFirstFailure)) {
        console.log(`[QALoopEngine] Running test step in ${effectiveWorkingDir}...`);
        try {
          lastTest = await this.qaRunner.test(task.id, effectiveWorkingDir);
          if (!lastTest.success) {
            allPassed = false;
            failureReasons.push(`Tests failed: ${lastTest.failed}/${lastTest.passed + lastTest.failed} failed`);
            console.log(`[QALoopEngine] Tests failed: ${lastTest.failed} failed, ${lastTest.passed} passed`);
            if (this.stopOnFirstFailure) {
              continue;
            }
          } else {
            console.log(`[QALoopEngine] Tests passed: ${lastTest.passed} tests`);
          }
        } catch (error) {
          allPassed = false;
          failureReasons.push(`Test error: ${error instanceof Error ? error.message : String(error)}`);
          console.error(`[QALoopEngine] Test error:`, error);
          if (this.stopOnFirstFailure) {
            continue;
          }
        }
      }

      // 4. Review step (only if previous steps passed or stopOnFirstFailure is false)
      if (this.qaRunner.review && (allPassed || !this.stopOnFirstFailure)) {
        console.log(`[QALoopEngine] Running review step in ${effectiveWorkingDir}...`);
        try {
          lastReview = await this.qaRunner.review(task.id, effectiveWorkingDir);
          if (!lastReview.approved) {
            allPassed = false;
            failureReasons.push(`Review not approved: ${lastReview.blockers.length} blockers`);
            console.log(`[QALoopEngine] Review not approved: ${lastReview.blockers.join(', ')}`);
            if (this.stopOnFirstFailure) {
              continue;
            }
          } else {
            console.log(`[QALoopEngine] Review approved`);
          }
        } catch (error) {
          allPassed = false;
          failureReasons.push(`Review error: ${error instanceof Error ? error.message : String(error)}`);
          console.error(`[QALoopEngine] Review error:`, error);
          if (this.stopOnFirstFailure) {
            continue;
          }
        }
      }

      // If all steps passed, return success
      if (allPassed) {
        console.log(`[QALoopEngine] All QA steps passed for task ${task.id}`);
        return {
          success: true,
          escalated: false,
          iterations: iteration,
          lastBuild,
          lastLint,
          lastTest,
          lastReview,
        };
      }

      // If we got here, something failed but we might retry
      console.log(`[QALoopEngine] Iteration ${iteration} failed: ${failureReasons.join('; ')}`);
    }

    // Max iterations reached - escalate
    console.log(`[QALoopEngine] Max iterations (${this.maxIterations}) reached for task ${task.id}, escalating`);
    return {
      success: false,
      escalated: true,
      reason: 'Max QA iterations exceeded',
      iterations: iteration,
      lastBuild,
      lastLint,
      lastTest,
      lastReview,
    };
  }

  /**
   * Run a single QA cycle without iteration (for testing/debugging)
   */
  async runOnce(task: QALoopTask): Promise<{
    build?: BuildResult;
    lint?: LintResult;
    test?: TestResult;
    review?: ReviewResult;
    allPassed: boolean;
  }> {
    const results: {
      build?: BuildResult;
      lint?: LintResult;
      test?: TestResult;
      review?: ReviewResult;
      allPassed: boolean;
    } = { allPassed: true };

    if (this.qaRunner.build) {
      results.build = await this.qaRunner.build(task.id);
      if (!results.build.success) {
        results.allPassed = false;
      }
    }

    if (this.qaRunner.lint) {
      results.lint = await this.qaRunner.lint(task.id);
      if (!results.lint.success || results.lint.errors.length > 0) {
        results.allPassed = false;
      }
    }

    if (this.qaRunner.test) {
      results.test = await this.qaRunner.test(task.id);
      if (!results.test.success) {
        results.allPassed = false;
      }
    }

    if (this.qaRunner.review) {
      results.review = await this.qaRunner.review(task.id);
      if (!results.review.approved) {
        results.allPassed = false;
      }
    }

    return results;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a QALoopEngine from a QARunner
 *
 * @param qaRunner - The QARunner to wrap
 * @param options - Additional configuration options
 * @returns Configured QALoopEngine
 */
export function createQALoopEngine(
  qaRunner: QARunner,
  options?: Omit<QALoopEngineConfig, 'qaRunner'>
): QALoopEngine {
  return new QALoopEngine({
    qaRunner,
    ...options,
  });
}
