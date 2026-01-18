/**
 * Blocker Detector Implementation
 *
 * Detects and categorizes blockers that prevent task progress by analyzing
 * error patterns, agent feedback, and iteration history.
 *
 * Layer 2: Orchestration / Assessment
 *
 * Philosophy:
 * - Blockers should be detected early and categorized accurately
 * - Solutions should be suggested where possible
 * - Human intervention should be requested when necessary
 * - Severity should reflect the impact on task completion
 */

import type {
  IBlockerDetector,
  AssessmentContext,
  BlockerAssessment,
  Blocker,
  BlockerType,
  BlockerSeverity,
  BlockerPattern,
} from './types';

import { DEFAULT_BLOCKER_PATTERNS } from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Severity weights for calculating overall severity
 * Note: Currently used conceptually in getBlockerWeight, keeping for future explicit use
 */
const _SEVERITY_WEIGHTS: Record<BlockerSeverity, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Keywords indicating requirement issues in agent feedback
 */
const REQUIREMENT_KEYWORDS = [
  'unclear',
  'ambiguous',
  'not specified',
  'missing requirement',
  'contradictory',
  'conflicting requirement',
  'need clarification',
  'what should',
  'how should',
  'not sure',
  'uncertain',
];

/**
 * Keywords indicating knowledge gaps
 */
const KNOWLEDGE_GAP_KEYWORDS = [
  'not familiar',
  'don\'t know',
  'unsure how',
  'need to research',
  'never used',
  'first time',
  'unfamiliar',
  'complex domain',
  'specialized knowledge',
];

// ============================================================================
// Blocker Detector Class
// ============================================================================

/**
 * Blocker Detector
 *
 * Detects blockers by analyzing:
 * - Error messages and patterns
 * - Agent feedback and comments
 * - Iteration history and error persistence
 * - Code changes and dependency issues
 */
export class BlockerDetector implements IBlockerDetector {
  private readonly patterns: BlockerPattern[];
  private blockerIdCounter: number = 0;

  /**
   * Create a new BlockerDetector
   *
   * @param customPatterns Optional custom blocker patterns
   */
  constructor(customPatterns?: BlockerPattern[]) {
    this.patterns = customPatterns ?? DEFAULT_BLOCKER_PATTERNS;
  }

  /**
   * Detect blockers in the current task context
   *
   * @param context Assessment context
   * @returns Blocker assessment
   */
  detect(context: AssessmentContext): Promise<BlockerAssessment> {
    const blockers: Blocker[] = [];
    // Track detected patterns globally to avoid duplicates across detection methods
    const globalDetectedPatterns = new Set<string>();

    // Detect blockers from various sources - ORDER MATTERS for classification priority
    // Dependency blockers first (more specific classification)
    const dependencyBlockers = this.detectDependencyBlockers(context, globalDetectedPatterns);
    // Then external blockers
    const externalBlockers = this.detectExternalBlockers(context, globalDetectedPatterns);
    // Then technical blockers (general category)
    const technicalBlockers = this.detectTechnicalBlockers(context, globalDetectedPatterns);
    // Then requirement blockers
    const requirementBlockers = this.detectRequirementBlockers(context);
    // Finally knowledge gap blockers
    const knowledgeGapBlockers = this.detectKnowledgeGapBlockers(context);

    // Combine all blockers
    blockers.push(
      ...dependencyBlockers,
      ...externalBlockers,
      ...technicalBlockers,
      ...requirementBlockers,
      ...knowledgeGapBlockers
    );

    // Assess overall severity
    const severity = this.assessSeverity(blockers);

    // Determine if work can proceed
    const canProceed = this.determineCanProceed(blockers, severity);

    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(blockers, severity);

    return Promise.resolve({
      taskId: context.taskId,
      blockers,
      severity,
      canProceed,
      suggestedActions,
      assessedAt: new Date(),
    });
  }

  // ===========================================================================
  // Technical Blocker Detection
  // ===========================================================================

