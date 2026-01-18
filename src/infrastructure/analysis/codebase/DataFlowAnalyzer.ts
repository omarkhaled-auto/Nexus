/**
 * Data Flow Analyzer
 *
 * Analyzes codebase data flow and generates DATA_FLOW.md documentation.
 * Documents state management, data stores, event flows, and data transformations.
 *
 * @module infrastructure/analysis/codebase/DataFlowAnalyzer
 */

import { BaseAnalyzer } from './BaseAnalyzer';
import type {
  DataFlowDoc,
  StateManagementDoc,
  StoreDoc,
  DataStoreDoc,
  EventFlowDoc,
  DataTransformationDoc,
} from './types';

/**
 * Analyzer that generates DATA_FLOW.md documentation
 *
 * Examines the codebase to:
 * - Document state management (Zustand stores)
 * - Identify data stores (SQLite, memory, files)
 * - Trace event flows
 * - Document data transformations
 *
 * @example
 * ```typescript
 * const analyzer = new DataFlowAnalyzer(repoMap, options);
 * const doc = await analyzer.analyze();
 * const markdown = analyzer.toMarkdown(doc);
 * ```
 */
export class DataFlowAnalyzer extends BaseAnalyzer {
  /**
   * Perform data flow analysis
   * @returns Data flow documentation
   */
  analyze(): DataFlowDoc {
    const stateManagement = this.analyzeStateManagement();
    const dataStores = this.analyzeDataStores();
    const eventFlows = this.analyzeEventFlows();
    const dataTransformations = this.analyzeDataTransformations();

    const overview = this.generateOverview(
      stateManagement,
      dataStores,
      eventFlows,
      dataTransformations
    );

    return {
      overview,
      stateManagement,
      dataStores,
      eventFlows,
      dataTransformations,
    };
  }

  /**
   * Generate data flow overview
   */
  private generateOverview(
    stateManagement: StateManagementDoc,
    dataStores: DataStoreDoc[],
    eventFlows: EventFlowDoc[],
    transformations: DataTransformationDoc[]
  ): string {
    const paragraphs: string[] = [];

    paragraphs.push(
      `This document describes how data flows through the application. ` +
      `The system uses ${stateManagement.approach} for UI state management ` +
      `and ${String(dataStores.length)} data stores for persistence.`
    );

    if (stateManagement.stores.length > 0) {
      paragraphs.push(
        `The application maintains ${String(stateManagement.stores.length)} state stores ` +
        `that manage different aspects of the application state. ` +
        stateManagement.persistence
      );
    }

    if (eventFlows.length > 0) {
      paragraphs.push(
        `Event-driven communication is used in ${String(eventFlows.length)} flows, ` +
        `enabling loose coupling between components.`
      );
    }

    if (transformations.length > 0) {
      paragraphs.push(
        `Data transformations are handled by ${String(transformations.length)} adapters/transformers ` +
        `that convert between different data formats.`
      );
    }

    return paragraphs.join('\n\n');
  }

  /**
   * Analyze state management
   */
  private analyzeStateManagement(): StateManagementDoc {
    const stores = this.findZustandStores();
    let approach = 'React Context/Props';
    let persistence = 'State is not persisted.';

    // Detect Zustand usage
    const hasZustand = this.repoMap.dependencies.some(d =>
      d.to === 'zustand' || d.to.startsWith('zustand/')
    );

    if (hasZustand) {
      approach = 'Zustand stores';
    }

    // Detect Redux usage
    const hasRedux = this.repoMap.dependencies.some(d =>
      d.to === 'redux' || d.to === '@reduxjs/toolkit' || d.to.includes('redux')
    );

    if (hasRedux) {
      approach = approach === 'Zustand stores'
        ? 'Zustand stores with Redux'
        : 'Redux';
    }

    // Detect Jotai/Recoil
    const hasJotai = this.repoMap.dependencies.some(d => d.to === 'jotai');
    const hasRecoil = this.repoMap.dependencies.some(d => d.to === 'recoil');

    if (hasJotai) approach = 'Jotai atoms';
    if (hasRecoil) approach = 'Recoil atoms';

    // Check for persistence
    const hasPersist = this.repoMap.symbols.some(s =>
      s.signature.includes('persist') ||
      s.name.includes('persist')
    );

    if (hasPersist) {
      persistence = 'State is persisted using middleware (localStorage/sessionStorage).';
    }

    const hasElectronStore = this.repoMap.dependencies.some(d =>
      d.to === 'electron-store'
    );

    if (hasElectronStore) {
      persistence = 'State is persisted using Electron store for desktop persistence.';
    }

    return {
      approach,
      stores,
      persistence,
    };
  }

