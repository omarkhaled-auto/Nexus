const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/KnownIssuesAnalyzer.ts', 'utf8');

// Line 22: Prefix unused DEBT_PATTERNS with underscore
content = content.replace(
    'const DEBT_PATTERNS:',
    'const _DEBT_PATTERNS:'
);

// Line 93-94: debt.length, limitations.length, workarounds.length
content = content.replace(
    '`This document tracks ${debt.length} technical debt items, ${limitations.length} known limitations, ` +\n        `and ${workarounds.length} workarounds in the codebase.`',
    '`This document tracks ${String(debt.length)} technical debt items, ${String(limitations.length)} known limitations, ` +\n        `and ${String(workarounds.length)} workarounds in the codebase.`'
);

// Line 99: highSeverityCount
content = content.replace(
    '`**Action Required:** ${highSeverityCount} high-severity item(s) require immediate attention.`',
    '`**Action Required:** ${String(highSeverityCount)} high-severity item(s) require immediate attention.`'
);

// Line 105: mediumSeverityCount and lowSeverityCount
content = content.replace(
    '`There are ${mediumSeverityCount} medium-severity and ${lowSeverityCount} low-severity items `',
    '`There are ${String(mediumSeverityCount)} medium-severity and ${String(lowSeverityCount)} low-severity items `'
);

// Line 117: Remove async from findTechnicalDebt
content = content.replace(
    'async findTechnicalDebt(): Promise<TechnicalDebtItem[]>',
    'findTechnicalDebt(): TechnicalDebtItem[]'
);

fs.writeFileSync('src/infrastructure/analysis/codebase/KnownIssuesAnalyzer.ts', content);
console.log('Fixed initial issues in KnownIssuesAnalyzer.ts');
