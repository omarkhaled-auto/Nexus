const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/PatternsAnalyzer.ts', 'utf8');

// Line 209: Remove async from analyze
content = content.replace(
    'async analyze(): Promise<PatternsDoc>',
    'analyze(): PatternsDoc'
);

// Line 241: archPatterns.length
content = content.replace(
    '`This codebase follows ${archPatterns.length} architectural patterns and `',
    '`This codebase follows ${String(archPatterns.length)} architectural patterns and `'
);

// Line 242: codePatterns.length
content = content.replace(
    '`${codePatterns.length} coding patterns. The following document describes `',
    '`${String(codePatterns.length)} coding patterns. The following document describes `'
);

// Line 257: conventions.length
content = content.replace(
    '`${conventions.length} documented rules for naming different code elements.`',
    '`${String(conventions.length)} documented rules for naming different code elements.`'
);

// Line 329: symbol.line and symbol.endLine
content = content.replace(
    "lines: `${symbol.line}-${symbol.endLine || symbol.line}`",
    "lines: `${String(symbol.line)}-${String(symbol.endLine || symbol.line)}`"
);

fs.writeFileSync('src/infrastructure/analysis/codebase/PatternsAnalyzer.ts', content);
console.log('Fixed PatternsAnalyzer.ts');
