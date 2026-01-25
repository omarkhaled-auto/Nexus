/**
 * E2E Test: Build a Todo App via Nexus Backend
 *
 * This test validates the complete Nexus workflow by building a simple
 * todo app programmatically:
 *
 * 1. Initialize Nexus (NexusBootstrap)
 * 2. Create project in database
 * 3. Run programmatic interview with predefined messages
 * 4. Wait for planning to complete
 * 5. Start execution
 * 6. Monitor until completion
 * 7. Verify output
 *
 * Usage: npx tsx tests/e2e/run-e2e.ts
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir, access, rm } from 'fs/promises';
import { EventBus, getEventBus } from '../../src/orchestration/events/EventBus';
import type { TestBootstrappedNexus } from './test-bootstrap';
import type { OrchestrationTask } from '../../src/orchestration/types';
import type { InterviewSession } from '../../src/interview/InterviewEngine';
import interviewConfig from './interview-messages.json';

// ============================================================================
// Configuration
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TODO_APP_PATH = join(__dirname, '../../todo-app');
const DATA_DIR = join(__dirname, '../../.nexus-e2e-data');
const INTERVIEW_MESSAGES = interviewConfig.messages;

// Timeouts
const PLANNING_TIMEOUT_MS = 120_000; // 2 minutes
const EXECUTION_TIMEOUT_MS = 1_800_000; // 30 minutes (13+ tasks × ~2min each)
const MESSAGE_DELAY_MS = 500;

// ============================================================================
// Types
// ============================================================================

interface E2ETestResult {
  success: boolean;
  phases: {
    setup: PhaseResult;
    projectCreation: PhaseResult;
    interview: PhaseResult;
    planning: PhaseResult;
    execution: PhaseResult;
    verification: PhaseResult;
  };
  metrics: {
    totalDurationMs: number;
    requirementsCaptured: number;
    tasksCreated: number;
    tasksCompleted: number;
    tasksFailed: number;
  };
  errors: string[];
}

interface PhaseResult {
  name: string;
  success: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Delay execution for specified milliseconds
 */
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for an event with timeout
 */
async function waitForEvent(
  eventBus: EventBus,
  eventType: string,
  timeoutMs: number,
  filter?: (payload: unknown) => boolean
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsub();
      reject(new Error(`Timeout waiting for ${eventType} after ${timeoutMs}ms`));
    }, timeoutMs);

    const unsub = eventBus.onAny((event) => {
      if (event.type === eventType) {
        if (!filter || filter(event.payload)) {
          clearTimeout(timeout);
          unsub();
          resolve(event.payload);
        }
      }
    });
  });
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a phase result
 */
function phaseResult(
  name: string,
  success: boolean,
  durationMs: number,
  details?: string,
  error?: string
): PhaseResult {
  return { name, success, durationMs, details, error };
}

// ============================================================================
// E2E Test Implementation
// ============================================================================

/**
 * Main E2E test runner
 */
