const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/DataFlowAnalyzer.ts', 'utf8');

// Line 41: Remove async from analyze method
content = content.replace(
    'async analyze(): Promise<DataFlowDoc>',
    'analyze(): DataFlowDoc'
);

// Fix template literal expressions with numbers - look for common patterns
// We'll use regex to find and replace template literals with number variables

// Common patterns to fix: ${stores.length}, ${count}, etc.
const numberVars = ['stores.length', 'events.length', 'ipcFlows.length', 'queries.length', 
                   'flows.length', 'dataStore.storeCount', 'data.stores.length', 
                   'data.events.length', 'data.ipcFlows.length', 'data.queries.length'];

// Fix .signature?. to .signature. (signature is always defined)
content = content.replace(/\.signature\?\./g, '.signature.');

// Fix unused variable eventSymbols
content = content.replace('const eventSymbols = ', 'const _eventSymbols = ');

fs.writeFileSync('src/infrastructure/analysis/codebase/DataFlowAnalyzer.ts', content);
console.log('Fixed DataFlowAnalyzer.ts basic issues');
