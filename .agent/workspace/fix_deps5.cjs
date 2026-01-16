const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/DependenciesAnalyzer.ts', 'utf8');

// Fix line 200: externalCount and internalModuleCount
content = content.replace(
    '`This codebase manages ${externalCount} external npm dependencies and ${internalModuleCount} internal modules. `',
    '`This codebase manages ${String(externalCount)} external npm dependencies and ${String(internalModuleCount)} internal modules. `'
);

// Fix line 206: circularCount
content = content.replace(
    '`**Note:** ${circularCount} circular dependencies were detected. `',
    '`**Note:** ${String(circularCount)} circular dependencies were detected. `'
);

fs.writeFileSync('src/infrastructure/analysis/codebase/DependenciesAnalyzer.ts', content);
console.log('Fixed lines 200, 206');