export async function runTodoAppE2E(): Promise<E2ETestResult> {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║             NEXUS E2E TEST: TODO APP BUILD                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const errors: string[] = [];
  const result: E2ETestResult = {
    success: false,
    phases: {
      setup: phaseResult('Setup', false, 0),
      projectCreation: phaseResult('Project Creation', false, 0),
      interview: phaseResult('Interview', false, 0),
      planning: phaseResult('Planning', false, 0),
      execution: phaseResult('Execution', false, 0),
      verification: phaseResult('Verification', false, 0),
    },
    metrics: {
      totalDurationMs: 0,
      requirementsCaptured: 0,
      tasksCreated: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
    },
    errors,
  };

  let nexus: TestBootstrappedNexus | null = null;
  let projectId: string | null = null;
  let sessionId: string | null = null;
  let eventBus: EventBus | null = null;

  // Track events for metrics
  let requirementsCaptured = 0;
  let tasksCreated = 0;
  let tasksCompleted = 0;
  let tasksFailed = 0;

  try {
    // =========================================================================
    // Phase 1: Setup
    // =========================================================================
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ Phase 1: Setup                                                  │');
    console.log('└─────────────────────────────────────────────────────────────────┘');

    const setupStart = Date.now();

    // Clean up existing todo-app directory if it exists
    if (await fileExists(TODO_APP_PATH)) {
      console.log('  → Cleaning up existing todo-app directory...');
      await rm(TODO_APP_PATH, { recursive: true, force: true });
    }

    // Create todo-app directory
    console.log('  → Creating todo-app directory...');
    await mkdir(TODO_APP_PATH, { recursive: true });

    // Initialize a fresh git repo so todo-app doesn't inherit Nexus's context
    console.log('  → Initializing fresh git repo in todo-app...');
    const { execSync } = await import('child_process');
    execSync('git init', { cwd: TODO_APP_PATH, stdio: 'pipe' });
    execSync('git config user.email "test@nexus.dev"', { cwd: TODO_APP_PATH, stdio: 'pipe' });
    execSync('git config user.name "Nexus E2E Test"', { cwd: TODO_APP_PATH, stdio: 'pipe' });

    // Create data directory
    console.log('  → Creating data directory...');
    await mkdir(DATA_DIR, { recursive: true });

    // Initialize Nexus using test bootstrap (works outside Electron)
    console.log('  → Initializing Nexus backend...');

    const { initializeTestNexus } = await import('./test-bootstrap');

    // Create config (uses environment variables or defaults)
    nexus = await initializeTestNexus({
      workingDir: TODO_APP_PATH,
      dataDir: DATA_DIR,
      apiKeys: {
        anthropic: process.env.ANTHROPIC_API_KEY,
        google: process.env.GOOGLE_AI_API_KEY,
        openai: process.env.OPENAI_API_KEY,
      },
      useCli: {
        claude: process.env.USE_CLAUDE_CLI === 'true',
        gemini: process.env.USE_GEMINI_CLI === 'true',
      },
    });
    eventBus = nexus.eventBus;

    // Set up event tracking
    eventBus.onAny((event) => {
      if (event.type === 'interview:requirement-captured') {
        requirementsCaptured++;
      } else if (event.type === 'task:created') {
        tasksCreated++;
      } else if (event.type === 'task:completed') {
        tasksCompleted++;
      } else if (event.type === 'task:failed') {
        tasksFailed++;
      }
    });

    result.phases.setup = phaseResult(
      'Setup',
      true,
      Date.now() - setupStart,
      `Nexus initialized, todo-app directory created at ${TODO_APP_PATH}`
    );
    console.log(`  ✓ Setup complete (${result.phases.setup.durationMs}ms)\n`);

    // =========================================================================
    // Phase 2: Project Creation
    // =========================================================================
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ Phase 2: Project Creation                                       │');
    console.log('└─────────────────────────────────────────────────────────────────┘');

    const projectStart = Date.now();

    // Create project in database
    projectId = `e2e-todo-${Date.now()}`;
    const now = new Date();

    console.log(`  → Creating project: ${projectId}`);

    // Use direct database access via the exposed databaseClient
    const { projects } = await import('../../src/persistence/database/schema');
    nexus.databaseClient.db.insert(projects).values({
      id: projectId,
      name: 'Monday-Style Todo App',
      description: 'A simple todo app with Monday.com-inspired design',
      mode: 'genesis',
      status: 'planning',
      rootPath: TODO_APP_PATH,
      createdAt: now,
      updatedAt: now,
    }).run();

    console.log(`  → Project created: ${projectId}`);

    result.phases.projectCreation = phaseResult(
      'Project Creation',
      true,
      Date.now() - projectStart,
      `Project ${projectId} created in database`
    );
    console.log(`  ✓ Project creation complete (${result.phases.projectCreation.durationMs}ms)\n`);

    // =========================================================================
    // Phase 3: Interview
    // =========================================================================
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ Phase 3: Programmatic Interview                                 │');
    console.log('└─────────────────────────────────────────────────────────────────┘');

    const interviewStart = Date.now();

    // Start interview session
    console.log('  → Starting interview session...');
    const session = nexus.interviewEngine.startSession(projectId, {
      mode: 'genesis',
    });
    sessionId = session.id;
    console.log(`  → Session started: ${sessionId}`);

    // Send interview messages
    console.log('  → Conducting interview...');
    for (let i = 0; i < INTERVIEW_MESSAGES.length; i++) {
      const message = INTERVIEW_MESSAGES[i];
      const preview = message.substring(0, 60).replace(/\n/g, ' ');
      console.log(`     [${i + 1}/${INTERVIEW_MESSAGES.length}] "${preview}..."`);

      try {
        const response = await nexus.interviewEngine.processMessage(sessionId, message);
        console.log(`         → Response received (${response.extractedRequirements.length} requirements extracted)`);
      } catch (err) {
        console.warn(`         ⚠ Message processing error: ${err}`);
      }

      // Small delay between messages
      await delay(MESSAGE_DELAY_MS);
    }

    // End interview session (triggers planning)
    console.log('  → Completing interview (triggers planning)...');
    nexus.interviewEngine.endSession(sessionId);

    result.phases.interview = phaseResult(
      'Interview',
      true,
      Date.now() - interviewStart,
      `Sent ${INTERVIEW_MESSAGES.length} messages, captured ${requirementsCaptured} requirements`
    );
    console.log(`  ✓ Interview complete (${result.phases.interview.durationMs}ms)\n`);

    // =========================================================================
    // Phase 4: Planning
    // =========================================================================
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ Phase 4: Waiting for Planning                                   │');
    console.log('└─────────────────────────────────────────────────────────────────┘');

    const planningStart = Date.now();

    console.log('  → Waiting for planning:completed event...');

    try {
      // Wait for planning to complete
      const planningResult = await waitForEvent(
        eventBus,
        'planning:completed',
        PLANNING_TIMEOUT_MS,
        (payload: unknown) => {
          const p = payload as { projectId?: string };
          return p.projectId === projectId;
        }
      );

      const pr = planningResult as { taskCount?: number; featureCount?: number };
      tasksCreated = pr.taskCount || 0;

      console.log(`  → Planning completed: ${tasksCreated} tasks, ${pr.featureCount || 0} features`);

      result.phases.planning = phaseResult(
        'Planning',
        true,
        Date.now() - planningStart,
        `Created ${tasksCreated} tasks from ${requirementsCaptured} requirements`
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      result.phases.planning = phaseResult(
        'Planning',
        false,
        Date.now() - planningStart,
        undefined,
        errorMsg
      );
      errors.push(`Planning failed: ${errorMsg}`);
      throw err;
    }

    console.log(`  ✓ Planning complete (${result.phases.planning.durationMs}ms)\n`);

    // =========================================================================
    // Phase 5: Execution
    // =========================================================================
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ Phase 5: Execution                                              │');
    console.log('└─────────────────────────────────────────────────────────────────┘');

    const executionStart = Date.now();

    // Get tasks from database
    console.log('  → Loading tasks from database...');
    const { tasks } = await import('../../src/persistence/database/schema');
    const { eq } = await import('drizzle-orm');
    const projectTasks = nexus.databaseClient.db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .all() as Array<{
        id: string;
        name: string;
        description: string | null;
        type: 'auto' | 'checkpoint' | 'tdd' | null;
        status: string;
        priority: number;
        dependsOn: string | null;
        estimatedMinutes: number | null;
        createdAt: Date;
        updatedAt: Date;
      }>;

    console.log(`  → Found ${projectTasks.length} tasks`);

    // Convert to OrchestrationTask format
    const orchestrationTasks: OrchestrationTask[] = projectTasks.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      type: t.type || 'auto',
      status: t.status as OrchestrationTask['status'],
      priority: t.priority,
      dependsOn: t.dependsOn ? JSON.parse(t.dependsOn) : [],
      estimatedMinutes: t.estimatedMinutes || 15,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    // Start execution
    console.log('  → Starting execution...');

    // Record start time for metrics
    nexus.recordExecutionStart(projectId);

    // Execute tasks
    nexus.nexus.coordinator.executeExistingTasks(
      projectId,
      orchestrationTasks,
      TODO_APP_PATH
    );

    // Monitor execution progress
    console.log('  → Monitoring execution...');

    const progressUnsub = eventBus.onAny((event) => {
      if (event.type === 'task:completed') {
        const p = event.payload as { taskId?: string };
        console.log(`     ✓ Task completed: ${p.taskId}`);
      } else if (event.type === 'task:failed') {
        const p = event.payload as { taskId?: string; error?: string };
        console.log(`     ✗ Task failed: ${p.taskId} - ${p.error}`);
      } else if (event.type === 'task:started') {
        const p = event.payload as { taskId?: string };
        console.log(`     → Task started: ${p.taskId}`);
      }
    });

    try {
      // Wait for project completion
      const executionResult = await waitForEvent(
        eventBus,
        'project:completed',
        EXECUTION_TIMEOUT_MS,
        (payload: unknown) => {
          const p = payload as { projectId?: string };
          return p.projectId === projectId;
        }
      );

      progressUnsub();

      const er = executionResult as { metrics?: { tasksCompleted?: number; tasksFailed?: number } };
      tasksCompleted = er.metrics?.tasksCompleted || 0;
      tasksFailed = er.metrics?.tasksFailed || 0;

      result.phases.execution = phaseResult(
        'Execution',
        tasksFailed === 0,
        Date.now() - executionStart,
        `Completed ${tasksCompleted}/${tasksCreated} tasks, ${tasksFailed} failed`
      );
    } catch (err) {
      progressUnsub();
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Check if it was a timeout vs actual failure
      if (errorMsg.includes('Timeout')) {
        result.phases.execution = phaseResult(
          'Execution',
          false,
          Date.now() - executionStart,
          `Timeout after ${EXECUTION_TIMEOUT_MS}ms`,
          errorMsg
        );
      } else {
        result.phases.execution = phaseResult(
          'Execution',
          false,
          Date.now() - executionStart,
          undefined,
          errorMsg
        );
      }
      errors.push(`Execution failed: ${errorMsg}`);
      throw err;
    }

    console.log(`  ✓ Execution complete (${result.phases.execution.durationMs}ms)\n`);

    // =========================================================================
    // Phase 6: Verification
    // =========================================================================
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ Phase 6: Output Verification                                    │');
    console.log('└─────────────────────────────────────────────────────────────────┘');

    const verifyStart = Date.now();

    console.log('  → Verifying generated files...');

    const expectedFiles = interviewConfig.expectedFiles;
    const missingFiles: string[] = [];
    const foundFiles: string[] = [];

    for (const file of expectedFiles) {
      const filePath = join(TODO_APP_PATH, file);
      if (await fileExists(filePath)) {
        foundFiles.push(file);
        console.log(`     ✓ ${file}`);
      } else {
        missingFiles.push(file);
        console.log(`     ✗ ${file} (missing)`);
      }
    }

    const verificationSuccess = missingFiles.length === 0;

    result.phases.verification = phaseResult(
      'Verification',
      verificationSuccess,
      Date.now() - verifyStart,
      `Found ${foundFiles.length}/${expectedFiles.length} expected files`,
      verificationSuccess ? undefined : `Missing files: ${missingFiles.join(', ')}`
    );

    if (!verificationSuccess) {
      errors.push(`Missing files: ${missingFiles.join(', ')}`);
    }

    console.log(`  ${verificationSuccess ? '✓' : '✗'} Verification complete (${result.phases.verification.durationMs}ms)\n`);

    // =========================================================================
    // Final Summary
    // =========================================================================
    result.success = Object.values(result.phases).every(p => p.success);
    result.metrics = {
      totalDurationMs: Date.now() - startTime,
      requirementsCaptured,
      tasksCreated,
      tasksCompleted,
      tasksFailed,
    };

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (!errors.includes(errorMsg)) {
      errors.push(errorMsg);
    }
  } finally {
    // Cleanup
    if (nexus) {
      try {
        await nexus.shutdown();
      } catch {
        // Ignore shutdown errors
      }
    }

    result.metrics.totalDurationMs = Date.now() - startTime;
  }

  // Print final summary
  printSummary(result);

  return result;
}

/**
 * Print test summary
 */
function printSummary(result: E2ETestResult): void {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const statusIcon = result.success ? '✓' : '✗';
  const statusText = result.success ? 'PASSED' : 'FAILED';

  console.log(`  Overall Result: ${statusIcon} ${statusText}\n`);

  console.log('  Phases:');
  for (const [key, phase] of Object.entries(result.phases)) {
    const icon = phase.success ? '✓' : '✗';
    const duration = `(${phase.durationMs}ms)`;
    const detail = phase.details ? ` - ${phase.details}` : '';
    const error = phase.error ? ` [ERROR: ${phase.error}]` : '';
    console.log(`    ${icon} ${phase.name} ${duration}${detail}${error}`);
  }

  console.log('\n  Metrics:');
  console.log(`    Total Duration: ${result.metrics.totalDurationMs}ms`);
  console.log(`    Requirements Captured: ${result.metrics.requirementsCaptured}`);
  console.log(`    Tasks Created: ${result.metrics.tasksCreated}`);
  console.log(`    Tasks Completed: ${result.metrics.tasksCompleted}`);
  console.log(`    Tasks Failed: ${result.metrics.tasksFailed}`);

  if (result.errors.length > 0) {
    console.log('\n  Errors:');
    for (const error of result.errors) {
      console.log(`    - ${error}`);
    }
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

// Export for direct execution
export default runTodoAppE2E;
