/**
 * API Surface Analyzer
 *
 * Analyzes codebase public API and generates API_SURFACE.md documentation.
 * Documents exported interfaces, classes, functions, types, and IPC channels.
 *
 * @module infrastructure/analysis/codebase/APISurfaceAnalyzer
 */

import { BaseAnalyzer } from './BaseAnalyzer';
import type {
  APISurfaceDoc,
  InterfaceDoc,
  ClassDoc,
  FunctionDoc,
  TypeDoc,
  IPCChannelDoc,
  PropertyDoc,
  MethodDoc,
  ParameterDoc,
} from './types';
import type { SymbolEntry } from '../types';

/**
 * Analyzer that generates API_SURFACE.md documentation
 *
 * Examines the codebase to:
 * - Document exported interfaces
 * - Document exported classes
 * - Document exported functions
 * - Document exported types
 * - Find IPC channels (for Electron apps)
 *
 * @example
 * ```typescript
 * const analyzer = new APISurfaceAnalyzer(repoMap, options);
 * const doc = await analyzer.analyze();
 * const markdown = analyzer.toMarkdown(doc);
 * ```
 */
export class APISurfaceAnalyzer extends BaseAnalyzer {
  /**
   * Perform API surface analysis
   * @returns API surface documentation
   */
  analyze(): APISurfaceDoc {
    const publicInterfaces = this.documentInterfaces();
    const publicClasses = this.documentClasses();
    const publicFunctions = this.documentFunctions();
    const publicTypes = this.documentTypes();
    const ipcChannels = this.documentIPCChannels();

    const overview = this.generateOverview(
      publicInterfaces,
      publicClasses,
      publicFunctions,
      publicTypes,
      ipcChannels
    );

    return {
      overview,
      publicInterfaces,
      publicClasses,
      publicFunctions,
      publicTypes,
      ipcChannels: ipcChannels.length > 0 ? ipcChannels : undefined,
    };
  }

  /**
   * Generate API surface overview
   */
  private generateOverview(
    interfaces: InterfaceDoc[],
    classes: ClassDoc[],
    functions: FunctionDoc[],
    types: TypeDoc[],
    ipcChannels: IPCChannelDoc[]
  ): string {
    const paragraphs: string[] = [];

    const total = interfaces.length + classes.length + functions.length + types.length;

    paragraphs.push(
      `This codebase exposes ${String(total)} public API elements: ` +
      `${String(interfaces.length)} interfaces, ${String(classes.length)} classes, ` +
      `${String(functions.length)} functions, and ${String(types.length)} type aliases.`
    );

    if (ipcChannels.length > 0) {
      paragraphs.push(
        `The application uses Electron IPC for inter-process communication, ` +
        `with ${String(ipcChannels.length)} documented channels.`
      );
    }

    paragraphs.push(
      `The API follows TypeScript best practices with strong typing and JSDoc documentation. ` +
      `Interfaces define contracts, classes implement behavior, and type aliases provide convenience types.`
    );

    return paragraphs.join('\n\n');
  }