  /**
   * Detect technical blockers (build failures, type errors, etc.)
   */
  private detectTechnicalBlockers(
    context: AssessmentContext,
    globalDetectedPatterns: Set<string>
  ): Blocker[] {
    const blockers: Blocker[] = [];

    // Analyze current errors (excluding those already detected as dependency/external)
    for (const error of context.currentErrors) {
      const blocker = this.detectBlockerFromError(error, 'technical', globalDetectedPatterns);
      if (blocker) {
        blockers.push(blocker);
      }
    }

    // Analyze persistent errors from history
    const persistentErrors = this.findPersistentErrors(context);
    for (const persistentError of persistentErrors) {
      // Don't duplicate if already detected
      const normalized = this.normalizeErrorMessage(persistentError.message);
      if (!globalDetectedPatterns.has(normalized)) {
        blockers.push(this.createBlocker(
          'technical',
          `Persistent error (${persistentError.count}x): ${persistentError.message}`,
          persistentError.files,
          ['Review and fix the root cause', 'Try alternative approach'],
          persistentError.count >= 5
        ));
        globalDetectedPatterns.add(normalized);
      }
    }

    return blockers;
  }

  /**
   * Detect a blocker from a single error
   */
  private detectBlockerFromError(
    error: { message: string; file?: string; line?: number },
    defaultType: BlockerType,
    detectedPatterns: Set<string>
  ): Blocker | null {
    const normalized = this.normalizeErrorMessage(error.message);

    // Skip if already detected
    if (detectedPatterns.has(normalized)) {
      return null;
    }

    // Find matching pattern
    for (const pattern of this.patterns) {
      if (pattern.pattern.test(error.message)) {
        detectedPatterns.add(normalized);
        return this.createBlocker(
          pattern.type,
          error.message,
          error.file ? [error.file] : [],
          pattern.suggestedSolutions,
          pattern.needsHuman
        );
      }
    }

    // Check for critical technical errors without matching pattern
    if (this.isCriticalTechnicalError(error.message)) {
      detectedPatterns.add(normalized);
      return this.createBlocker(
        defaultType,
        error.message,
        error.file ? [error.file] : [],
        this.suggestSolutions({ type: defaultType, description: error.message } as Blocker),
        false
      );
    }

    return null;
  }

  /**
   * Check if an error message indicates a critical technical issue
   */
  private isCriticalTechnicalError(message: string): boolean {
    const messageLower = message.toLowerCase();
    return (
      messageLower.includes('syntaxerror') ||
      messageLower.includes('unexpected token') ||
      messageLower.includes('cannot read property') ||
      messageLower.includes('undefined is not') ||
      messageLower.includes('memory') ||
      messageLower.includes('stack overflow') ||
      messageLower.includes('maximum call stack')
    );
  }

  // ===========================================================================
  // Dependency Blocker Detection
  // ===========================================================================

  /**
   * Detect dependency blockers (missing or conflicting dependencies)
   */
  private detectDependencyBlockers(
    context: AssessmentContext,
    globalDetectedPatterns: Set<string>
  ): Blocker[] {
    const blockers: Blocker[] = [];

    // Analyze errors for dependency issues
    for (const error of context.currentErrors) {
      const blocker = this.detectDependencyBlocker(error, globalDetectedPatterns);
      if (blocker) {
        blockers.push(blocker);
      }
    }

    // Check iteration history for recurring dependency issues
    for (const iteration of context.iterationHistory) {
      for (const error of iteration.errors) {
        const blocker = this.detectDependencyBlocker(error, globalDetectedPatterns);
        if (blocker) {
          blockers.push(blocker);
        }
      }
    }

    return blockers;
  }

