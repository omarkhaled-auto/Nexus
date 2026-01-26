/**
 * Test Helper Factory Functions
 *
 * Provides properly typed mock factories for RepoMap-related types.
 * These helpers ensure test mocks match the actual type definitions.
 *
 * @module infrastructure/analysis/codebase/__testHelpers
 */

import type {
  FileEntry,
  SymbolEntry,
  SymbolKind,
  DependencyEdge,
  DependencyType,
  RepoMapStats,
  RepoMap,
} from '../types';

/**
 * Create a mock FileEntry with all required fields
 */
export function createMockFileEntry(
  overrides: Partial<FileEntry> & { relativePath: string }
): FileEntry {
  const relativePath = overrides.relativePath;
  return {
    path: overrides.path ?? `/test/project/${relativePath}`,
    relativePath,
    language: overrides.language ?? 'typescript',
    size: overrides.size ?? 100,
    lastModified: overrides.lastModified ?? new Date(),
    symbolCount: overrides.symbolCount ?? 0,
    lineCount: overrides.lineCount ?? 10,
  };
}

/**
 * Create a mock SymbolEntry with all required fields
 */
export function createMockSymbolEntry(
  overrides: Partial<SymbolEntry> & { name: string; kind: SymbolKind; file: string }
): SymbolEntry {
  const { name, kind, file, line = 1 } = overrides;
  return {
    id: overrides.id ?? `${file}#${name}#${line}`,
    name,
    kind,
    file,
    line,
    endLine: overrides.endLine ?? line + 10,
    column: overrides.column ?? 0,
    signature: overrides.signature ?? `${kind} ${name}`,
    documentation: overrides.documentation,
    references: overrides.references ?? 0,
    exported: overrides.exported ?? false,
    parentId: overrides.parentId,
    modifiers: overrides.modifiers ?? [],
  };
}

/**
 * Create a mock DependencyEdge with all required fields
 */
export function createMockDependencyEdge(
  overrides: Partial<DependencyEdge> & { from: string; to: string; type: DependencyType }
): DependencyEdge {
  return {
    from: overrides.from,
    to: overrides.to,
    type: overrides.type,
    symbols: overrides.symbols ?? [],
    statement: overrides.statement,
    line: overrides.line,
  };
}

/**
 * Create a mock RepoMapStats with all required fields
 */
export function createMockRepoMapStats(
  overrides?: Partial<RepoMapStats>
): RepoMapStats {
  return {
    totalFiles: overrides?.totalFiles ?? 0,
    totalSymbols: overrides?.totalSymbols ?? 0,
    totalDependencies: overrides?.totalDependencies ?? 0,
    languageBreakdown: overrides?.languageBreakdown ?? { typescript: 0, javascript: 0 },
    symbolBreakdown: overrides?.symbolBreakdown ?? {
      class: 0,
      interface: 0,
      function: 0,
      method: 0,
      property: 0,
      variable: 0,
      constant: 0,
      type: 0,
      enum: 0,
      enum_member: 0,
      namespace: 0,
      module: 0,
    },
    largestFiles: overrides?.largestFiles ?? [],
    mostReferencedSymbols: overrides?.mostReferencedSymbols ?? [],
    mostConnectedFiles: overrides?.mostConnectedFiles ?? [],
    generationTime: overrides?.generationTime ?? 0,
  };
}

/**
 * Create a mock RepoMap with all required fields
 */
export function createMockRepoMap(
  overrides?: Partial<RepoMap>
): RepoMap {
  const files = overrides?.files ?? [];
  const symbols = overrides?.symbols ?? [];
  const dependencies = overrides?.dependencies ?? [];

  return {
    projectPath: overrides?.projectPath ?? '/test/project',
    generatedAt: overrides?.generatedAt ?? new Date(),
    files,
    symbols,
    dependencies,
    stats: overrides?.stats ?? createMockRepoMapStats({
      totalFiles: files.length,
      totalSymbols: symbols.length,
      totalDependencies: dependencies.length,
      languageBreakdown: { typescript: files.length, javascript: 0 },
    }),
  };
}

/**
 * Shorthand to create a file entry with just the relative path
 */
export function mockFile(relativePath: string, overrides?: Partial<FileEntry>): FileEntry {
  return createMockFileEntry({ relativePath, ...overrides });
}

/**
 * Shorthand to create a symbol entry
 */
export function mockSymbol(
  name: string,
  kind: SymbolKind,
  file: string,
  exported = false,
  overrides?: Partial<SymbolEntry>
): SymbolEntry {
  return createMockSymbolEntry({ name, kind, file, exported, ...overrides });
}

/**
 * Shorthand to create a dependency edge
 */
export function mockDependency(
  from: string,
  to: string,
  type: DependencyType = 'import'
): DependencyEdge {
  return createMockDependencyEdge({ from, to, type });
}
