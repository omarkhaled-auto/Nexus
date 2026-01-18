const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/DependenciesAnalyzer.ts', 'utf8');

// Line 589: Fix string | undefined in template
content = content.replace(
    "return `Extract shared functionality into a new module that both ${cycle[0]} and ${cycle[1]} can import.`;",
    "return `Extract shared functionality into a new module that both ${cycle[0] ?? 'file1'} and ${cycle[1] ?? 'file2'} can import.`;"
);

fs.writeFileSync('src/infrastructure/analysis/codebase/DependenciesAnalyzer.ts', content);
console.log('Fixed line 589');
