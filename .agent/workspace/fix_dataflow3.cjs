const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/DataFlowAnalyzer.ts', 'utf8');

// Fix: id: `handler${i}`,
content = content.replace(
    /id: `handler\$\{i\}`/g,
    'id: `handler${String(i)}`'
);

// Fix: label: h.split(' ')[0] || `Handler ${i + 1}`,
content = content.replace(
    /`Handler \$\{i \+ 1\}`/g,
    '`Handler ${String(i + 1)}`'
);

// Fix: to: `handler${i}`,
content = content.replace(
    /to: `handler\$\{i\}`/g,
    'to: `handler${String(i)}`'
);

fs.writeFileSync('src/infrastructure/analysis/codebase/DataFlowAnalyzer.ts', content);
console.log('Fixed handler template literals');
