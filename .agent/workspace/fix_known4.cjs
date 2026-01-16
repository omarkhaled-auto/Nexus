const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/KnownIssuesAnalyzer.ts', 'utf8');

// Line 56: Remove await since findTechnicalDebt is no longer async
content = content.replace(
    'const technicalDebt = await this.findTechnicalDebt();',
    'const technicalDebt = this.findTechnicalDebt();'
);

// Also remove async from analyze since it no longer needs to be async
content = content.replace(
    'async analyze(): Promise<KnownIssuesDoc>',
    'analyze(): KnownIssuesDoc'
);

fs.writeFileSync('src/infrastructure/analysis/codebase/KnownIssuesAnalyzer.ts', content);
console.log('Fixed await and async issues');
