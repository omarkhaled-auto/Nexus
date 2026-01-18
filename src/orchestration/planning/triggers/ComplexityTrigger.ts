/**
 * ComplexityTrigger
 *
 * Evaluates whether discovered complexity warrants replanning.
 * Triggers when agent feedback or error messages contain complexity keywords.
 *
 * @module orchestration/planning/triggers
 */

import type {
  ITriggerEvaluator,
  ExecutionContext,
  TriggerThresholds,
  TriggerResult,
  ReplanTrigger,
} from '../types';

/**
 * Trigger evaluator for detecting discovered complexity
 */
export class ComplexityTrigger implements ITriggerEvaluator {
  /**
   * The trigger type this evaluator handles
   */
  readonly trigger: ReplanTrigger = 'complexity_discovered';

  /**
   * Evaluate whether the complexity trigger should activate
   *
   * @param context Current execution context
   * @param thresholds Threshold configuration
   * @returns Trigger result
   */
  evaluate(context: ExecutionContext, thresholds: TriggerThresholds): TriggerResult {
    const { agentFeedback, errors } = context;

    // Collect all text to search for complexity indicators
    const textsToSearch: string[] = [];

    if (agentFeedback) {
      textsToSearch.push(agentFeedback);
    }

    // Add error messages
    for (const error of errors) {
      if (error.message) {
        textsToSearch.push(error.message);
      }
    }

    // Search for complexity keywords
    const foundKeywords = this.findComplexityKeywords(
      textsToSearch,
      thresholds.complexityKeywords
    );

    // Also check for implicit complexity indicators
    const implicitIndicators = this.findImplicitComplexity(textsToSearch);
    const allIndicators = [...foundKeywords, ...implicitIndicators];

    const triggered = allIndicators.length > 0;

    // Calculate confidence based on number and type of indicators
    let confidence = 0;
    if (triggered) {
      // Base confidence on number of indicators
      const baseConfidence = Math.min(0.5 + allIndicators.length * 0.1, 0.8);

      // Higher confidence if found in agent feedback (more reliable signal)
      const agentFeedbackBonus = agentFeedback && foundKeywords.length > 0 ? 0.15 : 0;

      confidence = Math.min(baseConfidence + agentFeedbackBonus, 0.95);
    }

    const details = triggered
      ? `Complexity discovered: found indicators [${allIndicators.join(', ')}] ` +
        `in ${agentFeedback ? 'agent feedback and ' : ''}error messages`
      : 'No complexity indicators detected';

    return {
      triggered,
      trigger: this.trigger,
      confidence,
      details,
      metrics: {},
    };
  }

  /**
   * Find complexity keywords in text sources
   */
  private findComplexityKeywords(texts: string[], keywords: string[]): string[] {
    const found: Set<string> = new Set();

    for (const text of texts) {
      const lowerText = text.toLowerCase();
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          found.add(keyword);
        }
      }
    }

    return Array.from(found);
  }

  /**
   * Find implicit complexity indicators beyond configured keywords
   */
  private findImplicitComplexity(texts: string[]): string[] {
    const indicators: Set<string> = new Set();

    // Additional complexity patterns
    const implicitPatterns: Array<{ pattern: RegExp; indicator: string }> = [
      { pattern: /needs? to be refactored/i, indicator: 'refactor-needed' },
      { pattern: /requires? major changes/i, indicator: 'major-changes' },
      { pattern: /this is (more )?complicated/i, indicator: 'complicated' },
      { pattern: /circular dependency/i, indicator: 'circular-dependency' },
      { pattern: /breaking change/i, indicator: 'breaking-change' },
      { pattern: /need to restructure/i, indicator: 'restructure-needed' },
      { pattern: /architecture (issue|problem)/i, indicator: 'architecture-issue' },
      { pattern: /won't work with/i, indicator: 'incompatibility' },
      { pattern: /too (tightly )?coupled/i, indicator: 'tight-coupling' },
      { pattern: /legacy code/i, indicator: 'legacy-code' },
    ];

    for (const text of texts) {
      for (const { pattern, indicator } of implicitPatterns) {
        if (pattern.test(text)) {
          indicators.add(indicator);
        }
      }
    }

    return Array.from(indicators);
  }
}