  /**
   * Find Zustand stores
   */
  private findZustandStores(): StoreDoc[] {
    const stores: StoreDoc[] = [];
    const seenStores = new Set<string>();

    // Look for create() from zustand or useStore patterns
    for (const symbol of this.repoMap.symbols) {
      // Check for store naming patterns
      if (
        (symbol.name.includes('Store') || symbol.name.includes('store')) &&
        symbol.kind === 'function'
      ) {
        const storeName = symbol.name;
        if (seenStores.has(storeName)) continue;
        seenStores.add(storeName);

        const storeDoc = this.analyzeStore(symbol);
        stores.push(storeDoc);
      }

      // Check for useXxxStore hooks
      if (symbol.name.startsWith('use') && symbol.name.endsWith('Store')) {
        const storeName = symbol.name;
        if (seenStores.has(storeName)) continue;
        seenStores.add(storeName);

        const storeDoc = this.analyzeStore(symbol);
        stores.push(storeDoc);
      }
    }

    // Also look in store directories
    const storeFiles = this.repoMap.files.filter(f =>
      f.relativePath.includes('/stores/') ||
      f.relativePath.includes('/store/') ||
      f.relativePath.endsWith('Store.ts') ||
      f.relativePath.endsWith('store.ts')
    );

    for (const file of storeFiles) {
      const symbols = this.repoMap.symbols.filter(s => s.file === file.relativePath);

      for (const symbol of symbols) {
        if (symbol.exported && !seenStores.has(symbol.name)) {
          if (symbol.name.includes('Store') || symbol.name.includes('store')) {
            seenStores.add(symbol.name);
            stores.push(this.analyzeStore(symbol));
          }
        }
      }
    }

    return stores;
  }

  /**
   * Analyze a single store
   */
  private analyzeStore(symbol: { name: string; file: string; signature?: string }): StoreDoc {
    const state: string[] = [];
    const actions: string[] = [];
    const subscribers: string[] = [];

    // Find symbols in the same file that could be state or actions
    const relatedSymbols = this.repoMap.symbols.filter(s =>
      s.file === symbol.file &&
      s.parentId?.includes(symbol.name)
    );

    for (const related of relatedSymbols) {
      if (related.kind === 'property') {
        state.push(related.name);
      } else if (related.kind === 'method' || related.kind === 'function') {
        if (
          related.name.startsWith('set') ||
          related.name.startsWith('add') ||
          related.name.startsWith('remove') ||
          related.name.startsWith('update') ||
          related.name.startsWith('reset') ||
          related.name.startsWith('clear')
        ) {
          actions.push(related.name);
        }
      }
    }

    // Find components that use this store
    const storeDependents = this.getDependentsOf(symbol.file);
    for (const dependent of storeDependents) {
      if (dependent.includes('/components/') || dependent.endsWith('.tsx')) {
        const componentName = this.extractComponentName(dependent);
        if (componentName && !subscribers.includes(componentName)) {
          subscribers.push(componentName);
        }
      }
    }

    // If no state/actions found, try to parse from signature
    if (state.length === 0 && symbol.signature) {
      const stateMatch = symbol.signature.match(/state:\s*\{([^}]+)\}/);
      if (stateMatch) {
        const props = stateMatch[1]?.split(',').map(p => p.trim().split(':')[0]?.trim()) ?? [];
        state.push(...props.filter((p): p is string => !!p));
      }
    }

