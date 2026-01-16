const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/DataFlowAnalyzer.ts', 'utf8');

// Fix line 77: ${dataStores.length}
content = content.replace(
    '`and ${dataStores.length} data stores for persistence.`',
    '`and ${String(dataStores.length)} data stores for persistence.`'
);

// Fix line 82: ${stateManagement.stores.length}
content = content.replace(
    '`The application maintains ${stateManagement.stores.length} state stores `',
    '`The application maintains ${String(stateManagement.stores.length)} state stores `'
);

// Fix line 90: ${eventFlows.length}
content = content.replace(
    '`Event-driven communication is used in ${eventFlows.length} flows, `',
    '`Event-driven communication is used in ${String(eventFlows.length)} flows, `'
);

// Fix line 97: ${transformations.length}
content = content.replace(
    '`Data transformations are handled by ${transformations.length} adapters/transformers `',
    '`Data transformations are handled by ${String(transformations.length)} adapters/transformers `'
);

fs.writeFileSync('src/infrastructure/analysis/codebase/DataFlowAnalyzer.ts', content);
console.log('Fixed template literals in generateOverview');
