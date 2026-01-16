
import { analyzeCodebase, generateCodebaseDocs } from './src/infrastructure/analysis/index.ts';

async function verify() {
    try {
        console.log('Starting analysis...');
        // Generate documentation for Nexus itself
        const docs = await analyzeCodebase('.');

        console.log('--- Analysis Results ---');
        console.log('Architecture layers:', docs.architecture.layers.length);
        console.log('Patterns found:', docs.patterns.architecturalPatterns.length);
        console.log('External deps:', docs.dependencies.externalDependencies.length);
        console.log('Public interfaces:', docs.apiSurface.publicInterfaces.length);
        console.log('Tech debt items:', docs.knownIssues.technicalDebt.length);

        // Save to files
        console.log('Saving docs to .nexus/codebase...');
        await generateCodebaseDocs('.', '.nexus/codebase');
        console.log('Done!');
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