  /**
   * Document all exported interfaces
   */
  private documentInterfaces(): InterfaceDoc[] {
    const interfaces: InterfaceDoc[] = [];
    const interfaceSymbols = this.getExportedSymbols()
      .filter(s => s.kind === 'interface');

    for (const symbol of interfaceSymbols) {
      const doc = this.createInterfaceDoc(symbol);
      interfaces.push(doc);
    }

    // Sort by name and limit to most important
    return interfaces
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50); // Limit to 50 interfaces
  }

  /**
   * Create documentation for an interface
   */
  private createInterfaceDoc(symbol: SymbolEntry): InterfaceDoc {
    const description = this.extractJSDoc(symbol) || this.inferPurpose(symbol);
    const properties = this.extractInterfaceProperties(symbol);
    const methods = this.extractInterfaceMethods(symbol);
    const extendsInfo = this.extractExtends(symbol);

    return {
      name: symbol.name,
      file: symbol.file,
      description,
      properties,
      methods,
      extends: extendsInfo.length > 0 ? extendsInfo : undefined,
    };
  }

  /**
   * Extract properties from an interface
   */
  private extractInterfaceProperties(symbol: SymbolEntry): PropertyDoc[] {
    const properties: PropertyDoc[] = [];

    // Find property symbols that belong to this interface
    const memberSymbols = this.repoMap.symbols.filter(s =>
      s.file === symbol.file &&
      s.kind === 'property' &&
      s.parentId?.includes(symbol.name)
    );

    for (const prop of memberSymbols) {
      properties.push({
        name: prop.name,
        type: this.extractTypeFromSignature(prop.signature) || 'unknown',
        description: this.extractJSDoc(prop) || '',
        optional: prop.signature.includes('?'),
      });
    }

    // If no member symbols found, try to parse from signature
    if (properties.length === 0 && symbol.signature) {
      const parsed = this.parseInterfaceSignature(symbol.signature);
      properties.push(...parsed);
    }

    return properties.slice(0, 20); // Limit properties
  }

  /**
   * Extract methods from an interface
   */
  private extractInterfaceMethods(symbol: SymbolEntry): MethodDoc[] {
    const methods: MethodDoc[] = [];

    // Find method symbols that belong to this interface
    const methodSymbols = this.repoMap.symbols.filter(s =>
      s.file === symbol.file &&
      s.kind === 'method' &&
      s.parentId?.includes(symbol.name)
    );

    for (const method of methodSymbols) {
      methods.push({
        name: method.name,
        signature: method.signature || method.name + '()',
        description: this.extractJSDoc(method) || '',
        parameters: this.extractParameters(method.signature || ''),
        returns: this.extractReturnType(method.signature || ''),
      });
    }

    return methods.slice(0, 10); // Limit methods
  }

  /**
   * Extract extends information
   */
  private extractExtends(symbol: SymbolEntry): string[] {
    const extendsInfo: string[] = [];

    if (symbol.signature) {
      const extendsMatch = symbol.signature.match(/extends\s+([^{]+)/);
      if (extendsMatch) {
        const extendsList = extendsMatch[1]?.split(',').map(e => e.trim()) ?? [];
        extendsInfo.push(...extendsList);
      }
    }

    return extendsInfo;
  }

  /**
   * Document all exported classes
   */
  private documentClasses(): ClassDoc[] {
    const classes: ClassDoc[] = [];
    const classSymbols = this.getExportedSymbols()
      .filter(s => s.kind === 'class');

    for (const symbol of classSymbols) {
      const doc = this.createClassDoc(symbol);
      classes.push(doc);
    }

    return classes
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30); // Limit to 30 classes
  }

  /**
   * Create documentation for a class
   */
  private createClassDoc(symbol: SymbolEntry): ClassDoc {
    const description = this.extractJSDoc(symbol) || this.inferPurpose(symbol);
    const constructorSig = this.extractConstructor(symbol);
    const properties = this.extractClassProperties(symbol);
    const methods = this.extractClassMethods(symbol);
    const extendsInfo = this.extractExtends(symbol);
    const implementsInfo = this.extractImplements(symbol);

    return {
      name: symbol.name,
      file: symbol.file,
      description,
      constructor: constructorSig,
      properties,
      methods,
      extends: extendsInfo[0],
      implements: implementsInfo.length > 0 ? implementsInfo : undefined,
    };
  }

  /**
   * Extract constructor signature
   */
  private extractConstructor(symbol: SymbolEntry): string {
    // Find constructor in the same file
    const constructor = this.repoMap.symbols.find(s =>
      s.file === symbol.file &&
      s.kind === 'method' &&
      s.name === 'constructor' &&
      s.parentId?.includes(symbol.name)
    );

    if (constructor?.signature) {
      return constructor.signature;
    }

    return `new ${symbol.name}()`;
  }

  /**
   * Extract class properties
   */
  private extractClassProperties(symbol: SymbolEntry): PropertyDoc[] {
    const properties: PropertyDoc[] = [];

    // Find property symbols that belong to this class
    const memberSymbols = this.repoMap.symbols.filter(s =>
      s.file === symbol.file &&
      s.kind === 'property' &&
      s.parentId?.includes(symbol.name) &&
      (this.options.includePrivate || !s.modifiers.includes('private'))
    );

    for (const prop of memberSymbols) {
      properties.push({
        name: prop.name,
        type: this.extractTypeFromSignature(prop.signature) || 'unknown',
        description: this.extractJSDoc(prop) || '',
        optional: prop.signature.includes('?'),
      });
    }

    return properties.slice(0, 15);
  }

  /**
   * Extract class methods
   */
  private extractClassMethods(symbol: SymbolEntry): MethodDoc[] {
    const methods: MethodDoc[] = [];

    // Find method symbols that belong to this class
    const methodSymbols = this.repoMap.symbols.filter(s =>
      s.file === symbol.file &&
      s.kind === 'method' &&
      s.parentId?.includes(symbol.name) &&
      s.name !== 'constructor' &&
      (this.options.includePrivate || !s.modifiers.includes('private'))
    );

    for (const method of methodSymbols) {
      methods.push({
        name: method.name,
        signature: method.signature || method.name + '()',
        description: this.extractJSDoc(method) || '',
        parameters: this.extractParameters(method.signature || ''),
        returns: this.extractReturnType(method.signature || ''),
      });
    }

    return methods.slice(0, 15);
  }

  /**
   * Extract implements information
   */
  private extractImplements(symbol: SymbolEntry): string[] {
    const implementsInfo: string[] = [];

    if (symbol.signature) {
      const implementsMatch = symbol.signature.match(/implements\s+([^{]+)/);
      if (implementsMatch) {
        const implementsList = implementsMatch[1]?.split(',').map(e => e.trim()) ?? [];
        implementsInfo.push(...implementsList);
      }
    }

    return implementsInfo;
  }

  /**
   * Document all exported functions
   */
  private documentFunctions(): FunctionDoc[] {
    const functions: FunctionDoc[] = [];
    const functionSymbols = this.getExportedSymbols()
      .filter(s => s.kind === 'function');

    for (const symbol of functionSymbols) {
      const doc = this.createFunctionDoc(symbol);
      functions.push(doc);
    }

    return functions
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50); // Limit to 50 functions
  }

  /**
   * Create documentation for a function
   */
  private createFunctionDoc(symbol: SymbolEntry): FunctionDoc {
    const description = this.extractJSDoc(symbol) || this.inferPurpose(symbol);
    const signature = symbol.signature || `${symbol.name}()`;

    return {
      name: symbol.name,
      file: symbol.file,
      signature,
      description,
      parameters: this.extractParameters(signature),
      returns: this.extractReturnType(signature),
    };
  }

  /**
   * Document all exported types
   */
  private documentTypes(): TypeDoc[] {
    const types: TypeDoc[] = [];
    const typeSymbols = this.getExportedSymbols()
      .filter(s => s.kind === 'type');

    for (const symbol of typeSymbols) {
      types.push({
        name: symbol.name,
        file: symbol.file,
        definition: symbol.signature || symbol.name,
        description: this.extractJSDoc(symbol) || this.inferPurpose(symbol),
      });
    }

    return types
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50); // Limit to 50 types
  }

  /**
   * Document IPC channels (Electron-specific)
   */
  private documentIPCChannels(): IPCChannelDoc[] {
    const channels: IPCChannelDoc[] = [];
    const seenChannels = new Set<string>();

    // Search for ipcMain.handle and ipcRenderer.invoke patterns
    for (const symbol of this.repoMap.symbols) {
      if (!symbol.signature) continue;

      // Look for IPC handler patterns
      const handleMatch = symbol.signature.match(/ipcMain\.handle\s*\(\s*['"]([^'"]+)['"]/);
      const invokeMatch = symbol.signature.match(/ipcRenderer\.invoke\s*\(\s*['"]([^'"]+)['"]/);
      const onMatch = symbol.signature.match(/ipcMain\.on\s*\(\s*['"]([^'"]+)['"]/);
      const sendMatch = symbol.signature.match(/ipcRenderer\.send\s*\(\s*['"]([^'"]+)['"]/);

      if (handleMatch?.[1] && !seenChannels.has(handleMatch[1])) {
        seenChannels.add(handleMatch[1]);
        channels.push({
          channel: handleMatch[1],
          direction: 'renderer-to-main',
          payload: this.inferIPCPayload(symbol, handleMatch[1]),
          description: this.extractJSDoc(symbol) || `Handles ${handleMatch[1]} requests`,
        });
      }

      if (invokeMatch?.[1] && !seenChannels.has(invokeMatch[1])) {
        seenChannels.add(invokeMatch[1]);
        channels.push({
          channel: invokeMatch[1],
          direction: 'renderer-to-main',
          payload: this.inferIPCPayload(symbol, invokeMatch[1]),
          description: this.extractJSDoc(symbol) || `Invokes ${invokeMatch[1]}`,
        });
      }

      if (onMatch?.[1] && !seenChannels.has(onMatch[1])) {
        seenChannels.add(onMatch[1]);
        channels.push({
          channel: onMatch[1],
          direction: 'renderer-to-main',
          payload: this.inferIPCPayload(symbol, onMatch[1]),
          description: this.extractJSDoc(symbol) || `Listens for ${onMatch[1]}`,
        });
      }

      if (sendMatch?.[1] && !seenChannels.has(sendMatch[1])) {
        seenChannels.add(sendMatch[1]);
        channels.push({
          channel: sendMatch[1],
          direction: 'renderer-to-main',
          payload: this.inferIPCPayload(symbol, sendMatch[1]),
          description: this.extractJSDoc(symbol) || `Sends ${sendMatch[1]}`,
        });
      }
    }

    // Also search in file contents by looking at dependencies that suggest IPC usage
    const _ipcFiles = this.repoMap.files.filter(f =>
      f.relativePath.includes('ipc') ||
      f.relativePath.includes('preload') ||
      f.relativePath.includes('main')
    );

    // Look for channel name patterns in symbol names
    for (const symbol of this.repoMap.symbols) {
      if (symbol.name.includes('channel') || symbol.name.includes('Channel')) {
        const channelName = symbol.name.replace(/Channel$/, '').replace(/^handle/, '');
        if (channelName && !seenChannels.has(channelName)) {
          seenChannels.add(channelName);
          channels.push({
            channel: channelName,
            direction: 'bidirectional',
            payload: 'unknown',
            description: this.extractJSDoc(symbol) || this.inferPurpose(symbol),
          });
        }
      }
    }

    return channels.sort((a, b) => a.channel.localeCompare(b.channel));
  }

  /**
   * Infer IPC payload type
   */
  private inferIPCPayload(symbol: SymbolEntry, channelName: string): string {
    // Try to extract from signature
    if (symbol.signature) {
      const typeMatch = symbol.signature.match(/:\s*([^=>]+)=>/);
      if (typeMatch?.[1]) {
        return typeMatch[1].trim();
      }
    }

    // Infer from channel name
    if (channelName.includes('get')) return 'void (query)';
    if (channelName.includes('set')) return 'value to set';
    if (channelName.includes('create')) return 'creation data';
    if (channelName.includes('update')) return 'update data';
    if (channelName.includes('delete')) return 'id';

    return 'unknown';
  }

  /**
   * Extract type from signature
   */
  private extractTypeFromSignature(signature: string | undefined): string {
    if (!signature) return 'unknown';

    const typeMatch = signature.match(/:\s*([^=;]+)/);
    if (typeMatch?.[1]) {
      return typeMatch[1].trim();
    }

    return 'unknown';
  }

  /**
   * Extract parameters from a function signature
   */
  private extractParameters(signature: string): ParameterDoc[] {
    const params: ParameterDoc[] = [];

    const paramsMatch = signature.match(/\(([^)]*)\)/);
    if (!paramsMatch?.[1]) return params;

    const paramsStr = paramsMatch[1];
    if (!paramsStr.trim()) return params;

    // Split by comma, but be careful about nested types
    const paramParts = this.splitParameters(paramsStr);

    for (const part of paramParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const optional = trimmed.includes('?');
      const [nameWithOptional, typeAndDefault] = trimmed.split(':');
      const name = (nameWithOptional ?? '').replace('?', '').trim();
      let type = 'unknown';
      let defaultValue: string | undefined;

      if (typeAndDefault) {
        const [typeStr, defaultStr] = typeAndDefault.split('=');
        type = (typeStr ?? '').trim();
        if (defaultStr) {
          defaultValue = defaultStr.trim();
        }
      }

      params.push({
        name,
        type,
        description: '',
        optional,
        defaultValue,
      });
    }

    return params;
  }

  /**
   * Split parameters handling nested types
   */
  private splitParameters(paramsStr: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of paramsStr) {
      if (char === '<' || char === '{' || char === '(') {
        depth++;
        current += char;
      } else if (char === '>' || char === '}' || char === ')') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Extract return type from signature
   */
  private extractReturnType(signature: string): string {
    // Look for return type after the last )
    const lastParen = signature.lastIndexOf(')');
    if (lastParen === -1) return 'void';

    const afterParen = signature.substring(lastParen + 1);
    const returnMatch = afterParen.match(/:\s*([^{]+)/);

    if (returnMatch?.[1]) {
      return returnMatch[1].trim();
    }

    return 'void';
  }

  /**
   * Parse interface signature to extract properties
   */
  private parseInterfaceSignature(signature: string): PropertyDoc[] {
    const properties: PropertyDoc[] = [];

    // Simple parsing of interface body
    const bodyMatch = signature.match(/\{([^}]*)\}/);
    if (!bodyMatch?.[1]) return properties;

    const lines = bodyMatch[1].split(';').filter(l => l.trim());

    for (const line of lines) {
      const match = line.match(/(\w+)(\?)?:\s*(.+)/);
      if (match) {
        properties.push({
          name: match[1] ?? '',
          type: (match[3] ?? '').trim(),
          description: '',
          optional: !!match[2],
        });
      }
    }

    return properties;
  }

  /**
   * Convert API surface documentation to Markdown
   * @param doc - API surface documentation
   * @returns Markdown string
   */
  toMarkdown(doc: APISurfaceDoc): string {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    // Header
    lines.push('# API Surface Documentation');
    lines.push('');
    lines.push(`> Generated: ${timestamp}`);
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(doc.overview);
    lines.push('');

    // Interfaces
    if (doc.publicInterfaces.length > 0) {
      lines.push('## Interfaces');
      lines.push('');
      lines.push('| Interface | File | Description |');
      lines.push('|-----------|------|-------------|');

      for (const iface of doc.publicInterfaces) {
        const desc = iface.description.length > 50
          ? iface.description.substring(0, 47) + '...'
          : iface.description;
        lines.push(`| \`${iface.name}\` | \`${iface.file}\` | ${desc} |`);
      }
      lines.push('');

      // Detailed interface docs (top 10)
      lines.push('### Interface Details');
      lines.push('');

      for (const iface of doc.publicInterfaces.slice(0, 10)) {
        lines.push(`#### ${iface.name}`);
        lines.push('');
        lines.push(`**File:** \`${iface.file}\``);
        lines.push('');
        lines.push(iface.description);
        lines.push('');

        if (iface.extends && iface.extends.length > 0) {
          lines.push(`**Extends:** ${iface.extends.join(', ')}`);
          lines.push('');
        }

        if (iface.properties.length > 0) {
          lines.push('**Properties:**');
          lines.push('');
          lines.push('| Name | Type | Optional | Description |');
          lines.push('|------|------|----------|-------------|');
          for (const prop of iface.properties) {
            const optional = prop.optional ? 'Yes' : 'No';
            lines.push(`| \`${prop.name}\` | \`${prop.type}\` | ${optional} | ${prop.description} |`);
          }
          lines.push('');
        }

        if (iface.methods.length > 0) {
          lines.push('**Methods:**');
          for (const method of iface.methods) {
            lines.push(`- \`${method.signature}\``);
          }
          lines.push('');
        }
      }
    }

    // Classes
    if (doc.publicClasses.length > 0) {
      lines.push('## Classes');
      lines.push('');
      lines.push('| Class | File | Description |');
      lines.push('|-------|------|-------------|');

      for (const cls of doc.publicClasses) {
        const desc = cls.description.length > 50
          ? cls.description.substring(0, 47) + '...'
          : cls.description;
        lines.push(`| \`${cls.name}\` | \`${cls.file}\` | ${desc} |`);
      }
      lines.push('');

      // Detailed class docs (top 10)
      lines.push('### Class Details');
      lines.push('');

      for (const cls of doc.publicClasses.slice(0, 10)) {
        lines.push(`#### ${cls.name}`);
        lines.push('');
        lines.push(`**File:** \`${cls.file}\``);
        lines.push('');
        lines.push(cls.description);
        lines.push('');

        if (cls.extends) {
          lines.push(`**Extends:** ${cls.extends}`);
          lines.push('');
        }

        if (cls.implements && cls.implements.length > 0) {
          lines.push(`**Implements:** ${cls.implements.join(', ')}`);
          lines.push('');
        }

        lines.push(`**Constructor:** \`${cls.constructor}\``);
        lines.push('');

        if (cls.methods.length > 0) {
          lines.push('**Methods:**');
          for (const method of cls.methods) {
            lines.push(`- \`${method.signature}\` - ${method.description || 'No description'}`);
          }
          lines.push('');
        }
      }
    }

    // Functions
    if (doc.publicFunctions.length > 0) {
      lines.push('## Functions');
      lines.push('');
      lines.push('| Function | File | Signature |');
      lines.push('|----------|------|-----------|');

      for (const func of doc.publicFunctions) {
        const sig = func.signature.length > 40
          ? func.signature.substring(0, 37) + '...'
          : func.signature;
        lines.push(`| \`${func.name}\` | \`${func.file}\` | \`${sig}\` |`);
      }
      lines.push('');

      // Detailed function docs (top 15)
      lines.push('### Function Details');
      lines.push('');

      for (const func of doc.publicFunctions.slice(0, 15)) {
        lines.push(`#### ${func.name}`);
        lines.push('');
        lines.push('```typescript');
        lines.push(func.signature);
        lines.push('```');
        lines.push('');
        lines.push(func.description);
        lines.push('');

        if (func.parameters.length > 0) {
          lines.push('**Parameters:**');
          for (const param of func.parameters) {
            const optional = param.optional ? ' (optional)' : '';
            const defaultVal = param.defaultValue ? ` = ${param.defaultValue}` : '';
            lines.push(`- \`${param.name}\`: \`${param.type}\`${optional}${defaultVal}`);
          }
          lines.push('');
        }

        lines.push(`**Returns:** \`${func.returns}\``);
        lines.push('');
      }
    }

    // Types
    if (doc.publicTypes.length > 0) {
      lines.push('## Types');
      lines.push('');
      lines.push('| Type | File | Definition |');
      lines.push('|------|------|------------|');

      for (const type of doc.publicTypes) {
        const def = type.definition.length > 40
          ? type.definition.substring(0, 37) + '...'
          : type.definition;
        lines.push(`| \`${type.name}\` | \`${type.file}\` | \`${def}\` |`);
      }
      lines.push('');
    }

    // IPC Channels
    if (doc.ipcChannels && doc.ipcChannels.length > 0) {
      lines.push('## IPC Channels');
      lines.push('');
      lines.push('| Channel | Direction | Payload | Description |');
      lines.push('|---------|-----------|---------|-------------|');

      for (const channel of doc.ipcChannels) {
        lines.push(`| \`${channel.channel}\` | ${channel.direction} | \`${channel.payload}\` | ${channel.description} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
