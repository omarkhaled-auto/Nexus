const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/DependenciesAnalyzer.ts', 'utf8');

// Line 653: `- ... and ${mod.exports.length - 10} more`
content = content.replace(
    '`- ... and ${mod.exports.length - 10} more`',
    '`- ... and ${String(mod.exports.length - 10)} more`'
);

// Line 659: `**Imported by:** ${mod.importedBy.length} file(s)`
content = content.replace(
    '`**Imported by:** ${mod.importedBy.length} file(s)`',
    '`**Imported by:** ${String(mod.importedBy.length)} file(s)`'
);

// Line 679: `Found ${doc.circularDependencies.length} circular dependencies:`
content = content.replace(
    '`Found ${doc.circularDependencies.length} circular dependencies:`',
    '`Found ${String(doc.circularDependencies.length)} circular dependencies:`'
);

// Line 683: `### Cycle ${i + 1} (${cd.severity} severity)`
content = content.replace(
    '`### Cycle ${i + 1} (${cd.severity} severity)`',
    '`### Cycle ${String(i + 1)} (${cd.severity} severity)`'
);

fs.writeFileSync('src/infrastructure/analysis/codebase/DependenciesAnalyzer.ts', content);
console.log('Fixed remaining template literals');
