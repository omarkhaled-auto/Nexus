const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/DependenciesAnalyzer.ts', 'utf8');

// Lines 513 & 550: Fix unnecessary conditionals - d.symbols is always an array
content = content.replace(
    /\(d\.symbols \|\| \[\]\)\.map\(s => \(\{ local: s \}\)\)/g,
    'd.symbols.map(s => ({ local: s }))'
);

// Lines 589: Fix string | undefined template expression
// Need to check context first
console.log('Checking line 589...');
const lines = content.split('\n');
console.log('Line 589:', lines[588]);

fs.writeFileSync('src/infrastructure/analysis/codebase/DependenciesAnalyzer.ts', content);
console.log('Fixed unnecessary conditionals');
