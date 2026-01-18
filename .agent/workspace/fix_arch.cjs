const fs = require('fs');
let content = fs.readFileSync('src/infrastructure/analysis/codebase/ArchitectureAnalyzer.ts', 'utf8');

// Fix line 574: `#### ${layer.number}. ${layer.name}`
content = content.replace(
    '`#### ${layer.number}. ${layer.name}`',
    '`#### ${String(layer.number)}. ${layer.name}`'
);

// Fix line 686: id: `L${layer.number}`,
content = content.replace(
    "id: `L${layer.number}`",
    "id: `L${String(layer.number)}`"
);

// Fix line 687: label: `${layer.number}. ${layer.name}`,
content = content.replace(
    "label: `${layer.number}. ${layer.name}`",
    "label: `${String(layer.number)}. ${layer.name}`"
);

// Fix lines 699-700: from: `L${currentLayer.number}`, to: `L${nextLayer.number}`,
content = content.replace(
    "from: `L${currentLayer.number}`",
    "from: `L${String(currentLayer.number)}`"
);
content = content.replace(
    "to: `L${nextLayer.number}`",
    "to: `L${String(nextLayer.number)}`"
);

fs.writeFileSync('src/infrastructure/analysis/codebase/ArchitectureAnalyzer.ts', content);
console.log('Fixed layer.number template literals');
