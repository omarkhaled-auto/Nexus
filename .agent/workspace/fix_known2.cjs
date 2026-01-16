const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/KnownIssuesAnalyzer.ts', 'utf8');

// Fix all id: `DEBT-${idCounter++}` patterns
content = content.replace(
    /id: `DEBT-\$\{idCounter\+\+\}`/g,
    'id: `DEBT-${String(idCounter++)}`'
);

// Fix all location: `${symbol.file}:${symbol.line}` patterns
content = content.replace(
    /location: `\$\{symbol\.file\}:\$\{symbol\.line\}`/g,
    'location: `${symbol.file}:${String(symbol.line)}`'
);

fs.writeFileSync('src/infrastructure/analysis/codebase/KnownIssuesAnalyzer.ts', content);
console.log('Fixed id and location template literals');
