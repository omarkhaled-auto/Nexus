const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/KnownIssuesAnalyzer.ts', 'utf8');

// Line 294: Fix unused parameter limitations - prefix with underscore
content = content.replace(
    '  private suggestImprovements(\n    debt: TechnicalDebtItem[],\n    limitations: LimitationDoc[]',
    '  private suggestImprovements(\n    debt: TechnicalDebtItem[],\n    _limitations: LimitationDoc[]'
);

// Also check line 280 for any number issue
const lines = content.split('\n');
console.log('Line 280:', lines[279]);

fs.writeFileSync('src/infrastructure/analysis/codebase/KnownIssuesAnalyzer.ts', content);
console.log('Fixed unused limitations parameter');