  /**
   * Detect a dependency blocker from an error
   */
  private detectDependencyBlocker(
    error: { message: string; file?: string },
    detectedPatterns: Set<string>
  ): Blocker | null {
    const messageLower = error.message.toLowerCase();
    const normalized = this.normalizeErrorMessage(error.message);

    if (detectedPatterns.has(normalized)) {
      return null;
    }

    // Missing package/module
    if (
      messageLower.includes('cannot find module') ||
      messageLower.includes('module not found')
    ) {
      const packageMatch = error.message.match(/['"]([^'"]+)['"]/);
      const packageName = packageMatch?.[1] ?? 'unknown';

      detectedPatterns.add(normalized);
      return this.createBlocker(
        'dependency',
        `Missing module: ${packageName}`,
        error.file ? [error.file] : [],
        [
          `Install the missing package: npm install ${packageName}`,
          'Check if the import path is correct',
          'Verify the package exists in package.json',
        ],
        false
      );
    }

    // Peer dependency issues
    if (
      messageLower.includes('peer dep') ||
      messageLower.includes('eresolve') ||
      messageLower.includes('npm err! peer')
    ) {
      detectedPatterns.add(normalized);
      return this.createBlocker(
        'dependency',
        'Peer dependency conflict',
        [],
        [
          'Update conflicting packages',
          'Use --legacy-peer-deps flag',
          'Check package.json version constraints',
        ],
        false
      );
    }

    // Circular dependency
    if (
      messageLower.includes('circular dependency') ||
      messageLower.includes('cycle detected')
    ) {
      detectedPatterns.add(normalized);
      return this.createBlocker(
        'dependency',
        'Circular dependency detected',
        error.file ? [error.file] : [],
        [
          'Refactor to break the dependency cycle',
          'Use lazy imports or dynamic imports',
          'Restructure module architecture',
        ],
        true // Often needs architectural decision
      );
    }

    // Version conflict
    if (messageLower.includes('version') && messageLower.includes('conflict')) {
      detectedPatterns.add(normalized);
      return this.createBlocker(
        'dependency',
        'Version conflict detected',
        [],
        [
          'Update packages to compatible versions',
          'Check for conflicting version requirements',
          'Consider using resolutions in package.json',
        ],
        false
      );
    }

    return null;
  }

  // ===========================================================================
  // Requirement Blocker Detection
  // ===========================================================================

  /**
   * Detect requirement blockers (unclear or missing requirements)
   */
  private detectRequirementBlockers(context: AssessmentContext): Blocker[] {
    const blockers: Blocker[] = [];

    // Check agent feedback for requirement issues
    if (context.agentFeedback) {
      const feedbackLower = context.agentFeedback.toLowerCase();

      for (const keyword of REQUIREMENT_KEYWORDS) {
        if (feedbackLower.includes(keyword)) {
          blockers.push(this.createBlocker(
            'unclear_requirement',
            `Agent reports requirement issue: "${this.extractContext(context.agentFeedback, keyword)}"`,
            context.taskFiles,
            [
              'Request clarification from user',
              'Document assumptions made',
              'Ask for specific examples or specifications',
            ],
            true
          ));
          break; // Only create one blocker for requirement issues
        }
      }
    }

    // Check for contradictory acceptance criteria
    if (context.acceptanceCriteria && context.acceptanceCriteria.length > 0) {
      const contradictions = this.findContradictions(context.acceptanceCriteria);
      if (contradictions.length > 0) {
        blockers.push(this.createBlocker(
          'unclear_requirement',
          `Potentially contradictory criteria: ${contradictions.join(', ')}`,
          [],
          [
            'Verify understanding of requirements',
            'Request clarification on conflicting criteria',
            'Prioritize which criteria to satisfy first',
          ],
          true
        ));
      }
    }

    return blockers;
  }

