/**
 * TreeSitterParser - WASM-based tree-sitter parser wrapper
 *
 * Uses web-tree-sitter (WASM) instead of native tree-sitter to avoid
 * Electron rebuild issues. Supports TypeScript and JavaScript parsing.
 *
 * @module infrastructure/analysis/TreeSitterParser
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
 

import { resolve, extname } from 'path';
import type {
  ITreeSitterParser,
  SupportedLanguage,
  ParseResult,
  SymbolEntry,
  SymbolKind,
  SymbolModifier,
  ImportStatement,
  ExportStatement,
  ParseError,
} from './types';

// Type definitions for web-tree-sitter (since types may not be available)
interface _WasmParser {
  parse(input: string): Tree;
  setLanguage(language: WasmLanguage): void;
}

interface Tree {
  rootNode: SyntaxNode;
}

interface SyntaxNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: SyntaxNode[];
  childCount: number;
  namedChildren: SyntaxNode[];
  namedChildCount: number;
  firstNamedChild: SyntaxNode | null;
  lastNamedChild: SyntaxNode | null;
  parent: SyntaxNode | null;
  childForFieldName(name: string): SyntaxNode | null;
  childrenForFieldName(name: string): SyntaxNode[];
  previousSibling: SyntaxNode | null;
  nextSibling: SyntaxNode | null;
  isNamed: boolean;
  hasError: boolean;
  descendantsOfType(types: string | string[]): SyntaxNode[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface WasmLanguage {}

/**
 * TreeSitterParser - WASM-based parser for TypeScript and JavaScript
 */
export class TreeSitterParser implements ITreeSitterParser {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private Parser: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private languages: Map<SupportedLanguage, any> = new Map();
  private initialized = false;
  private wasmBasePath: string;

  /**
   * Create a new TreeSitterParser
   * @param wasmBasePath - Optional base path for WASM files (defaults to node_modules)
   */
  constructor(wasmBasePath?: string) {
    // Calculate default path from node_modules
    const defaultPath = resolve(process.cwd(), 'node_modules');
    this.wasmBasePath = wasmBasePath || defaultPath;
  }