    return {
      name: symbol.name,
      file: symbol.file,
      state: state.slice(0, 10),
      actions: actions.slice(0, 10),
      subscribers: subscribers.slice(0, 10),
    };
  }

  /**
   * Extract component name from file path
   */
  private extractComponentName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1] ?? '';
    return fileName.replace(/\.(tsx|ts|jsx|js)$/, '');
  }

  /**
   * Analyze data stores
   */
  private analyzeDataStores(): DataStoreDoc[] {
    const stores: DataStoreDoc[] = [];

    // Check for SQLite
    const hasSQLite = this.repoMap.dependencies.some(d =>
      d.to === 'better-sqlite3' || d.to === 'sqlite3' || d.to === 'sql.js'
    );

    if (hasSQLite) {
      const sqliteFiles = this.repoMap.files.filter(f =>
        f.relativePath.includes('database') ||
        f.relativePath.includes('db') ||
        f.relativePath.includes('sqlite')
      );

      stores.push({
        name: 'SQLite Database',
        type: 'sqlite',
        location: sqliteFiles[0]?.relativePath || 'src/persistence/',
        accessedBy: sqliteFiles.map(f => f.relativePath).slice(0, 5),
        schema: this.detectDatabaseSchema(),
      });
    }

    // Check for IndexedDB
    const hasIndexedDB = this.repoMap.symbols.some(s =>
      s.signature.includes('indexedDB') ||
      s.name.includes('IndexedDB') ||
      s.name.includes('IDB')
    );

    if (hasIndexedDB) {
      stores.push({
        name: 'IndexedDB',
        type: 'indexeddb',
        location: 'Browser IndexedDB',
        accessedBy: this.findFilesUsingPattern(/indexeddb|IDB/i),
      });
    }

    // Check for in-memory stores
    const memoryStores = this.repoMap.symbols.filter(s =>
      s.name.includes('Cache') ||
      s.name.includes('InMemory') ||
      s.name.includes('MemoryStore')
    );

    for (const store of memoryStores.slice(0, 3)) {
      stores.push({
        name: store.name,
        type: 'memory',
        location: store.file,
        accessedBy: this.getDependentsOf(store.file).slice(0, 5),
      });
    }

    // Check for file-based storage
    const hasFileStorage = this.repoMap.symbols.some(s =>
      s.name.includes('FileStore') ||
      s.name.includes('FileStorage') ||
      (s.signature.includes('writeFile') && s.signature.includes('JSON'))
    );

    if (hasFileStorage) {
      const fileStoreFiles = this.repoMap.files.filter(f =>
        f.relativePath.includes('storage') || f.relativePath.includes('file')
      );

      stores.push({
        name: 'File Storage',
        type: 'file',
        location: fileStoreFiles[0]?.relativePath || 'File system',
        accessedBy: fileStoreFiles.map(f => f.relativePath).slice(0, 5),
      });
    }

    return stores;
  }

  /**
   * Detect database schema
   */
  private detectDatabaseSchema(): string | undefined {
    // Look for schema definitions
    const schemaSymbols = this.repoMap.symbols.filter(s =>
      s.name.includes('schema') ||
      s.name.includes('Schema') ||
      s.name.includes('table') ||
      s.name.includes('Table')
    );

    if (schemaSymbols.length === 0) return undefined;

    const tables = schemaSymbols
      .filter(s => s.kind === 'constant' || s.kind === 'variable')
      .map(s => s.name)
      .slice(0, 10);

    if (tables.length === 0) return undefined;

    return `Tables: ${tables.join(', ')}`;
  }

  /**
   * Find files using a pattern
   */
  private findFilesUsingPattern(pattern: RegExp): string[] {
    const files: string[] = [];

    for (const symbol of this.repoMap.symbols) {
      if (pattern.test(symbol.signature || '') || pattern.test(symbol.name)) {
        if (!files.includes(symbol.file)) {
          files.push(symbol.file);
        }
      }
    }

    return files;
  }

  /**
   * Analyze event flows
   */
  private analyzeEventFlows(): EventFlowDoc[] {
    const flows: EventFlowDoc[] = [];
    const seenEvents = new Set<string>();

    // Look for EventBus, EventEmitter, or similar patterns
    const _eventSymbols = this.repoMap.symbols.filter(s =>
      s.name.includes('Event') ||
      s.name.includes('event') ||
      s.name === 'emit' ||
      s.name === 'on' ||
      s.name === 'subscribe' ||
      s.name === 'publish'
    );

    // Find event bus/emitter classes
    const eventBusSymbols = this.repoMap.symbols.filter(s =>
      (s.kind === 'class' || s.kind === 'interface') &&
      (s.name.includes('EventBus') || s.name.includes('EventEmitter'))
    );

    for (const bus of eventBusSymbols) {
      if (!seenEvents.has(bus.name)) {
        seenEvents.add(bus.name);

        const handlers = this.findEventHandlers(bus.file);

        flows.push({
          name: bus.name,
          trigger: this.extractJSDoc(bus) || 'Application events',
          handlers,
          flow: this.generateEventFlowDiagram(bus.name, handlers),
        });
      }
    }

    // Look for specific event types
    const eventTypes = this.repoMap.symbols.filter(s =>
      s.kind === 'type' && s.name.endsWith('Event')
    );

    for (const eventType of eventTypes.slice(0, 5)) {
      if (!seenEvents.has(eventType.name)) {
        seenEvents.add(eventType.name);

        const handlers = this.findHandlersForEventType(eventType.name);

        flows.push({
          name: eventType.name,
          trigger: this.inferEventTrigger(eventType),
          handlers,
          flow: this.generateEventFlowDiagram(eventType.name, handlers),
        });
      }
    }

    // Look for IPC events (Electron)
    const ipcFlows = this.findIPCEventFlows();
    flows.push(...ipcFlows);

    return flows.slice(0, 10); // Limit to 10 flows
  }

  /**
   * Find event handlers in a file
   */
  private findEventHandlers(file: string): string[] {
    const handlers: string[] = [];

    const dependents = this.getDependentsOf(file);

    for (const dependent of dependents) {
      const symbols = this.repoMap.symbols.filter(s =>
        s.file === dependent &&
        (s.name.startsWith('handle') || s.name.startsWith('on') || s.name.includes('Handler'))
      );

      for (const symbol of symbols) {
        if (!handlers.includes(symbol.name)) {
          handlers.push(`${symbol.name} (${dependent})`);
        }
      }
    }

    return handlers.slice(0, 5);
  }

  /**
   * Find handlers for a specific event type
   */
  private findHandlersForEventType(eventTypeName: string): string[] {
    const handlers: string[] = [];
    const baseName = eventTypeName.replace(/Event$/, '');

    // Look for handlers with matching names
    const handlerSymbols = this.repoMap.symbols.filter(s =>
      s.name.includes(baseName) &&
      (s.name.startsWith('handle') || s.name.startsWith('on') || s.name.includes('Handler'))
    );

    for (const symbol of handlerSymbols) {
      handlers.push(`${symbol.name} (${symbol.file})`);
    }

    return handlers.slice(0, 5);
  }

  /**
   * Infer what triggers an event
   */
  private inferEventTrigger(symbol: { name: string; signature?: string }): string {
    const name = symbol.name;

    if (name.includes('Click')) return 'User click interaction';
    if (name.includes('Submit')) return 'Form submission';
    if (name.includes('Change')) return 'Value change';
    if (name.includes('Load')) return 'Resource loading';
    if (name.includes('Error')) return 'Error occurrence';
    if (name.includes('Success')) return 'Successful operation';
    if (name.includes('Update')) return 'Data update';
    if (name.includes('Create')) return 'Resource creation';
    if (name.includes('Delete')) return 'Resource deletion';

    return this.extractJSDoc(symbol as Parameters<typeof this.extractJSDoc>[0]) || 'Application event';
  }

  /**
   * Find IPC event flows
   */
  private findIPCEventFlows(): EventFlowDoc[] {
    const flows: EventFlowDoc[] = [];

    // Look for IPC channel patterns
    const ipcSymbols = this.repoMap.symbols.filter(s =>
      s.signature.includes('ipcMain') ||
      s.signature.includes('ipcRenderer') ||
      s.file.includes('preload') ||
      s.file.includes('ipc')
    );

    if (ipcSymbols.length > 0) {
      flows.push({
        name: 'IPC Communication',
        trigger: 'Cross-process communication (main ↔ renderer)',
        handlers: ipcSymbols.slice(0, 5).map(s => `${s.name} (${s.file})`),
        flow: this.generateIPCFlowDiagram(),
      });
    }

    return flows;
  }

  /**
   * Generate event flow diagram
   */
  private generateEventFlowDiagram(eventName: string, handlers: string[]): string {
    if (handlers.length === 0) {
      return `Event: ${eventName} → (no handlers found)`;
    }

    const participants = [
      { id: 'source', label: 'Source' },
      { id: 'event', label: eventName },
      ...handlers.slice(0, 3).map((h, i) => ({
        id: `handler${String(i)}`,
        label: h.split(' ')[0] || `Handler ${String(i + 1)}`,
      })),
    ];

    const messages = [
      { from: 'source', to: 'event', label: 'emit', type: 'sync' as const },
      ...handlers.slice(0, 3).map((_, i) => ({
        from: 'event',
        to: `handler${String(i)}`,
        label: 'notify',
        type: 'async' as const,
      })),
    ];

    return this.generateMermaidDiagram('sequenceDiagram', { participants, messages });
  }

  /**
   * Generate IPC flow diagram
   */
  private generateIPCFlowDiagram(): string {
    return this.generateMermaidDiagram('sequenceDiagram', {
      participants: [
        { id: 'renderer', label: 'Renderer Process' },
        { id: 'preload', label: 'Preload Script' },
        { id: 'main', label: 'Main Process' },
      ],
      messages: [
        { from: 'renderer', to: 'preload', label: 'invoke', type: 'sync' as const },
        { from: 'preload', to: 'main', label: 'ipcRenderer.invoke', type: 'async' as const },
        { from: 'main', to: 'preload', label: 'result', type: 'return' as const },
        { from: 'preload', to: 'renderer', label: 'result', type: 'return' as const },
      ],
    });
  }

  /**
   * Analyze data transformations
   */
  private analyzeDataTransformations(): DataTransformationDoc[] {
    const transformations: DataTransformationDoc[] = [];

    // Look for adapter files
    const adapterFiles = this.repoMap.files.filter(f =>
      f.relativePath.includes('adapter') || f.relativePath.includes('Adapter')
    );

    for (const file of adapterFiles) {
      const symbols = this.repoMap.symbols.filter(s =>
        s.file === file.relativePath && s.exported
      );

      for (const symbol of symbols) {
        if (symbol.kind === 'class' || symbol.kind === 'function') {
          transformations.push({
            name: symbol.name,
            input: this.inferInputType(symbol),
            output: this.inferOutputType(symbol),
            transformer: `${symbol.name} (${symbol.file})`,
            description: this.extractJSDoc(symbol) || this.inferPurpose(symbol),
          });
        }
      }
    }

    // Look for transformer functions
    const transformerSymbols = this.repoMap.symbols.filter(s =>
      s.kind === 'function' &&
      (s.name.includes('transform') ||
       s.name.includes('Transform') ||
       s.name.includes('convert') ||
       s.name.includes('Convert') ||
       s.name.includes('map') ||
       s.name.includes('parse') ||
       s.name.includes('serialize') ||
       s.name.includes('deserialize') ||
       s.name.startsWith('to'))
    );

    for (const symbol of transformerSymbols.slice(0, 10)) {
      // Avoid duplicates
      if (transformations.some(t => t.name === symbol.name)) continue;

      transformations.push({
        name: symbol.name,
        input: this.inferInputType(symbol),
        output: this.inferOutputType(symbol),
        transformer: `${symbol.name} (${symbol.file})`,
        description: this.extractJSDoc(symbol) || this.inferPurpose(symbol),
      });
    }

    return transformations.slice(0, 15); // Limit to 15 transformations
  }

  /**
   * Infer input type from symbol
   */
  private inferInputType(symbol: { name: string; signature?: string }): string {
    if (!symbol.signature) return 'unknown';

    // Extract first parameter type
    const paramsMatch = symbol.signature.match(/\(([^)]+)\)/);
    if (!paramsMatch?.[1]) return 'void';

    const firstParam = paramsMatch[1].split(',')[0];
    const typeMatch = firstParam?.match(/:\s*([^,)=]+)/);

    return typeMatch?.[1]?.trim() || 'unknown';
  }

  /**
   * Infer output type from symbol
   */
  private inferOutputType(symbol: { name: string; signature?: string }): string {
    if (!symbol.signature) return 'unknown';

    // Extract return type
    const returnMatch = symbol.signature.match(/\):\s*([^{]+)/);
    if (returnMatch?.[1]) {
      return returnMatch[1].trim();
    }

    // Check for Promise return
    if (symbol.signature.includes('Promise<')) {
      const promiseMatch = symbol.signature.match(/Promise<([^>]+)>/);
      if (promiseMatch?.[1]) {
        return `Promise<${promiseMatch[1]}>`;
      }
    }

    return 'void';
  }

  /**
   * Convert data flow documentation to Markdown
   * @param doc - Data flow documentation
   * @returns Markdown string
   */
  toMarkdown(doc: DataFlowDoc): string {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    // Header
    lines.push('# Data Flow Documentation');
    lines.push('');
    lines.push(`> Generated: ${timestamp}`);
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(doc.overview);
    lines.push('');

    // State Management
    lines.push('## State Management');
    lines.push('');
    lines.push(`**Approach:** ${doc.stateManagement.approach}`);
    lines.push('');
    lines.push(`**Persistence:** ${doc.stateManagement.persistence}`);
    lines.push('');

    if (doc.stateManagement.stores.length > 0) {
      lines.push('### Stores');
      lines.push('');

      for (const store of doc.stateManagement.stores) {
        lines.push(`#### ${store.name}`);
        lines.push('');
        lines.push(`**File:** \`${store.file}\``);
        lines.push('');

        if (store.state.length > 0) {
          lines.push('**State:**');
          for (const s of store.state) {
            lines.push(`- \`${s}\``);
          }
          lines.push('');
        }

        if (store.actions.length > 0) {
          lines.push('**Actions:**');
          for (const a of store.actions) {
            lines.push(`- \`${a}\``);
          }
          lines.push('');
        }

        if (store.subscribers.length > 0) {
          lines.push(`**Subscribers:** ${store.subscribers.join(', ')}`);
          lines.push('');
        }
      }
    }

    // Data Stores
    if (doc.dataStores.length > 0) {
      lines.push('## Data Stores');
      lines.push('');
      lines.push('| Store | Type | Location |');
      lines.push('|-------|------|----------|');

      for (const store of doc.dataStores) {
        lines.push(`| ${store.name} | ${store.type} | \`${store.location}\` |`);
      }
      lines.push('');

      // Detailed store docs
      for (const store of doc.dataStores) {
        lines.push(`### ${store.name}`);
        lines.push('');
        lines.push(`- **Type:** ${store.type}`);
        lines.push(`- **Location:** \`${store.location}\``);

        if (store.schema) {
          lines.push(`- **Schema:** ${store.schema}`);
        }

        if (store.accessedBy.length > 0) {
          lines.push('- **Accessed By:**');
          for (const file of store.accessedBy) {
            lines.push(`  - \`${file}\``);
          }
        }
        lines.push('');
      }
    }

    // Event Flows
    if (doc.eventFlows.length > 0) {
      lines.push('## Event Flows');
      lines.push('');

      for (const flow of doc.eventFlows) {
        lines.push(`### ${flow.name}`);
        lines.push('');
        lines.push(`**Trigger:** ${flow.trigger}`);
        lines.push('');

        if (flow.handlers.length > 0) {
          lines.push('**Handlers:**');
          for (const handler of flow.handlers) {
            lines.push(`- ${handler}`);
          }
          lines.push('');
        }

        if (flow.flow && this.options.generateDiagrams) {
          lines.push('**Flow Diagram:**');
          lines.push('');
          lines.push('```mermaid');
          lines.push(flow.flow);
          lines.push('```');
          lines.push('');
        }
      }
    }

    // Data Transformations
    if (doc.dataTransformations.length > 0) {
      lines.push('## Data Transformations');
      lines.push('');
      lines.push('| Transformation | Input | Output | Location |');
      lines.push('|----------------|-------|--------|----------|');

      for (const transform of doc.dataTransformations) {
        const input = transform.input.length > 20
          ? transform.input.substring(0, 17) + '...'
          : transform.input;
        const output = transform.output.length > 20
          ? transform.output.substring(0, 17) + '...'
          : transform.output;
        lines.push(`| ${transform.name} | \`${input}\` | \`${output}\` | \`${transform.transformer}\` |`);
      }
      lines.push('');

      // Detailed transformation docs
      lines.push('### Transformation Details');
      lines.push('');

      for (const transform of doc.dataTransformations.slice(0, 10)) {
        lines.push(`#### ${transform.name}`);
        lines.push('');
        lines.push(transform.description);
        lines.push('');
        lines.push(`- **Input:** \`${transform.input}\``);
        lines.push(`- **Output:** \`${transform.output}\``);
        lines.push(`- **Location:** \`${transform.transformer}\``);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}
