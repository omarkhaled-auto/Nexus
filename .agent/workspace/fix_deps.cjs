const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/DependenciesAnalyzer.ts', 'utf8');

// Line 171: Fix the path.resolve import by using named import properly
// The issue is that resolve could be unbound. Use path.resolve() instead
content = content.replace(
    "const { readFile } = await import('fs/promises');\n        const { resolve } = await import('path');\n        const fullPath = resolve(this.options.projectPath, 'package.json');",
    "const { readFile } = await import('fs/promises');\n        const path = await import('path');\n        const fullPath = path.resolve(this.options.projectPath, 'package.json');"
);

// Line 200: Fix template literals with numbers
content = content.replace(
    '`Analyzing ${internalModuleCount} internal modules with ${externalPackageCount} external package dependencies. `',
    '`Analyzing ${String(internalModuleCount)} internal modules with ${String(externalPackageCount)} external package dependencies. `'
);

// Line 206
content = content.replace(
    '`Tracking ${circularCount} circular dependencies that may need refactoring.`',
    '`Tracking ${String(circularCount)} circular dependencies that may need refactoring.`'
);

fs.writeFileSync('src/infrastructure/analysis/codebase/DependenciesAnalyzer.ts', content);
console.log('Fixed DependenciesAnalyzer.ts initial issues');