  /**
   * Initialize the parser by loading WASM modules
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import for ESM/CJS compatibility
      const treeSitterModule = await import('web-tree-sitter');
      // Handle both ESM default export and CJS module.exports
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const TreeSitter = treeSitterModule.default || treeSitterModule;

      // Initialize the tree-sitter WASM module
      const treeSitterWasmPath = resolve(
        this.wasmBasePath,
        'web-tree-sitter',
        'tree-sitter.wasm'
      );

      await TreeSitter.init({
        locateFile: () => treeSitterWasmPath,
      });

      this.Parser = TreeSitter;

      // Load TypeScript language
      const tsWasmPath = resolve(
        this.wasmBasePath,
        'tree-sitter-typescript',
        'tree-sitter-typescript.wasm'
      );
      const typescriptLanguage = await TreeSitter.Language.load(tsWasmPath);
      this.languages.set('typescript', typescriptLanguage);

      // Load JavaScript language
      const jsWasmPath = resolve(
        this.wasmBasePath,
        'tree-sitter-javascript',
        'tree-sitter-javascript.wasm'
      );
      const javascriptLanguage = await TreeSitter.Language.load(jsWasmPath);
      this.languages.set('javascript', javascriptLanguage);

      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize TreeSitterParser: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if the parser is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return ['typescript', 'javascript'];
  }

  /**
   * Detect language from file extension
   */
  detectLanguage(filePath: string): SupportedLanguage | null {
    const ext = extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts':
      case '.tsx':
      case '.mts':
        return 'typescript';
      case '.js':
      case '.jsx':
      case '.mjs':
        return 'javascript';
      default:
        return null;
    }
  }

  /**
   * Parse a single file
   */
  async parseFile(filePath: string, content: string): Promise<ParseResult> {
    const startTime = Date.now();

    const language = this.detectLanguage(filePath);
    if (!language) {
      return {
        success: false,
        file: filePath,
        symbols: [],
        imports: [],
        exports: [],
        errors: [
          {
            message: `Unsupported file type: ${extname(filePath)}`,
            line: 1,
            column: 0,
          },
        ],
        parseTime: Date.now() - startTime,
      };
    }

    if (!this.initialized || !this.Parser) {
      await this.initialize();
    }

    const languageModule = this.languages.get(language);
    if (!languageModule) {
      return {
        success: false,
        file: filePath,
        symbols: [],
        imports: [],
        exports: [],
        errors: [{ message: `Language not loaded: ${language}`, line: 1, column: 0 }],
        parseTime: Date.now() - startTime,
      };
    }

    try {
      const parser = new this.Parser!();
      parser.setLanguage(languageModule);

      const tree = parser.parse(content);
      const rootNode = tree.rootNode;

      // Extract all information
      const symbols = this.extractSymbols(rootNode, filePath);
      const imports = this.extractImports(rootNode);
      const exports = this.extractExports(rootNode);
      const errors = this.findErrors(rootNode);

      return {
        success: errors.length === 0,
        file: filePath,
        symbols,
        imports,
        exports,
        errors,
        parseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        file: filePath,
        symbols: [],
        imports: [],
        exports: [],
        errors: [
          {
            message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
            line: 1,
            column: 0,
          },
        ],
        parseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Parse multiple files
   */
  async parseFiles(
    files: Array<{ path: string; content: string }>
  ): Promise<ParseResult[]> {
    const results: ParseResult[] = [];
    for (const file of files) {
      const result = await this.parseFile(file.path, file.content);
      results.push(result);
    }
    return results;
  }

  // ============================================================================
  // Symbol Extraction
  // ============================================================================

  /**
   * Extract symbols from AST
   */
  private extractSymbols(
    rootNode: SyntaxNode,
    filePath: string,
    parentId?: string
  ): SymbolEntry[] {
    const symbols: SymbolEntry[] = [];
    this.walkNode(rootNode, filePath, symbols, parentId);
    return symbols;
  }

  /**
   * Walk AST nodes recursively
   */
  private walkNode(
    node: SyntaxNode,
    filePath: string,
    symbols: SymbolEntry[],
    parentId?: string
  ): void {
    const symbol = this.nodeToSymbol(node, filePath, parentId);
    if (symbol) {
      symbols.push(symbol);
      // For classes/interfaces, recurse into children with this as parent
      if (
        symbol.kind === 'class' ||
        symbol.kind === 'interface' ||
        symbol.kind === 'enum'
      ) {
        for (const child of node.namedChildren) {
          this.walkNode(child, filePath, symbols, symbol.id);
        }
        return; // Already processed children
      }
    }

    // Continue walking for other nodes
    for (const child of node.namedChildren) {
      this.walkNode(child, filePath, symbols, parentId);
    }
  }

  /**
   * Convert AST node to SymbolEntry if applicable
   */
  private nodeToSymbol(
    node: SyntaxNode,
    filePath: string,
    parentId?: string
  ): SymbolEntry | null {
    const kind = this.getSymbolKind(node);
    if (!kind) return null;

    const name = this.getSymbolName(node, kind);
    if (!name) return null;

    const line = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const column = node.startPosition.column;

    const id = `${filePath}#${name}#${line}`;
    const modifiers = this.extractModifiers(node);
    const exported = this.isExported(node);
    const signature = this.buildSignature(node, kind, name);
    const documentation = this.extractDocumentation(node);

    return {
      id,
      name,
      kind,
      file: filePath,
      line,
      endLine,
      column,
      signature,
      documentation,
      references: 0,
      exported,
      parentId,
      modifiers,
    };
  }

  /**
   * Get symbol kind from node type
   */
  private getSymbolKind(node: SyntaxNode): SymbolKind | null {
    switch (node.type) {
      case 'function_declaration':
      case 'function':
        return 'function';
      case 'arrow_function':
        // Only count arrow functions when they're assigned to a variable
        if (
          node.parent?.type === 'variable_declarator' ||
          node.parent?.type === 'lexical_declaration'
        ) {
          return null; // Handled by variable_declarator
        }
        return null;
      case 'method_definition':
      case 'method_signature':
        return 'method';
      case 'class_declaration':
      case 'class':
        return 'class';
      case 'interface_declaration':
        return 'interface';
      case 'type_alias_declaration':
        return 'type';
      case 'enum_declaration':
        return 'enum';
      case 'enum_assignment':
        return 'enum_member';
      case 'variable_declarator': {
        // Check if it's a function expression or arrow function
        const init = node.childForFieldName('value');
        if (init?.type === 'arrow_function' || init?.type === 'function') {
          return 'function';
        }
        // Check if const or let
        const declaration = node.parent;
        if (declaration?.type === 'lexical_declaration') {
          const keyword = declaration.children[0]?.text;
          if (keyword === 'const') {
            return 'constant';
          }
        }
        return 'variable';
      }
      case 'property_signature':
      case 'property_definition':
      case 'public_field_definition':
        return 'property';
      case 'namespace_declaration':
      case 'internal_module':
        return 'namespace';
      case 'module':
        return 'module';
      default:
        return null;
    }
  }

  /**
   * Get symbol name from node
   */
  private getSymbolName(node: SyntaxNode, _kind: SymbolKind): string | null {
    // Try common name field
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      return nameNode.text;
    }

    // For variable declarators
    if (node.type === 'variable_declarator') {
      const name = node.childForFieldName('name');
      if (name) return name.text;
      // First child is usually the identifier
      if (node.namedChildren[0]?.type === 'identifier') {
        return node.namedChildren[0].text;
      }
    }

    // For method definitions
    if (node.type === 'method_definition' || node.type === 'method_signature') {
      const propName = node.childForFieldName('name');
      if (propName) return propName.text;
    }

    // For property definitions
    if (
      node.type === 'property_signature' ||
      node.type === 'property_definition' ||
      node.type === 'public_field_definition'
    ) {
      const propName = node.childForFieldName('name');
      if (propName) return propName.text;
      // First child might be the name
      if (node.namedChildren[0]) {
        return node.namedChildren[0].text;
      }
    }

    // For enum members
    if (node.type === 'enum_assignment') {
      if (node.namedChildren[0]) {
        return node.namedChildren[0].text;
      }
    }

    return null;
  }

  /**
   * Extract modifiers from node
   */
  private extractModifiers(node: SyntaxNode): SymbolModifier[] {
    const modifiers: SymbolModifier[] = [];

    // Check for export
    if (this.isExported(node)) {
      modifiers.push('export');
    }

    // Check direct children for modifiers
    for (const child of node.children) {
      switch (child.text) {
        case 'async':
          modifiers.push('async');
          break;
        case 'static':
          modifiers.push('static');
          break;
        case 'private':
          modifiers.push('private');
          break;
        case 'protected':
          modifiers.push('protected');
          break;
        case 'public':
          modifiers.push('public');
          break;
        case 'readonly':
          modifiers.push('readonly');
          break;
        case 'abstract':
          modifiers.push('abstract');
          break;
        case 'override':
          modifiers.push('override');
          break;
        case 'default':
          modifiers.push('default');
          break;
      }
    }

    // Check accessibility modifier node
    const accessibility = node.childForFieldName('accessibility');
    if (accessibility) {
      if (
        accessibility.text === 'private' ||
        accessibility.text === 'protected' ||
        accessibility.text === 'public'
      ) {
        if (!modifiers.includes(accessibility.text as SymbolModifier)) {
          modifiers.push(accessibility.text as SymbolModifier);
        }
      }
    }

    return modifiers;
  }

  /**
   * Check if node is exported
   */
  private isExported(node: SyntaxNode): boolean {
    // Check if wrapped in export statement
    const parent = node.parent;
    if (parent?.type === 'export_statement') {
      return true;
    }

    // Check for export keyword as first child
    if (node.children[0]?.text === 'export') {
      return true;
    }

    // For variable declarators, check the parent declaration
    if (node.type === 'variable_declarator') {
      const declaration = node.parent;
      if (declaration?.parent?.type === 'export_statement') {
        return true;
      }
    }

    return false;
  }

  /**
   * Build signature string for symbol
   */
  private buildSignature(
    node: SyntaxNode,
    kind: SymbolKind,
    name: string
  ): string {
    switch (kind) {
      case 'function': {
        const params = this.extractParameters(node);
        const returnType = this.extractReturnType(node);
        return `${name}(${params})${returnType ? `: ${returnType}` : ''}`;
      }
      case 'method': {
        const params = this.extractParameters(node);
        const returnType = this.extractReturnType(node);
        return `${name}(${params})${returnType ? `: ${returnType}` : ''}`;
      }
      case 'class': {
        const heritage = this.extractClassHeritage(node);
        return `class ${name}${heritage}`;
      }
      case 'interface': {
        const extends_ = this.extractInterfaceExtends(node);
        return `interface ${name}${extends_}`;
      }
      case 'type': {
        const typeValue = this.extractTypeValue(node);
        return `type ${name} = ${typeValue}`;
      }
      case 'enum':
        return `enum ${name}`;
      case 'constant':
      case 'variable': {
        const type = this.extractVariableType(node);
        return `${kind === 'constant' ? 'const' : 'let'} ${name}${type ? `: ${type}` : ''}`;
      }
      case 'property': {
        const type = this.extractPropertyType(node);
        return `${name}${type ? `: ${type}` : ''}`;
      }
      default:
        return name;
    }
  }

  /**
   * Extract function/method parameters
   */
  private extractParameters(node: SyntaxNode): string {
    const params = node.childForFieldName('parameters');
    if (params) {
      // Remove parentheses and simplify
      const text = params.text;
      return text.slice(1, -1); // Remove ( and )
    }
    return '';
  }

  /**
   * Extract return type annotation
   */
  private extractReturnType(node: SyntaxNode): string | null {
    const returnType = node.childForFieldName('return_type');
    if (returnType) {
      return returnType.text.replace(/^:\s*/, '');
    }
    return null;
  }

  /**
   * Extract class heritage (extends/implements)
   */
  private extractClassHeritage(node: SyntaxNode): string {
    const parts: string[] = [];
    const heritage = node.childForFieldName('heritage');
    if (heritage) {
      // Look for extends and implements
      for (const child of heritage.namedChildren) {
        if (child.type === 'extends_clause') {
          parts.push(` extends ${child.namedChildren.map((n) => n.text).join(', ')}`);
        }
        if (child.type === 'implements_clause') {
          parts.push(` implements ${child.namedChildren.map((n) => n.text).join(', ')}`);
        }
      }
    }
    // Also check direct children
    for (const child of node.namedChildren) {
      if (child.type === 'class_heritage') {
        for (const clause of child.namedChildren) {
          if (clause.type === 'extends_clause') {
            const types = clause.namedChildren
              .filter((n) => n.type !== 'extends')
              .map((n) => n.text);
            if (types.length) parts.push(` extends ${types.join(', ')}`);
          }
          if (clause.type === 'implements_clause') {
            const types = clause.namedChildren
              .filter((n) => n.type !== 'implements')
              .map((n) => n.text);
            if (types.length) parts.push(` implements ${types.join(', ')}`);
          }
        }
      }
    }
    return parts.join('');
  }

  /**
   * Extract interface extends clause
   */
  private extractInterfaceExtends(node: SyntaxNode): string {
    for (const child of node.namedChildren) {
      if (child.type === 'extends_type_clause' || child.type === 'extends_clause') {
        const types = child.namedChildren.map((n) => n.text);
        return types.length ? ` extends ${types.join(', ')}` : '';
      }
    }
    return '';
  }

  /**
   * Extract type alias value (truncated)
   */
  private extractTypeValue(node: SyntaxNode): string {
    const value = node.childForFieldName('value');
    if (value) {
      const text = value.text;
      return text.length > 50 ? text.slice(0, 50) + '...' : text;
    }
    return '...';
  }

  /**
   * Extract variable type annotation
   */
  private extractVariableType(node: SyntaxNode): string | null {
    const type = node.childForFieldName('type');
    if (type) {
      return type.text.replace(/^:\s*/, '');
    }
    return null;
  }

  /**
   * Extract property type annotation
   */
  private extractPropertyType(node: SyntaxNode): string | null {
    const type = node.childForFieldName('type');
    if (type) {
      return type.text.replace(/^:\s*/, '');
    }
    return null;
  }

  /**
   * Extract JSDoc documentation
   */
  private extractDocumentation(node: SyntaxNode): string | undefined {
    // For exported declarations, the JSDoc is attached to the export_statement
    // not the declaration itself. Check parent first if it's an export.
    const nodeToCheck = node.parent?.type === 'export_statement' ? node.parent : node;

    // Look for preceding comment
    let sibling = nodeToCheck.previousSibling;
    while (sibling) {
      if (sibling.type === 'comment') {
        const text = sibling.text;
        if (text.startsWith('/**') && text.endsWith('*/')) {
          // Clean up JSDoc comment
          return text
            .slice(3, -2) // Remove /** and */
            .split('\n')
            .map((line) =>
              line
                .trim()
                .replace(/^\*\s?/, '')
                .trim()
            )
            .filter((line) => line.length > 0 && !line.startsWith('@'))
            .join(' ')
            .trim();
        }
        break;
      }
      // Skip whitespace nodes
      if (sibling.type !== 'comment' && sibling.isNamed) {
        break;
      }
      sibling = sibling.previousSibling;
    }
    return undefined;
  }

  // ============================================================================
  // Import Extraction
  // ============================================================================

  /**
   * Extract all import statements
   */
  private extractImports(rootNode: SyntaxNode): ImportStatement[] {
    const imports: ImportStatement[] = [];
    const importNodes = rootNode.descendantsOfType('import_statement');

    for (const node of importNodes) {
      const importStatement = this.parseImportStatement(node);
      if (importStatement) {
        imports.push(importStatement);
      }
    }

    // Also look for require() calls
    const callNodes = rootNode.descendantsOfType('call_expression');
    for (const node of callNodes) {
      const func = node.childForFieldName('function');
      if (func?.text === 'require') {
        const args = node.childForFieldName('arguments');
        if (args && args.namedChildren[0]) {
          const source = args.namedChildren[0].text.replace(/['"]/g, '');
          imports.push({
            type: 'require',
            source,
            symbols: [],
            line: node.startPosition.row + 1,
            typeOnly: false,
          });
        }
      }
    }

    // Look for dynamic imports
    const dynamicImports = rootNode.descendantsOfType('import');
    for (const node of dynamicImports) {
      if (node.parent?.type === 'call_expression') {
        const args = node.parent.childForFieldName('arguments');
        if (args && args.namedChildren[0]) {
          const source = args.namedChildren[0].text.replace(/['"]/g, '');
          imports.push({
            type: 'dynamic',
            source,
            symbols: [],
            line: node.startPosition.row + 1,
            typeOnly: false,
          });
        }
      }
    }

    return imports;
  }

  /**
   * Parse a single import statement
   */
  private parseImportStatement(node: SyntaxNode): ImportStatement | null {
    const line = node.startPosition.row + 1;

    // Check if it's a type-only import
    const typeOnly = node.children.some((c) => c.text === 'type');

    // Get the source module
    const source = node.childForFieldName('source');
    if (!source) return null;

    const sourceText = source.text.replace(/['"]/g, '');

    // Check for side-effect import: import './foo'
    if (node.namedChildCount === 1) {
      return {
        type: 'side_effect',
        source: sourceText,
        symbols: [],
        line,
        typeOnly: false,
      };
    }

    const symbols: Array<{ local: string; imported?: string }> = [];
    let importType: ImportStatement['type'] = 'named';

    // Find import clause
    for (const child of node.namedChildren) {
      // Default import: import X from './mod'
      if (child.type === 'identifier') {
        importType = 'default';
        symbols.push({ local: child.text });
      }

      // Namespace import: import * as X from './mod'
      if (child.type === 'namespace_import') {
        importType = 'namespace';
        // The identifier is a direct child, not accessed via field name
        const alias = child.firstNamedChild;
        if (alias && alias.type === 'identifier') {
          symbols.push({ local: alias.text, imported: '*' });
        }
      }

      // Named imports: import { a, b as c } from './mod'
      if (child.type === 'named_imports') {
        for (const specifier of child.namedChildren) {
          if (specifier.type === 'import_specifier') {
            const name = specifier.childForFieldName('name');
            const alias = specifier.childForFieldName('alias');
            if (name) {
              symbols.push({
                local: alias?.text || name.text,
                imported: name.text,
              });
            }
          }
        }
      }

      // Import clause may contain both default and named
      if (child.type === 'import_clause') {
        for (const clauseChild of child.namedChildren) {
          if (clauseChild.type === 'identifier') {
            importType = 'default';
            symbols.push({ local: clauseChild.text });
          }
          if (clauseChild.type === 'namespace_import') {
            importType = 'namespace';
            // The identifier is a direct child, not accessed via field name
            const alias = clauseChild.firstNamedChild;
            if (alias && alias.type === 'identifier') {
              symbols.push({ local: alias.text, imported: '*' });
            }
          }
          if (clauseChild.type === 'named_imports') {
            importType = 'named';
            for (const specifier of clauseChild.namedChildren) {
              if (specifier.type === 'import_specifier') {
                const name = specifier.childForFieldName('name');
                const alias = specifier.childForFieldName('alias');
                if (name) {
                  symbols.push({
                    local: alias?.text || name.text,
                    imported: name.text,
                  });
                }
              }
            }
          }
        }
      }
    }

    return {
      type: importType,
      source: sourceText,
      symbols,
      line,
      typeOnly,
    };
  }

  // ============================================================================
  // Export Extraction
  // ============================================================================

  /**
   * Extract all export statements
   */
  private extractExports(rootNode: SyntaxNode): ExportStatement[] {
    const exports: ExportStatement[] = [];
    const exportNodes = rootNode.descendantsOfType('export_statement');

    for (const node of exportNodes) {
      const exportStatement = this.parseExportStatement(node);
      if (exportStatement) {
        exports.push(exportStatement);
      }
    }

    return exports;
  }

  /**
   * Parse a single export statement
   */
  private parseExportStatement(node: SyntaxNode): ExportStatement | null {
    const line = node.startPosition.row + 1;
    const symbols: Array<{ local: string; exported?: string }> = [];
    let exportType: ExportStatement['type'] = 'named';
    let source: string | undefined;

    // Check for re-export source
    const sourceNode = node.childForFieldName('source');
    if (sourceNode) {
      source = sourceNode.text.replace(/['"]/g, '');
    }

    for (const child of node.namedChildren) {
      // export default X
      if (child.type === 'identifier' && node.children.some((c) => c.text === 'default')) {
        exportType = 'default';
        symbols.push({ local: child.text });
      }

      // export default function/class
      if (
        (child.type === 'function_declaration' ||
          child.type === 'class_declaration') &&
        node.children.some((c) => c.text === 'default')
      ) {
        exportType = 'default';
        const name = child.childForFieldName('name');
        symbols.push({ local: name?.text || 'default' });
      }

      // export { a, b as c }
      if (child.type === 'export_clause') {
        for (const specifier of child.namedChildren) {
          if (specifier.type === 'export_specifier') {
            const name = specifier.childForFieldName('name');
            const alias = specifier.childForFieldName('alias');
            if (name) {
              symbols.push({
                local: name.text,
                exported: alias?.text,
              });
            }
          }
        }
        exportType = source ? 're_export' : 'named';
      }

      // export * from './mod'
      if (child.type === 'namespace_export' || child.text === '*') {
        exportType = 'all';
        symbols.push({ local: '*' });
      }

      // export function/class/const
      if (
        child.type === 'function_declaration' ||
        child.type === 'class_declaration' ||
        child.type === 'lexical_declaration'
      ) {
        const name = child.childForFieldName('name');
        if (name) {
          symbols.push({ local: name.text });
        } else if (child.type === 'lexical_declaration') {
          // Get variable names from declaration
          for (const declarator of child.namedChildren) {
            if (declarator.type === 'variable_declarator') {
              const varName = declarator.childForFieldName('name');
              if (varName) {
                symbols.push({ local: varName.text });
              }
            }
          }
        }
      }

      // export type/interface
      if (
        child.type === 'type_alias_declaration' ||
        child.type === 'interface_declaration'
      ) {
        const name = child.childForFieldName('name');
        if (name) {
          symbols.push({ local: name.text });
        }
      }
    }

    // Handle export all: export * from './mod'
    if (source && symbols.length === 0) {
      const hasNamespaceExport = node.children.some(
        (c) => c.type === 'namespace_export' || c.text === '*'
      );
      if (hasNamespaceExport) {
        exportType = 'all';
        symbols.push({ local: '*' });
      }
    }

    if (symbols.length === 0) return null;

    return {
      type: exportType,
      symbols,
      source,
      line,
    };
  }

  // ============================================================================
  // Error Detection
  // ============================================================================

  /**
   * Find parse errors in AST
   */
  private findErrors(rootNode: SyntaxNode): ParseError[] {
    const errors: ParseError[] = [];

    const walk = (node: SyntaxNode) => {
      if (node.type === 'ERROR' || node.hasError) {
        errors.push({
          message: `Syntax error: unexpected ${node.type}`,
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
          nodeType: node.type,
        });
      }

      for (const child of node.children) {
        walk(child);
      }
    };

    walk(rootNode);
    return errors;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let singletonParser: TreeSitterParser | null = null;

/**
 * Get singleton TreeSitterParser instance
 */
export function getParser(wasmBasePath?: string): TreeSitterParser {
  if (!singletonParser) {
    singletonParser = new TreeSitterParser(wasmBasePath);
  }
  return singletonParser;
}

/**
 * Reset singleton (for testing)
 */
export function resetParser(): void {
  singletonParser = null;
}
