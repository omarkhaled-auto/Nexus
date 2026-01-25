#!/usr/bin/env tsx
/**
 * E2E Test Runner
 *
 * This script runs the Nexus E2E validation test that builds a todo app
 * through the complete Nexus workflow.
 *
 * Usage:
 *   npx tsx tests/e2e/run-e2e.ts
 *
 * Environment Variables:
 *   ANTHROPIC_API_KEY - Claude API key (required unless USE_CLAUDE_CLI=true)
 *   USE_CLAUDE_CLI - Set to 'true' to use Claude CLI instead of API
 *   GOOGLE_AI_API_KEY - Gemini API key (optional)
 *   USE_GEMINI_CLI - Set to 'true' to use Gemini CLI instead of API
 *   OPENAI_API_KEY - OpenAI API key (optional)
 *
 * Exit Codes:
 *   0 - Test passed
 *   1 - Test failed
 */

import { runTodoAppE2E } from './todo-app-e2e';

// ============================================================================
// Pre-flight Checks
// ============================================================================

function preflightChecks(): boolean {
  console.log('Running pre-flight checks...\n');

  let hasError = false;

  // Check for API key or CLI mode
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const useClaudeCli = process.env.USE_CLAUDE_CLI === 'true';

  if (!hasAnthropicKey && !useClaudeCli) {
    console.error('ERROR: ANTHROPIC_API_KEY is required unless USE_CLAUDE_CLI=true');
    console.error('  Set ANTHROPIC_API_KEY environment variable, or');
    console.error('  Set USE_CLAUDE_CLI=true to use the Claude CLI\n');
    hasError = true;
  }

  // Optional: Check for Electron-related issues (we're running outside Electron)
  console.log('Configuration:');
  console.log(`  ANTHROPIC_API_KEY: ${hasAnthropicKey ? '✓ Set' : '✗ Not set'}`);
  console.log(`  USE_CLAUDE_CLI: ${useClaudeCli ? '✓ Enabled' : '✗ Disabled'}`);
  console.log(`  GOOGLE_AI_API_KEY: ${process.env.GOOGLE_AI_API_KEY ? '✓ Set' : '○ Not set (optional)'}`);
  console.log(`  USE_GEMINI_CLI: ${process.env.USE_GEMINI_CLI === 'true' ? '✓ Enabled' : '○ Disabled'}`);
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ Set' : '○ Not set (optional)'}`);
  console.log('');

  return !hasError;
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  console.log('\n');
  console.log('████████████████████████████████████████████████████████████████');
  console.log('█                                                              █');
  console.log('█       NEXUS E2E VALIDATION TEST                              █');
  console.log('█       Building Todo App via Nexus Backend                    █');
  console.log('█                                                              █');
  console.log('████████████████████████████████████████████████████████████████');
  console.log('\n');

  // Run pre-flight checks
  if (!preflightChecks()) {
    console.error('Pre-flight checks failed. Aborting test.\n');
    process.exit(1);
  }

  try {
    // Run the E2E test
    const result = await runTodoAppE2E();

    // Exit with appropriate code
    if (result.success) {
      console.log('E2E Test PASSED - Todo app built successfully via Nexus!\n');
      process.exit(0);
    } else {
      console.error('E2E Test FAILED - Check the summary above for details.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\nFATAL ERROR during E2E test:');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