  /**
   * Find potentially contradictory criteria
   */
  private findContradictions(criteria: string[]): string[] {
    const contradictions: string[] = [];
    const normalizedCriteria = criteria.map(c => c.toLowerCase());

    // Simple contradiction detection - look for opposing terms
    const opposites = [
      ['must', 'must not'],
      ['should', 'should not'],
      ['enable', 'disable'],
      ['add', 'remove'],
      ['include', 'exclude'],
    ];

    for (let i = 0; i < criteria.length; i++) {
      for (let j = i + 1; j < criteria.length; j++) {
        for (const [positive, negative] of opposites) {
          if (
            (normalizedCriteria[i].includes(positive) && normalizedCriteria[j].includes(negative)) ||
            (normalizedCriteria[i].includes(negative) && normalizedCriteria[j].includes(positive))
          ) {
            // Check if they're about the same thing
            const words1 = normalizedCriteria[i].split(/\s+/);
            const words2 = normalizedCriteria[j].split(/\s+/);
            const commonWords = words1.filter(w => words2.includes(w) && w.length > 3);
            if (commonWords.length > 0) {
              contradictions.push(`${criteria[i].slice(0, 30)}... vs ${criteria[j].slice(0, 30)}...`);
            }
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * Extract context around a keyword in text
   */
  private extractContext(text: string, keyword: string): string {
    const index = text.toLowerCase().indexOf(keyword);
    if (index === -1) return text.slice(0, 100);

    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + keyword.length + 50);

    let context = text.slice(start, end);
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }

  // ===========================================================================
  // External Blocker Detection
  // ===========================================================================

  /**
   * Detect external blockers (service unavailable, network issues)
   */
  private detectExternalBlockers(
    context: AssessmentContext,
    globalDetectedPatterns: Set<string>
  ): Blocker[] {
    const blockers: Blocker[] = [];

    const externalPatterns = [
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i,
      /network error/i,
      /api unavailable/i,
      /service unavailable/i,
      /rate limit/i,
      /quota exceeded/i,
      /authentication failed/i,
      /unauthorized/i,
      /forbidden/i,
    ];

    // Check current errors
    for (const error of context.currentErrors) {
      for (const pattern of externalPatterns) {
        if (pattern.test(error.message)) {
          const normalized = this.normalizeErrorMessage(error.message);
          if (!globalDetectedPatterns.has(normalized)) {
            globalDetectedPatterns.add(normalized);
            blockers.push(this.createBlocker(
              'external',
              error.message,
              error.file ? [error.file] : [],
              this.suggestExternalSolutions(error.message),
              false
            ));
          }
          break;
        }
      }
    }

    // Check agent feedback for external issues
    if (context.agentFeedback) {
      const feedbackLower = context.agentFeedback.toLowerCase();
      if (
        feedbackLower.includes('external service') ||
        feedbackLower.includes('api is down') ||
        feedbackLower.includes('cannot connect')
      ) {
        blockers.push(this.createBlocker(
          'external',
          `External service issue reported: ${this.extractContext(context.agentFeedback, 'external')}`,
          [],
          [
            'Check service status',
            'Retry after a delay',
            'Use offline fallback if available',
          ],
          false
        ));
      }
    }

    return blockers;
  }

  /**
   * Suggest solutions for external blockers
   */
  private suggestExternalSolutions(message: string): string[] {
    const messageLower = message.toLowerCase();
    const solutions: string[] = [];

    if (messageLower.includes('timeout') || messageLower.includes('econnrefused')) {
      solutions.push('Check if the service is running');
      solutions.push('Verify network connectivity');
      solutions.push('Retry the operation after a delay');
    }

    if (messageLower.includes('rate limit') || messageLower.includes('quota')) {
      solutions.push('Wait before retrying');
      solutions.push('Implement request throttling');
      solutions.push('Check API quota limits');
    }

    if (messageLower.includes('auth') || messageLower.includes('unauthorized')) {
      solutions.push('Verify authentication credentials');
      solutions.push('Check API key validity');
      solutions.push('Ensure proper token refresh');
    }

    if (solutions.length === 0) {
      solutions.push('Check service status');
      solutions.push('Retry the operation');
      solutions.push('Contact service provider if issue persists');
    }

    return solutions;
  }

  // ===========================================================================
  // Knowledge Gap Detection
  // ===========================================================================

  /**
   * Detect knowledge gap blockers
   */
  private detectKnowledgeGapBlockers(context: AssessmentContext): Blocker[] {
    const blockers: Blocker[] = [];

    // Check agent feedback for knowledge gaps
    if (context.agentFeedback) {
      const feedbackLower = context.agentFeedback.toLowerCase();

      for (const keyword of KNOWLEDGE_GAP_KEYWORDS) {
        if (feedbackLower.includes(keyword)) {
          blockers.push(this.createBlocker(
            'knowledge_gap',
            `Knowledge gap identified: "${this.extractContext(context.agentFeedback, keyword)}"`,
            context.taskFiles,
            [
              'Research the topic or technology',
              'Check official documentation',
              'Look for similar examples or patterns',
              'Consider consulting domain expert',
            ],
            false
          ));
          break; // Only create one knowledge gap blocker
        }
      }
    }

    // Check for unfamiliar technologies in task files
    const unfamiliarPatterns = this.detectUnfamiliarPatterns(context);
    if (unfamiliarPatterns.length > 0) {
      blockers.push(this.createBlocker(
        'knowledge_gap',
        `Unfamiliar patterns or technologies: ${unfamiliarPatterns.join(', ')}`,
        context.taskFiles,
        [
          'Research each unfamiliar pattern',
          'Find documentation or tutorials',
          'Look for existing usage in codebase',
        ],
        false
      ));
    }

    return blockers;
  }

  /**
   * Detect unfamiliar patterns from errors
   */
  private detectUnfamiliarPatterns(context: AssessmentContext): string[] {
    const patterns: string[] = [];
    const complexPatterns = [
      { pattern: /generator|yield/i, name: 'generators' },
      { pattern: /proxy|reflect/i, name: 'metaprogramming' },
      { pattern: /webassembly|wasm/i, name: 'WebAssembly' },
      { pattern: /worker|thread/i, name: 'web workers' },
      { pattern: /websocket|socket\.io/i, name: 'WebSockets' },
      { pattern: /graphql|mutation|query/i, name: 'GraphQL' },
      { pattern: /grpc|protobuf/i, name: 'gRPC' },
    ];

    // Check errors and code changes for complex patterns
    const allText = [
      ...context.currentErrors.map(e => e.message),
      context.codeChanges ?? '',
      context.agentFeedback ?? '',
    ].join('\n');

    for (const { pattern, name } of complexPatterns) {
      if (pattern.test(allText)) {
        patterns.push(name);
      }
    }

    return patterns;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Find errors that appear multiple times across iterations
   */
  private findPersistentErrors(context: AssessmentContext): Array<{
    message: string;
    count: number;
    files: string[];
  }> {
    const errorCounts = new Map<string, { count: number; files: Set<string>; message: string }>();

    for (const iteration of context.iterationHistory) {
      for (const error of iteration.errors) {
        const normalized = this.normalizeErrorMessage(error.message);
        const existing = errorCounts.get(normalized);

        if (existing) {
          existing.count++;
          if (error.file) {
            existing.files.add(error.file);
          }
        } else {
          errorCounts.set(normalized, {
            count: 1,
            files: new Set(error.file ? [error.file] : []),
            message: error.message,
          });
        }
      }
    }

    // Return errors that appear 3+ times
    return Array.from(errorCounts.values())
      .filter(e => e.count >= 3)
      .map(e => ({
        message: e.message,
        count: e.count,
        files: Array.from(e.files),
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Normalize error message for comparison
   */
  private normalizeErrorMessage(message: string): string {
    return message
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/['"`][^'"`]*['"`]/g, 'STR') // Replace strings
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  /**
   * Create a blocker object
   */
  private createBlocker(
    type: BlockerType,
    description: string,
    affectedFiles: string[],
    possibleSolutions: string[],
    needsHuman: boolean
  ): Blocker {
    return {
      id: `blocker-${++this.blockerIdCounter}`,
      type,
      description: description.slice(0, 200), // Limit description length
      affectedFiles,
      possibleSolutions,
      needsHuman,
      detectedAt: new Date(),
    };
  }

  /**
   * Suggest solutions based on blocker type
   */
  private suggestSolutions(blocker: Blocker): string[] {
    const suggestions: string[] = [];
    const descLower = blocker.description.toLowerCase();

    switch (blocker.type) {
      case 'technical':
        if (descLower.includes('type')) {
          suggestions.push('Add proper type annotations');
          suggestions.push('Check type definitions');
        }
        if (descLower.includes('syntax')) {
          suggestions.push('Check for missing brackets or quotes');
          suggestions.push('Validate code syntax');
        }
        suggestions.push('Review error message details');
        suggestions.push('Check related files for issues');
        break;

      case 'dependency':
        suggestions.push('Check package.json for dependencies');
        suggestions.push('Run npm install');
        suggestions.push('Verify import paths');
        break;

      case 'unclear_requirement':
        suggestions.push('Request clarification from user');
        suggestions.push('Document assumptions');
        suggestions.push('Ask for examples');
        break;

      case 'external':
        suggestions.push('Check service status');
        suggestions.push('Retry after delay');
        suggestions.push('Verify credentials');
        break;

      case 'knowledge_gap':
        suggestions.push('Research the topic');
        suggestions.push('Check documentation');
        suggestions.push('Find examples');
        break;
    }

    return suggestions;
  }

  // ===========================================================================
  // Severity Assessment
  // ===========================================================================

  /**
   * Assess overall severity of blockers
   */
  private assessSeverity(blockers: Blocker[]): BlockerSeverity {
    if (blockers.length === 0) {
      return 'none';
    }

    // Check for critical blockers
    const hasHumanNeeded = blockers.some(b => b.needsHuman);
    const hasTechnicalCritical = blockers.some(b =>
      b.type === 'technical' &&
      (b.description.toLowerCase().includes('memory') ||
       b.description.toLowerCase().includes('stack overflow'))
    );
    const hasCircular = blockers.some(b =>
      b.type === 'dependency' &&
      b.description.toLowerCase().includes('circular')
    );

    if (hasTechnicalCritical || hasCircular) {
      return 'critical';
    }

    if (hasHumanNeeded) {
      return 'high';
    }

    // Calculate weighted score
    let totalWeight = 0;
    for (const blocker of blockers) {
      const baseWeight = this.getBlockerWeight(blocker);
      totalWeight += baseWeight;
    }

    const avgWeight = totalWeight / blockers.length;

    if (avgWeight >= 3 || blockers.length >= 5) {
      return 'high';
    }
    if (avgWeight >= 2 || blockers.length >= 3) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get weight for a single blocker
   */
  private getBlockerWeight(blocker: Blocker): number {
    let weight = 1;

    // Type-based weight
    switch (blocker.type) {
      case 'technical':
        weight += 1;
        break;
      case 'dependency':
        weight += 2;
        break;
      case 'unclear_requirement':
        weight += 3;
        break;
      case 'external':
        weight += 1;
        break;
      case 'knowledge_gap':
        weight += 1;
        break;
    }

    // Needs human = higher weight
    if (blocker.needsHuman) {
      weight += 2;
    }

    // Multiple affected files = higher weight
    if (blocker.affectedFiles.length > 3) {
      weight += 1;
    }

    return weight;
  }

  /**
   * Determine if work can proceed despite blockers
   */
  private determineCanProceed(blockers: Blocker[], severity: BlockerSeverity): boolean {
    if (severity === 'none') {
      return true;
    }

    if (severity === 'critical') {
      return false;
    }

    // Check if all blockers are solvable without human
    const allSolvable = blockers.every(b => !b.needsHuman);

    // Can proceed if severity is low/medium and no human needed
    if (severity === 'low' || (severity === 'medium' && allSolvable)) {
      return true;
    }

    // High severity but all solvable - can proceed with caution
    if (severity === 'high' && allSolvable) {
      return true;
    }

    return false;
  }

  // ===========================================================================
  // Suggested Actions
  // ===========================================================================

  /**
   * Generate suggested actions for addressing blockers
   */
  private generateSuggestedActions(blockers: Blocker[], severity: BlockerSeverity): string[] {
    const actions: string[] = [];

    if (blockers.length === 0) {
      actions.push('No blockers detected - continue with task');
      return actions;
    }

    // Priority actions based on severity
    if (severity === 'critical') {
      actions.push('STOP: Critical blocker requires immediate attention');
      actions.push('Review critical errors before proceeding');
    } else if (severity === 'high') {
      actions.push('Address high-priority blockers before continuing');
    }

    // Type-specific actions
    const blockersByType = this.groupBlockersByType(blockers);

    if (blockersByType.unclear_requirement.length > 0) {
      actions.push('Request clarification on requirements before proceeding');
    }

    if (blockersByType.dependency.length > 0) {
      actions.push('Resolve dependency issues: check package.json and imports');
    }

    if (blockersByType.technical.length > 0) {
      actions.push(`Fix ${blockersByType.technical.length} technical error(s)`);
    }

    if (blockersByType.external.length > 0) {
      actions.push('Check external service connectivity');
    }

    if (blockersByType.knowledge_gap.length > 0) {
      actions.push('Research unfamiliar technologies or patterns');
    }

    // Human needed actions
    const humanNeeded = blockers.filter(b => b.needsHuman);
    if (humanNeeded.length > 0) {
      actions.push(`${humanNeeded.length} blocker(s) may require human intervention`);
    }

    // General action
    if (actions.length === 0) {
      actions.push('Review and address detected blockers');
    }

    return actions;
  }

  /**
   * Group blockers by type
   */
  private groupBlockersByType(blockers: Blocker[]): Record<BlockerType, Blocker[]> {
    const grouped: Record<BlockerType, Blocker[]> = {
      technical: [],
      dependency: [],
      unclear_requirement: [],
      external: [],
      knowledge_gap: [],
    };

    for (const blocker of blockers) {
      grouped[blocker.type].push(blocker);
    }

    return grouped;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new BlockerDetector with optional custom patterns
 */
export function createBlockerDetector(customPatterns?: BlockerPattern[]): BlockerDetector {
  return new BlockerDetector(customPatterns);
}
