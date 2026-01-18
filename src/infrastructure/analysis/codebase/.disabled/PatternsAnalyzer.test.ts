/**
 * PatternsAnalyzer Tests
 *
 * Tests for the patterns analyzer that generates PATTERNS.md documentation.
 *
 * @module infrastructure/analysis/codebase/PatternsAnalyzer.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { RepoMap, SymbolEntry, DependencyEdge, FileEntry } from '../types';
import { PatternsAnalyzer } from './PatternsAnalyzer';
import type { AnalyzerOptions } from './types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockRepoMap(): RepoMap {
  const symbols: SymbolEntry[] = [
    // Repository pattern examples
    {
      id: 'src/persistence/database/ProjectRepository.ts#ProjectRepository#10',
      name: 'ProjectRepository',
      kind: 'class',
      file: 'src/persistence/database/ProjectRepository.ts',
      line: 10,
      endLine: 100,
      column: 0,
      signature: 'class ProjectRepository',
      exported: true,
      references: 15,
      modifiers: ['export'],
    },
    {
      id: 'src/persistence/database/UserDB.ts#UserDB#5',
      name: 'UserDB',
      kind: 'class',
      file: 'src/persistence/database/UserDB.ts',
      line: 5,
      endLine: 80,
      column: 0,
      signature: 'class UserDB',
      exported: true,
      references: 10,
      modifiers: ['export'],
    },
    // Service pattern examples
    {
      id: 'src/orchestration/AgentService.ts#AgentService#15',
      name: 'AgentService',
      kind: 'class',
      file: 'src/orchestration/AgentService.ts',
      line: 15,
      endLine: 150,
      column: 0,
      signature: 'class AgentService',
      exported: true,
      references: 20,
      modifiers: ['export'],
    },
    // Factory pattern examples
    {
      id: 'src/execution/createExecutor.ts#createExecutor#5',
      name: 'createExecutor',
      kind: 'function',
      file: 'src/execution/createExecutor.ts',
      line: 5,
      endLine: 25,
      column: 0,
      signature: 'function createExecutor(config: ExecutorConfig): Executor',
      exported: true,
      references: 8,
      modifiers: ['export'],
    },
    {
      id: 'src/planning/buildStrategy.ts#buildStrategy#10',
      name: 'buildStrategy',
      kind: 'function',
      file: 'src/planning/buildStrategy.ts',
      line: 10,
      endLine: 30,
      column: 0,
      signature: 'function buildStrategy(params: StrategyParams): Strategy',
      exported: true,
      references: 6,
      modifiers: ['export'],
    },
    // Singleton pattern examples
    {
      id: 'src/infrastructure/config/ConfigManager.ts#getInstance#25',
      name: 'getInstance',
      kind: 'method',
      file: 'src/infrastructure/config/ConfigManager.ts',
      line: 25,
      endLine: 30,
      column: 4,
      signature: 'static getInstance(): ConfigManager',
      exported: false,
      references: 12,
      modifiers: ['static'],
      parentId: 'ConfigManager',
    },
    // Observer pattern - EventBus
    {
      id: 'src/infrastructure/events/EventBus.ts#EventBus#10',
      name: 'EventBus',
      kind: 'class',
      file: 'src/infrastructure/events/EventBus.ts',
      line: 10,
      endLine: 80,
      column: 0,
      signature: 'class EventBus',
      exported: true,
      references: 25,
      modifiers: ['export'],
    },
    {
      id: 'src/infrastructure/events/EventBus.ts#subscribe#30',
      name: 'subscribe',
      kind: 'method',
      file: 'src/infrastructure/events/EventBus.ts',
      line: 30,
      endLine: 40,
      column: 4,
      signature: 'subscribe(event: string, handler: EventHandler): () => void',
      exported: false,
      references: 18,
      modifiers: [],
      parentId: 'EventBus',
    },
    // Adapter pattern
    {
      id: 'src/infrastructure/adapters/LLMAdapter.ts#LLMAdapter#5',
      name: 'LLMAdapter',
      kind: 'class',
      file: 'src/infrastructure/adapters/LLMAdapter.ts',
      line: 5,
      endLine: 60,
      column: 0,
      signature: 'class LLMAdapter',
      exported: true,
      references: 8,
      modifiers: ['export'],
    },
    // Type guard pattern
    {
      id: 'src/utils/typeGuards.ts#isValidProject#5',
      name: 'isValidProject',
      kind: 'function',
      file: 'src/utils/typeGuards.ts',
      line: 5,
      endLine: 10,
      column: 0,
      signature: 'function isValidProject(obj: unknown): obj is Project',
      exported: true,
      references: 5,
      modifiers: ['export'],
    },
    // Async function example
    {
      id: 'src/orchestration/AgentService.ts#runWorkflow#50',
      name: 'runWorkflow',
      kind: 'method',
      file: 'src/orchestration/AgentService.ts',
      line: 50,
      endLine: 80,
      column: 4,
      signature: 'async runWorkflow(projectId: string): Promise<WorkflowResult>',
      exported: false,
      references: 10,
      modifiers: ['async'],
      parentId: 'AgentService',
    },
    // Interface with I prefix
    {
      id: 'src/infrastructure/types.ts#IAnalyzer#10',
      name: 'IAnalyzer',
      kind: 'interface',
      file: 'src/infrastructure/types.ts',
      line: 10,
      endLine: 20,
      column: 0,
      signature: 'interface IAnalyzer',
      exported: true,
      references: 8,
      modifiers: ['export'],
    },
    // Interface without I prefix
    {
      id: 'src/persistence/types.ts#Project#5',
      name: 'Project',
      kind: 'interface',
      file: 'src/persistence/types.ts',
      line: 5,
      endLine: 15,
      column: 0,
      signature: 'interface Project',
      exported: true,
      references: 15,
      modifiers: ['export'],
    },
    // Constant naming
    {
      id: 'src/config/constants.ts#DEFAULT_CONFIG#5',
      name: 'DEFAULT_CONFIG',
      kind: 'constant',
      file: 'src/config/constants.ts',
      line: 5,
      endLine: 10,
      column: 0,
      signature: 'const DEFAULT_CONFIG: Config',
      exported: true,
      references: 7,
      modifiers: ['export', 'const'],
    },
    {
      id: 'src/config/constants.ts#MAX_RETRIES#12',
      name: 'MAX_RETRIES',
      kind: 'constant',
      file: 'src/config/constants.ts',
      line: 12,
      endLine: 12,
      column: 0,
      signature: 'const MAX_RETRIES = 3',
      exported: true,
      references: 4,
      modifiers: ['export', 'const'],
    },
    // Store pattern
    {
      id: 'src/ui/stores/projectStore.ts#projectStore#10',
      name: 'projectStore',
      kind: 'constant',
      file: 'src/ui/stores/projectStore.ts',
      line: 10,
      endLine: 40,
      column: 0,
      signature: 'const projectStore = create<ProjectState>()',
      exported: true,
      references: 12,
      modifiers: ['export', 'const'],
    },
    // Handler pattern
    {
      id: 'src/execution/handlers/FileHandler.ts#FileHandler#5',
      name: 'FileHandler',
      kind: 'class',
      file: 'src/execution/handlers/FileHandler.ts',
      line: 5,
      endLine: 50,
      column: 0,
      signature: 'class FileHandler',
      exported: true,
      references: 6,
      modifiers: ['export'],
    },
    // React component
    {
      id: 'src/ui/components/Button.tsx#Button#5',
      name: 'Button',
      kind: 'function',
      file: 'src/ui/components/Button.tsx',
      line: 5,
      endLine: 30,
      column: 0,
      signature: 'function Button(props: ButtonProps): JSX.Element',
      exported: true,
      references: 20,
      modifiers: ['export'],
    },
    // Props type
    {
      id: 'src/ui/components/Button.tsx#ButtonProps#3',
      name: 'ButtonProps',
      kind: 'interface',
      file: 'src/ui/components/Button.tsx',
      line: 3,
      endLine: 5,
      column: 0,
      signature: 'interface ButtonProps',
      exported: true,
      references: 5,
      modifiers: ['export'],
    },
    // Getter function
    {
      id: 'src/utils/getters.ts#getProjectPath#5',
      name: 'getProjectPath',
      kind: 'function',
      file: 'src/utils/getters.ts',
      line: 5,
      endLine: 10,
      column: 0,
      signature: 'function getProjectPath(project: Project): string',
      exported: true,
      references: 8,
      modifiers: ['export'],
    },
    // Validator function
    {
      id: 'src/quality/validators/validateConfig.ts#validateConfig#5',
      name: 'validateConfig',
      kind: 'function',
      file: 'src/quality/validators/validateConfig.ts',
      line: 5,
      endLine: 30,
      column: 0,
      signature: 'function validateConfig(config: Config): ValidationResult',
      exported: true,
      references: 6,
      modifiers: ['export'],
    },
  ];

  const files: FileEntry[] = [
    // Test files (co-located)
    {
      path: '/project/src/persistence/database/ProjectRepository.test.ts',
      relativePath: 'src/persistence/database/ProjectRepository.test.ts',
      language: 'typescript',
      size: 1000,
      lastModified: new Date(),
      symbolCount: 5,
      lineCount: 50,
    },
    {
      path: '/project/src/orchestration/AgentService.test.ts',
      relativePath: 'src/orchestration/AgentService.test.ts',
      language: 'typescript',
      size: 1500,
      lastModified: new Date(),
      symbolCount: 10,
      lineCount: 80,
    },
    // Source files
    {
      path: '/project/src/persistence/database/ProjectRepository.ts',
      relativePath: 'src/persistence/database/ProjectRepository.ts',
      language: 'typescript',
      size: 2000,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 100,
    },
    {
      path: '/project/src/persistence/database/UserDB.ts',
      relativePath: 'src/persistence/database/UserDB.ts',
      language: 'typescript',
      size: 1500,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 80,
    },
    {
      path: '/project/src/orchestration/AgentService.ts',
      relativePath: 'src/orchestration/AgentService.ts',
      language: 'typescript',
      size: 3000,
      lastModified: new Date(),
      symbolCount: 2,
      lineCount: 150,
    },
    {
      path: '/project/src/execution/createExecutor.ts',
      relativePath: 'src/execution/createExecutor.ts',
      language: 'typescript',
      size: 500,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 25,
    },
    {
      path: '/project/src/planning/buildStrategy.ts',
      relativePath: 'src/planning/buildStrategy.ts',
      language: 'typescript',
      size: 600,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 30,
    },
    {
      path: '/project/src/infrastructure/config/ConfigManager.ts',
      relativePath: 'src/infrastructure/config/ConfigManager.ts',
      language: 'typescript',
      size: 800,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 40,
    },
    {
      path: '/project/src/infrastructure/events/EventBus.ts',
      relativePath: 'src/infrastructure/events/EventBus.ts',
      language: 'typescript',
      size: 1200,
      lastModified: new Date(),
      symbolCount: 2,
      lineCount: 80,
    },
    {
      path: '/project/src/infrastructure/adapters/LLMAdapter.ts',
      relativePath: 'src/infrastructure/adapters/LLMAdapter.ts',
      language: 'typescript',
      size: 1000,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 60,
    },
    {
      path: '/project/src/utils/typeGuards.ts',
      relativePath: 'src/utils/typeGuards.ts',
      language: 'typescript',
      size: 300,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 15,
    },
    {
      path: '/project/src/infrastructure/types.ts',
      relativePath: 'src/infrastructure/types.ts',
      language: 'typescript',
      size: 500,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 30,
    },
    {
      path: '/project/src/persistence/types.ts',
      relativePath: 'src/persistence/types.ts',
      language: 'typescript',
      size: 400,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 20,
    },
    {
      path: '/project/src/config/constants.ts',
      relativePath: 'src/config/constants.ts',
      language: 'typescript',
      size: 200,
      lastModified: new Date(),
      symbolCount: 2,
      lineCount: 15,
    },
    {
      path: '/project/src/ui/stores/projectStore.ts',
      relativePath: 'src/ui/stores/projectStore.ts',
      language: 'typescript',
      size: 700,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 40,
    },
    {
      path: '/project/src/execution/handlers/FileHandler.ts',
      relativePath: 'src/execution/handlers/FileHandler.ts',
      language: 'typescript',
      size: 900,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 50,
    },
    {
      path: '/project/src/ui/components/Button.tsx',
      relativePath: 'src/ui/components/Button.tsx',
      language: 'typescript',
      size: 600,
      lastModified: new Date(),
      symbolCount: 2,
      lineCount: 30,
    },
    {
      path: '/project/src/utils/getters.ts',
      relativePath: 'src/utils/getters.ts',
      language: 'typescript',
      size: 250,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 12,
    },
    {
      path: '/project/src/quality/validators/validateConfig.ts',
      relativePath: 'src/quality/validators/validateConfig.ts',
      language: 'typescript',
      size: 700,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 35,
    },
    // Index files
    {
      path: '/project/src/persistence/index.ts',
      relativePath: 'src/persistence/index.ts',
      language: 'typescript',
      size: 100,
      lastModified: new Date(),
      symbolCount: 0,
      lineCount: 5,
    },
    {
      path: '/project/src/infrastructure/index.ts',
      relativePath: 'src/infrastructure/index.ts',
      language: 'typescript',
      size: 150,
      lastModified: new Date(),
      symbolCount: 0,
      lineCount: 8,
    },
    // Types file
    {
      path: '/project/src/persistence/types.ts',
      relativePath: 'src/persistence/types.ts',
      language: 'typescript',
      size: 400,
      lastModified: new Date(),
      symbolCount: 1,
      lineCount: 20,
    },
    // Config files
    {
      path: '/project/vitest.config.ts',
      relativePath: 'vitest.config.ts',
      language: 'typescript',
      size: 200,
      lastModified: new Date(),
      symbolCount: 0,
      lineCount: 15,
    },
  ];

  const dependencies: DependencyEdge[] = [
    {
      from: 'src/orchestration/AgentService.ts',
      to: 'src/persistence/database/ProjectRepository.ts',
      type: 'import',
      symbols: ['ProjectRepository'],
    },
    {
      from: 'src/orchestration/AgentService.ts',
      to: 'src/infrastructure/events/EventBus.ts',
      type: 'import',
      symbols: ['EventBus'],
    },
  ];

  return {
    projectPath: '/project',
    generatedAt: new Date(),
    files,
    symbols,
    dependencies,
    stats: {
      totalFiles: files.length,
      totalSymbols: symbols.length,
      totalDependencies: dependencies.length,
      languageBreakdown: { typescript: files.length },
      symbolBreakdown: {
        class: 7,
        interface: 4,
        function: 6,
        method: 3,
        property: 0,
        variable: 0,
        constant: 3,
        type: 0,
        enum: 0,
        enum_member: 0,
        namespace: 0,
        module: 0,
      },
      largestFiles: [],
      mostReferencedSymbols: [],
      mostConnectedFiles: [],
      generationTime: 100,
    },
  };
}

function createOptions(): AnalyzerOptions {
  return {
    projectPath: '/project',
    generateDiagrams: true,
    maxExamples: 3,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('PatternsAnalyzer', () => {
  let analyzer: PatternsAnalyzer;
  let repoMap: RepoMap;
  let options: AnalyzerOptions;

  beforeEach(() => {
    repoMap = createMockRepoMap();
    options = createOptions();
    analyzer = new PatternsAnalyzer(repoMap, options);
  });

  describe('analyze', () => {
    it('should return complete PatternsDoc', async () => {
      const doc = await analyzer.analyze();

      expect(doc).toHaveProperty('overview');
      expect(doc).toHaveProperty('architecturalPatterns');
      expect(doc).toHaveProperty('codingPatterns');
      expect(doc).toHaveProperty('namingConventions');
      expect(doc).toHaveProperty('fileOrganization');
    });

    it('should generate a non-empty overview', async () => {
      const doc = await analyzer.analyze();

      expect(doc.overview).toBeTruthy();
      expect(doc.overview.length).toBeGreaterThan(20);
    });
  });

  describe('architectural pattern detection', () => {
    it('should detect Repository pattern', async () => {
      const doc = await analyzer.analyze();

      const repoPattern = doc.architecturalPatterns.find(p => p.name === 'Repository Pattern');
      expect(repoPattern).toBeDefined();
      expect(repoPattern?.examples.length).toBeGreaterThan(0);
    });

    it('should detect Service pattern', async () => {
      const doc = await analyzer.analyze();

      const servicePattern = doc.architecturalPatterns.find(p => p.name === 'Service Pattern');
      expect(servicePattern).toBeDefined();
    });

    it('should detect Factory pattern', async () => {
      const doc = await analyzer.analyze();

      const factoryPattern = doc.architecturalPatterns.find(p => p.name === 'Factory Pattern');
      expect(factoryPattern).toBeDefined();
      expect(factoryPattern?.examples.some(e =>
        e.file.includes('createExecutor') || e.file.includes('buildStrategy')
      )).toBe(true);
    });

    it('should detect Singleton pattern', async () => {
      const doc = await analyzer.analyze();

      const singletonPattern = doc.architecturalPatterns.find(p => p.name === 'Singleton Pattern');
      expect(singletonPattern).toBeDefined();
    });

    it('should detect Observer pattern', async () => {
      const doc = await analyzer.analyze();

      const observerPattern = doc.architecturalPatterns.find(p => p.name === 'Observer Pattern');
      expect(observerPattern).toBeDefined();
    });

    it('should detect Adapter pattern', async () => {
      const doc = await analyzer.analyze();

      const adapterPattern = doc.architecturalPatterns.find(p => p.name === 'Adapter Pattern');
      expect(adapterPattern).toBeDefined();
    });

    it('should include description for each pattern', async () => {
      const doc = await analyzer.analyze();

      for (const pattern of doc.architecturalPatterns) {
        expect(pattern.description).toBeTruthy();
      }
    });

    it('should include whenToUse for each pattern', async () => {
      const doc = await analyzer.analyze();

      for (const pattern of doc.architecturalPatterns) {
        expect(pattern.whenToUse).toBeTruthy();
      }
    });
  });

  describe('coding pattern detection', () => {
    it('should detect async/await pattern', async () => {
      const doc = await analyzer.analyze();

      const asyncPattern = doc.codingPatterns.find(p => p.name === 'Async/Await Pattern');
      expect(asyncPattern).toBeDefined();
    });

    it('should detect type guards pattern', async () => {
      const doc = await analyzer.analyze();

      const typeGuardPattern = doc.codingPatterns.find(p => p.name === 'Type Guards Pattern');
      expect(typeGuardPattern).toBeDefined();
    });

    it('should include examples for coding patterns', async () => {
      const doc = await analyzer.analyze();

      for (const pattern of doc.codingPatterns) {
        expect(Array.isArray(pattern.examples)).toBe(true);
      }
    });
  });

  describe('naming convention detection', () => {
    it('should detect class naming convention', async () => {
      const doc = await analyzer.analyze();

      const classConvention = doc.namingConventions.find(n => n.element === 'class');
      expect(classConvention).toBeDefined();
      expect(classConvention?.convention).toBe('PascalCase');
    });

    it('should detect interface naming convention', async () => {
      const doc = await analyzer.analyze();

      const interfaceConvention = doc.namingConventions.find(n => n.element === 'interface');
      expect(interfaceConvention).toBeDefined();
    });

    it('should detect function naming convention', async () => {
      const doc = await analyzer.analyze();

      const funcConvention = doc.namingConventions.find(n => n.element === 'function');
      expect(funcConvention).toBeDefined();
      // Convention may be 'Mixed' due to React components (PascalCase) mixed with regular functions (camelCase)
      expect(['camelCase', 'Mixed']).toContain(funcConvention?.convention);
    });

    it('should detect constant naming convention', async () => {
      const doc = await analyzer.analyze();

      const constConvention = doc.namingConventions.find(n => n.element === 'constant');
      expect(constConvention).toBeDefined();
    });

    it('should include examples for conventions', async () => {
      const doc = await analyzer.analyze();

      for (const convention of doc.namingConventions) {
        expect(convention.examples).toBeDefined();
        expect(convention.examples.length).toBeGreaterThan(0);
      }
    });
  });

  describe('file organization detection', () => {
    it('should detect test file organization', async () => {
      const doc = await analyzer.analyze();

      const testOrg = doc.fileOrganization.find(f => f.pattern.includes('.test.ts'));
      expect(testOrg).toBeDefined();
    });

    it('should detect types file organization', async () => {
      const doc = await analyzer.analyze();

      const typesOrg = doc.fileOrganization.find(f => f.pattern.includes('types.ts'));
      expect(typesOrg).toBeDefined();
    });

    it('should detect index file organization', async () => {
      const doc = await analyzer.analyze();

      const indexOrg = doc.fileOrganization.find(f => f.pattern.includes('index.ts'));
      expect(indexOrg).toBeDefined();
    });

    it('should include location for file organization rules', async () => {
      const doc = await analyzer.analyze();

      for (const rule of doc.fileOrganization) {
        expect(rule.location).toBeTruthy();
      }
    });

    it('should include purpose for file organization rules', async () => {
      const doc = await analyzer.analyze();

      for (const rule of doc.fileOrganization) {
        expect(rule.purpose).toBeTruthy();
      }
    });
  });

  describe('toMarkdown', () => {
    it('should generate valid markdown', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('# Patterns Documentation');
      expect(markdown).toContain('## Overview');
    });

    it('should include architectural patterns section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Architectural Patterns');
    });

    it('should include coding patterns section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Coding Patterns');
    });

    it('should include naming conventions section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## Naming Conventions');
      expect(markdown).toContain('| Element | Convention |');
    });

    it('should include file organization section', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('## File Organization');
    });

    it('should include generation timestamp', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('Generated:');
    });

    it('should include examples for patterns', async () => {
      const doc = await analyzer.analyze();
      const markdown = analyzer.toMarkdown(doc);

      expect(markdown).toContain('**Examples:**');
    });
  });

  describe('with limited examples option', () => {
    it('should respect maxExamples option', async () => {
      const limitedOptions = { ...options, maxExamples: 1 };
      const limitedAnalyzer = new PatternsAnalyzer(repoMap, limitedOptions);

      const doc = await limitedAnalyzer.analyze();

      for (const pattern of doc.architecturalPatterns) {
        expect(pattern.examples.length).toBeLessThanOrEqual(1);
      }
    });
  });
});
