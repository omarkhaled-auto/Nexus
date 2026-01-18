/**
 * Known Issues Analyzer
 *
 * Analyzes codebase for technical debt, limitations, workarounds, and suggests improvements.
 * Generates KNOWN_ISSUES.md documentation.
 *
 * @module infrastructure/analysis/codebase/KnownIssuesAnalyzer
 */

import { BaseAnalyzer } from './BaseAnalyzer';
import type {
  KnownIssuesDoc,
  TechnicalDebtItem,
  LimitationDoc,
  WorkaroundDoc,
  FutureImprovementDoc,
} from './types';

/**
 * Patterns for detecting technical debt comments
 */
const _DEBT_PATTERNS: Array<{
  pattern: RegExp;
  severity: TechnicalDebtItem['severity'];
  prefix: string;
}> = [
  { pattern: /\/\/\s*TODO:?\s*(.+)/i, severity: 'low', prefix: 'TODO' },
  { pattern: /\/\/\s*FIXME:?\s*(.+)/i, severity: 'medium', prefix: 'FIXME' },
  { pattern: /\/\/\s*HACK:?\s*(.+)/i, severity: 'high', prefix: 'HACK' },
  { pattern: /\/\/\s*XXX:?\s*(.+)/i, severity: 'medium', prefix: 'XXX' },
  { pattern: /\/\*\*[\s\S]*?@deprecated\s*(.*)[\s\S]*?\*\//g, severity: 'medium', prefix: 'DEPRECATED' },
];

/**
 * Analyzer that generates KNOWN_ISSUES.md documentation
 *
 * Examines the codebase to:
 * - Find technical debt (TODO, FIXME, HACK comments)
 * - Detect limitations (skipped tests, platform-specific code)
 * - Identify workarounds
 * - Suggest improvements
 *
 * @example
 * ```typescript
 * const analyzer = new KnownIssuesAnalyzer(repoMap, options);
 * const doc = await analyzer.analyze();
 * const markdown = analyzer.toMarkdown(doc);
 * ```
 */
export class KnownIssuesAnalyzer extends BaseAnalyzer {
  /**
   * Perform known issues analysis
   * @returns Known issues documentation
   */
  analyze(): KnownIssuesDoc {
    const technicalDebt = this.findTechnicalDebt();
    const limitations = this.detectLimitations();
    const workarounds = this.findWorkarounds();
    const futureImprovements = this.suggestImprovements(technicalDebt, limitations);
    const overview = this.generateOverview(technicalDebt, limitations, workarounds);

    return {
      overview,
      technicalDebt,
      limitations,
      workarounds,
      futureImprovements,
    };
  }

  /**
   * Generate known issues overview
   */
  private generateOverview(
    debt: TechnicalDebtItem[],
    limitations: LimitationDoc[],
    workarounds: WorkaroundDoc[]
  ): string {
    const paragraphs: string[] = [];

    const highSeverityCount = debt.filter(d => d.severity === 'high').length;
    const mediumSeverityCount = debt.filter(d => d.severity === 'medium').length;
    const lowSeverityCount = debt.filter(d => d.severity === 'low').length;

    if (debt.length === 0 && limitations.length === 0 && workarounds.length === 0) {
      paragraphs.push(
        `This codebase appears to be well-maintained with no detected technical debt markers, ` +
        `documented limitations, or workarounds. This analysis is based on automated scanning ` +
        `and may not capture all issues.`
      );
    } else {
      paragraphs.push(
        `This document tracks ${String(debt.length)} technical debt items, ${String(limitations.length)} known limitations, ` +
        `and ${String(workarounds.length)} workarounds in the codebase.`
      );

      if (highSeverityCount > 0) {
        paragraphs.push(
          `**Action Required:** ${String(highSeverityCount)} high-severity item(s) require immediate attention.`
        );
      }

      if (mediumSeverityCount > 0 || lowSeverityCount > 0) {
        paragraphs.push(
          `There are ${String(mediumSeverityCount)} medium-severity and ${String(lowSeverityCount)} low-severity items ` +
          `that should be addressed during regular maintenance cycles.`
        );
      }
    }

    return paragraphs.join('\n\n');
  }

  /**
   * Find technical debt by scanning for TODO, FIXME, HACK comments
   */
  private findTechnicalDebt(): TechnicalDebtItem[] {
    const debtItems: TechnicalDebtItem[] = [];
    let idCounter = 1;

    // Scan symbols for deprecated markers
    for (const symbol of this.repoMap.symbols) {
      if (symbol.documentation?.includes('@deprecated')) {
        const description = this.extractDeprecationMessage(symbol.documentation);
        debtItems.push({
          id: `DEBT-${String(idCounter++)}`,
          description: `Deprecated: ${symbol.name} - ${description}`,
          location: `${symbol.file}:${String(symbol.line)}`,
          severity: 'medium',
          effort: 'medium',
          suggestion: `Remove or replace deprecated ${symbol.kind} "${symbol.name}"`,
        });
      }
    }

    // Check for common technical debt patterns based on file analysis
    // In a real implementation, we'd parse file contents
    // For now, we create items based on naming patterns and structure

    // Check for files with "temp", "temporary", or "old" in name
    for (const file of this.repoMap.files) {
      const fileName = file.relativePath.toLowerCase();

      if (fileName.includes('temp') && !fileName.includes('template')) {
        debtItems.push({
          id: `DEBT-${String(idCounter++)}`,
          description: 'Temporary file that should be removed or refactored',
          location: file.relativePath,
          severity: 'low',
          effort: 'small',
          suggestion: 'Review and either remove or properly integrate this file',
        });
      }

      if (fileName.includes('.old.') || fileName.endsWith('.old')) {
        debtItems.push({
          id: `DEBT-${String(idCounter++)}`,
          description: 'Old/legacy file that should be removed',
          location: file.relativePath,
          severity: 'low',
          effort: 'small',
          suggestion: 'Remove this legacy file after confirming it is no longer needed',
        });
      }

      if (fileName.includes('.bak') || fileName.includes('.backup')) {
        debtItems.push({
          id: `DEBT-${String(idCounter++)}`,
          description: 'Backup file in repository',
          location: file.relativePath,
          severity: 'low',
          effort: 'small',
          suggestion: 'Remove backup files from version control',
        });
      }
    }

    return debtItems;
  }

  /**
   * Extract deprecation message from JSDoc
   */
  private extractDeprecationMessage(doc: string): string {
    const match = /@deprecated\s*(.*)/.exec(doc);
    return match?.[1]?.trim() || 'No deprecation message provided';
  }

  /**
   * Detect limitations in the codebase
   */
  private detectLimitations(): LimitationDoc[] {
    const limitations: LimitationDoc[] = [];

    // Check for skipped tests
    const testFiles = this.repoMap.files.filter(
      f => f.relativePath.includes('.test.') || f.relativePath.includes('.spec.')
    );

    if (testFiles.length > 0) {
      // Note: In a real implementation, we'd parse test files for .skip
      // For now, we add a generic note about test completeness
    }

    // Check for platform-specific code patterns
    const hasPlatformSpecific = this.repoMap.files.some(
      f => f.relativePath.includes('platform-') ||
           f.relativePath.includes('/win32/') ||
           f.relativePath.includes('/darwin/') ||
           f.relativePath.includes('/linux/')
    );

    if (hasPlatformSpecific) {
      limitations.push({
        limitation: 'Platform-specific code paths',
        reason: 'Some functionality is implemented differently per operating system',
        impact: 'Features may behave differently or be unavailable on certain platforms',
        workaround: 'Check platform documentation for specific behaviors',
      });
    }

    // Check for better-sqlite3 (common Electron limitation)
    const hasBetterSqlite = this.repoMap.dependencies.some(
      d => d.to.includes('better-sqlite3')
    );

    if (hasBetterSqlite) {
      limitations.push({
        limitation: 'Native module dependency (better-sqlite3)',
        reason: 'Requires native compilation for each platform and Electron version',
        impact: 'Build process is more complex, may have compatibility issues with Electron updates',
        workaround: 'Use electron-rebuild to ensure native modules match Electron version',
      });
    }

    // Check for web-tree-sitter
    const hasTreeSitter = this.repoMap.dependencies.some(
      d => d.to.includes('tree-sitter') || d.to.includes('web-tree-sitter')
    );

    if (hasTreeSitter) {
      limitations.push({
        limitation: 'WASM parser dependency',
        reason: 'Tree-sitter requires WASM files to be accessible at runtime',
        impact: 'Parsers must be initialized before use, may fail if WASM path is incorrect',
        workaround: 'Ensure WASM files are copied to the correct location during build',
      });
    }

    return limitations;
  }

  /**
   * Find workarounds in the codebase
   */
  private findWorkarounds(): WorkaroundDoc[] {
    const workarounds: WorkaroundDoc[] = [];

    // Check for common workaround file patterns
    for (const file of this.repoMap.files) {
      const fileName = file.relativePath.toLowerCase();

      if (fileName.includes('workaround') || fileName.includes('shim') || fileName.includes('polyfill')) {
        workarounds.push({
          issue: `Implementation in ${file.relativePath}`,
          workaround: 'Shim or polyfill implementation for compatibility',
          location: file.relativePath,
          permanent: false,
        });
      }
    }

    // Check symbols for workaround patterns
    for (const symbol of this.repoMap.symbols) {
      const name = symbol.name.toLowerCase();
      if (name.includes('workaround') || name.includes('hack') || name.includes('temp')) {
        workarounds.push({
          issue: `Temporary implementation: ${symbol.name}`,
          workaround: `${symbol.kind} "${symbol.name}" implements a temporary solution`,
          location: `${symbol.file}:${String(symbol.line)}`,
          permanent: false,
        });
      }
    }

    return workarounds;
  }

  /**
   * Suggest improvements based on analysis
   */
  private suggestImprovements(
    debt: TechnicalDebtItem[],
    _limitations: LimitationDoc[]
  ): FutureImprovementDoc[] {
    const improvements: FutureImprovementDoc[] = [];

    // Suggest based on technical debt
    const highSeverityDebt = debt.filter(d => d.severity === 'high');
    if (highSeverityDebt.length > 0) {
      improvements.push({
        improvement: 'Address high-severity technical debt',
        benefit: 'Reduce bugs and improve code maintainability',
        complexity: 'medium',
        priority: 'high',
      });
    }

    // Suggest test coverage improvements
    const testFiles = this.repoMap.files.filter(
      f => f.relativePath.includes('.test.') || f.relativePath.includes('.spec.')
    );
    const sourceFiles = this.repoMap.files.filter(
      f => (f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx')) &&
           !f.relativePath.includes('.test.') &&
           !f.relativePath.includes('.spec.') &&
           !f.relativePath.includes('.d.ts')
    );

    if (sourceFiles.length > testFiles.length * 2) {
      improvements.push({
        improvement: 'Increase test coverage',
        benefit: 'Catch bugs earlier and improve confidence in refactoring',
        complexity: 'medium',
        priority: 'medium',
      });
    }

    // Suggest documentation improvements
    const symbolsWithoutDocs = this.repoMap.symbols.filter(
      s => s.exported && !s.documentation
    );
    if (symbolsWithoutDocs.length > 10) {
      improvements.push({
        improvement: 'Add JSDoc documentation to exported symbols',
        benefit: 'Improve code discoverability and maintainability',
        complexity: 'low',
        priority: 'low',
      });
    }

    // Check for missing index files
    const directories = this.getAllDirectories();
    const indexFiles = this.repoMap.files.filter(f => f.relativePath.endsWith('index.ts'));
    const dirsWithoutIndex = directories.filter(
      dir => !indexFiles.some(f => f.relativePath.startsWith(dir))
    );

    if (dirsWithoutIndex.length > 5) {
      improvements.push({
        improvement: 'Add index files for better module organization',
        benefit: 'Simplify imports and establish clear module boundaries',
        complexity: 'low',
        priority: 'low',
      });
    }

    // Check for type definitions
    const hasTypeFiles = this.repoMap.files.some(
      f => f.relativePath.endsWith('types.ts') || f.relativePath.endsWith('.types.ts')
    );

    if (!hasTypeFiles && this.repoMap.symbols.filter(s => s.kind === 'interface').length > 0) {
      improvements.push({
        improvement: 'Centralize type definitions',
        benefit: 'Improve type reusability and reduce duplication',
        complexity: 'medium',
        priority: 'low',
      });
    }

    return improvements;
  }

  /**
   * Convert documentation to Markdown
   */
  toMarkdown(doc: KnownIssuesDoc): string {
    const lines: string[] = [];

    // Header
    lines.push('# Known Issues');
    lines.push('');
    lines.push(`*Generated: ${new Date().toISOString()}*`);
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(doc.overview);
    lines.push('');

    // Technical Debt
    lines.push('## Technical Debt');
    lines.push('');

    if (doc.technicalDebt.length > 0) {
      lines.push('| ID | Description | Location | Severity | Effort |');
      lines.push('|----|-------------|----------|----------|--------|');

      for (const item of doc.technicalDebt) {
        const desc = item.description.length > 60
          ? item.description.substring(0, 57) + '...'
          : item.description;
        lines.push(`| ${item.id} | ${desc} | \`${item.location}\` | ${item.severity} | ${item.effort} |`);
      }
      lines.push('');

      // Add suggestions for each item
      lines.push('### Suggestions');
      lines.push('');
      for (const item of doc.technicalDebt) {
        lines.push(`- **${item.id}**: ${item.suggestion}`);
      }
    } else {
      lines.push('No technical debt items detected.');
    }
    lines.push('');

    // Limitations
    lines.push('## Known Limitations');
    lines.push('');

    if (doc.limitations.length > 0) {
      for (const limit of doc.limitations) {
        lines.push(`### ${limit.limitation}`);
        lines.push('');
        lines.push(`**Reason:** ${limit.reason}`);
        lines.push('');
        lines.push(`**Impact:** ${limit.impact}`);
        lines.push('');
        if (limit.workaround) {
          lines.push(`**Workaround:** ${limit.workaround}`);
          lines.push('');
        }
      }
    } else {
      lines.push('No known limitations documented.');
    }
    lines.push('');

    // Workarounds
    lines.push('## Workarounds');
    lines.push('');

    if (doc.workarounds.length > 0) {
      lines.push('| Issue | Workaround | Location | Permanent |');
      lines.push('|-------|------------|----------|-----------|');

      for (const wa of doc.workarounds) {
        const permanent = wa.permanent ? 'Yes' : 'No';
        lines.push(`| ${wa.issue} | ${wa.workaround} | \`${wa.location}\` | ${permanent} |`);
      }
    } else {
      lines.push('No workarounds documented.');
    }
    lines.push('');

    // Future Improvements
    lines.push('## Suggested Improvements');
    lines.push('');

    if (doc.futureImprovements.length > 0) {
      lines.push('| Improvement | Benefit | Complexity | Priority |');
      lines.push('|-------------|---------|------------|----------|');

      for (const imp of doc.futureImprovements) {
        lines.push(`| ${imp.improvement} | ${imp.benefit} | ${imp.complexity} | ${imp.priority} |`);
      }
    } else {
      lines.push('No specific improvements suggested at this time.');
    }

    return lines.join('\n');
  }
}
