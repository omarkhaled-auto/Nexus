# NEXUS FINALIZATION - Complete Model Configuration & Fixes

## MISSION CRITICAL

Finalize Nexus with correct LLM model configuration. This prompt addresses:
1. **Model Configuration** - Create centralized model constants with LATEST models
2. **User Model Selection** - Allow users to choose ANY model for all LLMs
3. **Fix 3 Minor Issues** from Phase 16 review

## Project Path

```
C:\Users\Omar Khaled\OneDrive\Desktop\Nexus
```

---

## CRITICAL: LATEST MODEL INFORMATION (January 2026)

### Claude Models (Anthropic) - VERIFIED LATEST

| Model | API String | Released | Use Case | Context | Pricing (Input/Output) |
|-------|------------|----------|----------|---------|------------------------|
| **Claude Opus 4.5** | `claude-opus-4-5-20251101` | Nov 24, 2025 | Most intelligent, coding, agents | 200K | $5/$25 per 1M |
| **Claude Sonnet 4.5** | `claude-sonnet-4-5-20250929` | Sep 29, 2025 | Best balance speed/intelligence | 200K (1M beta) | $3/$15 per 1M |
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | Oct 15, 2025 | Fast, lightweight, low-cost | 200K | $1/$5 per 1M |
| Claude Opus 4.1 | `claude-opus-4-1-20250805` | Aug 5, 2025 | Previous Opus | 200K | $15/$75 per 1M |
| Claude Sonnet 4 | `claude-sonnet-4-20250514` | May 22, 2025 | Previous Sonnet | 200K | $3/$15 per 1M |

**DEFAULT FOR NEXUS: `claude-sonnet-4-5-20250929`** (best balance for autonomous coding)

### Gemini Models (Google) - VERIFIED LATEST

| Model | API String | Released | Use Case | Context | Status |
|-------|------------|----------|----------|---------|--------|
| **Gemini 3 Pro** | `gemini-3-pro` | Nov 18, 2025 | Most powerful reasoning | 1M | Preview |
| **Gemini 3 Flash** | `gemini-3-flash` | Dec 17, 2025 | Fast, PhD-level reasoning | 1M | Default in app |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | Jun 2025 (stable) | Advanced reasoning, coding | 1M | GA/Stable |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Jun 2025 (stable) | Balance speed/intelligence | 1M | GA/Stable |
| Gemini 2.5 Flash-Lite | `gemini-2.5-flash-lite` | Jul 2025 | Cost-optimized, high throughput | 1M | GA/Stable |

**DEFAULT FOR NEXUS: `gemini-2.5-flash`** (stable, fast, good for review tasks)

### OpenAI Embedding Models

| Model | API String | Dimensions | Use Case |
|-------|------------|------------|----------|
| **Text Embedding 3 Small** | `text-embedding-3-small` | 1536 | Good balance |
| Text Embedding 3 Large | `text-embedding-3-large` | 3072 | Highest quality |
| Ada 002 (Legacy) | `text-embedding-ada-002` | 1536 | Legacy support |

**DEFAULT: `text-embedding-3-small`**

### Local Embedding Models (HuggingFace/Xenova)

| Model | ID | Dimensions | Use Case |
|-------|-----|------------|----------|
| **MiniLM L6 v2** | `Xenova/all-MiniLM-L6-v2` | 384 | Fast, lightweight |
| MPNet Base v2 | `Xenova/all-mpnet-base-v2` | 768 | Higher quality |
| BGE Small EN | `Xenova/bge-small-en-v1.5` | 384 | Retrieval optimized |
| BGE Base EN | `Xenova/bge-base-en-v1.5` | 768 | Higher quality retrieval |

**DEFAULT: `Xenova/all-MiniLM-L6-v2`**

---

## FIX 1: Create Centralized Model Configuration

### Step 1.1: Create Models Constants File

Create `src/llm/models.ts`:

```typescript
/**
 * NEXUS LLM Model Configuration
 * =============================
 * 
 * IMPORTANT: This file contains the AUTHORITATIVE list of supported models.
 * All model references throughout Nexus MUST use these constants.
 * 
 * Last Updated: January 2026
 * 
 * To add new models:
 * 1. Add to the appropriate *_MODELS constant
 * 2. Update DEFAULT_*_MODEL if needed
 * 3. Run tests to verify
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ModelInfo {
  /** Model ID for API calls */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Context window size in tokens */
  contextWindow: number;
  /** Optional description */
  description?: string;
  /** Release date */
  released?: string;
  /** Whether this is the recommended default */
  isDefault?: boolean;
  /** Whether this model is deprecated */
  deprecated?: boolean;
}

export interface EmbeddingModelInfo {
  /** Model ID for API calls */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Embedding vector dimensions */
  dimensions: number;
  /** Optional description */
  description?: string;
  /** Whether this is the recommended default */
  isDefault?: boolean;
}

// =============================================================================
// CLAUDE MODELS (Anthropic) - Updated January 2026
// =============================================================================

export const CLAUDE_MODELS: Record<string, ModelInfo> = {
  // === Claude 4.5 Family (LATEST) ===
  'claude-opus-4-5-20251101': {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    contextWindow: 200000,
    description: 'Most intelligent - Best for complex coding, agents, and sophisticated tasks',
    released: '2025-11-24',
  },
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    contextWindow: 200000, // 1M with beta header
    description: 'Best balance of speed and intelligence - Recommended for most tasks',
    released: '2025-09-29',
    isDefault: true,
  },
  'claude-haiku-4-5-20251001': {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    contextWindow: 200000,
    description: 'Fast and lightweight - Best for simple tasks and high volume',
    released: '2025-10-15',
  },
  
  // === Claude 4.x Family ===
  'claude-opus-4-1-20250805': {
    id: 'claude-opus-4-1-20250805',
    name: 'Claude Opus 4.1',
    contextWindow: 200000,
    description: 'Previous Opus - Strong coding and agentic capabilities',
    released: '2025-08-05',
  },
  'claude-sonnet-4-20250514': {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    contextWindow: 200000,
    description: 'Previous Sonnet - Good all-around performance',
    released: '2025-05-22',
  },
} as const;

/** Default Claude model for Nexus */
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

// =============================================================================
// GEMINI MODELS (Google) - Updated January 2026
// =============================================================================

export const GEMINI_MODELS: Record<string, ModelInfo> = {
  // === Gemini 3 Family (LATEST) ===
  'gemini-3-pro': {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    contextWindow: 1000000,
    description: 'Most powerful reasoning model - Best for complex analysis',
    released: '2025-11-18',
  },
  'gemini-3-flash': {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    contextWindow: 1000000,
    description: 'Fast with PhD-level reasoning - New default in Gemini app',
    released: '2025-12-17',
  },
  
  // === Gemini 2.5 Family (Stable/GA) ===
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    contextWindow: 1000000,
    description: 'Advanced reasoning with thinking - Stable release',
    released: '2025-06-26',
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    contextWindow: 1000000,
    description: 'Fast and capable - Best balance for production use',
    released: '2025-06-17',
    isDefault: true,
  },
  'gemini-2.5-flash-lite': {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    contextWindow: 1000000,
    description: 'Cost-optimized - Best for high-volume tasks',
    released: '2025-07-29',
  },
} as const;

/** Default Gemini model for Nexus (stable, fast, good for reviews) */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// =============================================================================
// OPENAI EMBEDDING MODELS
// =============================================================================

export const OPENAI_EMBEDDING_MODELS: Record<string, EmbeddingModelInfo> = {
  'text-embedding-3-small': {
    id: 'text-embedding-3-small',
    name: 'Text Embedding 3 Small',
    dimensions: 1536,
    description: 'Good balance of quality and cost',
    isDefault: true,
  },
  'text-embedding-3-large': {
    id: 'text-embedding-3-large',
    name: 'Text Embedding 3 Large',
    dimensions: 3072,
    description: 'Highest quality embeddings',
  },
  'text-embedding-ada-002': {
    id: 'text-embedding-ada-002',
    name: 'Ada 002 (Legacy)',
    dimensions: 1536,
    description: 'Previous generation - Legacy support',
  },
} as const;

/** Default OpenAI embedding model */
export const DEFAULT_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

// =============================================================================
// LOCAL EMBEDDING MODELS (HuggingFace/Xenova)
// =============================================================================

export const LOCAL_EMBEDDING_MODELS: Record<string, EmbeddingModelInfo> = {
  'Xenova/all-MiniLM-L6-v2': {
    id: 'Xenova/all-MiniLM-L6-v2',
    name: 'MiniLM L6 v2',
    dimensions: 384,
    description: 'Fast, lightweight - Best for most use cases',
    isDefault: true,
  },
  'Xenova/all-mpnet-base-v2': {
    id: 'Xenova/all-mpnet-base-v2',
    name: 'MPNet Base v2',
    dimensions: 768,
    description: 'Higher quality - Larger model',
  },
  'Xenova/bge-small-en-v1.5': {
    id: 'Xenova/bge-small-en-v1.5',
    name: 'BGE Small English',
    dimensions: 384,
    description: 'Optimized for retrieval tasks',
  },
  'Xenova/bge-base-en-v1.5': {
    id: 'Xenova/bge-base-en-v1.5',
    name: 'BGE Base English',
    dimensions: 768,
    description: 'Higher quality BGE model',
  },
} as const;

/** Default local embedding model */
export const DEFAULT_LOCAL_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Claude model info by ID
 */
export function getClaudeModel(modelId: string): ModelInfo | undefined {
  return CLAUDE_MODELS[modelId];
}

/**
 * Get Gemini model info by ID
 */
export function getGeminiModel(modelId: string): ModelInfo | undefined {
  return GEMINI_MODELS[modelId];
}

/**
 * Get OpenAI embedding model info by ID
 */
export function getOpenAIEmbeddingModel(modelId: string): EmbeddingModelInfo | undefined {
  return OPENAI_EMBEDDING_MODELS[modelId];
}

/**
 * Get local embedding model info by ID
 */
export function getLocalEmbeddingModel(modelId: string): EmbeddingModelInfo | undefined {
  return LOCAL_EMBEDDING_MODELS[modelId];
}

/**
 * Get embedding dimensions for a model
 */
export function getEmbeddingDimensions(modelId: string, backend: 'local' | 'api'): number {
  if (backend === 'local') {
    return LOCAL_EMBEDDING_MODELS[modelId]?.dimensions ?? 384;
  }
  return OPENAI_EMBEDDING_MODELS[modelId]?.dimensions ?? 1536;
}

/**
 * Validate if a Claude model ID exists
 */
export function isValidClaudeModel(modelId: string): boolean {
  return modelId in CLAUDE_MODELS;
}

/**
 * Validate if a Gemini model ID exists
 */
export function isValidGeminiModel(modelId: string): boolean {
  return modelId in GEMINI_MODELS;
}

/**
 * Validate if an embedding model ID exists
 */
export function isValidEmbeddingModel(modelId: string, backend: 'local' | 'api'): boolean {
  if (backend === 'local') {
    return modelId in LOCAL_EMBEDDING_MODELS;
  }
  return modelId in OPENAI_EMBEDDING_MODELS;
}

/**
 * Get all Claude models as array (for UI dropdowns)
 */
export function getClaudeModelList(): ModelInfo[] {
  return Object.values(CLAUDE_MODELS).filter(m => !m.deprecated);
}

/**
 * Get all Gemini models as array (for UI dropdowns)
 */
export function getGeminiModelList(): ModelInfo[] {
  return Object.values(GEMINI_MODELS).filter(m => !m.deprecated);
}

/**
 * Get all OpenAI embedding models as array (for UI dropdowns)
 */
export function getOpenAIEmbeddingModelList(): EmbeddingModelInfo[] {
  return Object.values(OPENAI_EMBEDDING_MODELS);
}

/**
 * Get all local embedding models as array (for UI dropdowns)
 */
export function getLocalEmbeddingModelList(): EmbeddingModelInfo[] {
  return Object.values(LOCAL_EMBEDDING_MODELS);
}

// =============================================================================
// NEXUS AGENT ROLE ASSIGNMENTS
// =============================================================================

/**
 * Recommended models for each Nexus agent role
 * These can be overridden by user settings
 */
export const NEXUS_AGENT_MODELS = {
  /** Planner agent - needs strong reasoning */
  planner: {
    claude: 'claude-opus-4-5-20251101',      // Best reasoning
    gemini: 'gemini-2.5-pro',                 // Strong reasoning
  },
  /** Coder agent - needs fast, accurate coding */
  coder: {
    claude: 'claude-sonnet-4-5-20250929',    // Fast, good coding
    gemini: 'gemini-2.5-flash',               // Fast, capable
  },
  /** Tester agent - needs accuracy */
  tester: {
    claude: 'claude-sonnet-4-5-20250929',    // Good balance
    gemini: 'gemini-2.5-flash',               // Fast, capable
  },
  /** Reviewer agent - needs thorough analysis */
  reviewer: {
    claude: 'claude-sonnet-4-5-20250929',    // Good analysis
    gemini: 'gemini-2.5-pro',                 // Thorough
  },
  /** Merger agent - needs precision */
  merger: {
    claude: 'claude-sonnet-4-5-20250929',    // Reliable
    gemini: 'gemini-2.5-flash',               // Fast
  },
} as const;

export type NexusAgentRole = keyof typeof NEXUS_AGENT_MODELS;
```

### Step 1.2: Export from Barrel

Update `src/llm/index.ts`:

```typescript
// Add to existing exports
export * from './models';
```

---

## FIX 2: Update All Model References Throughout Nexus

### Step 2.1: Search and Replace Outdated Models

```bash
# Find all hardcoded model references
grep -r "claude-sonnet-4-20250514" src/ --include="*.ts"
grep -r "claude-opus-4" src/ --include="*.ts"
grep -r "gemini-2.5-pro" src/ --include="*.ts"
grep -r "gemini-2.0" src/ --include="*.ts"
grep -r "gemini-1.5" src/ --include="*.ts"

# Find model references in settings/config
grep -r "model.*:" src/shared/types/ --include="*.ts"
grep -r "DEFAULT.*MODEL" src/ --include="*.ts"
```

### Step 2.2: Update Settings Types

Find and update `src/shared/types/settings.ts` (or wherever settings are defined):

```typescript
import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_LOCAL_EMBEDDING_MODEL,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
} from '../../llm/models';

export interface ClaudeSettings {
  backend: 'cli' | 'api';
  /** Model ID - user can choose any Claude model */
  model: string;
  apiKey?: string;
  cliPath?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface GeminiSettings {
  backend: 'cli' | 'api';
  /** Model ID - user can choose any Gemini model */
  model: string;
  apiKey?: string;
  cliPath?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface EmbeddingsSettings {
  backend: 'local' | 'api';
  /** Model ID - user can choose any embedding model */
  model: string;
  apiKey?: string;
  dimensions?: number;
  cacheEnabled?: boolean;
}

export interface LLMProviderSettings {
  claude: ClaudeSettings;
  gemini: GeminiSettings;
  embeddings: EmbeddingsSettings;
}

// DEFAULT SETTINGS - Using LATEST models
export const DEFAULT_CLAUDE_SETTINGS: ClaudeSettings = {
  backend: 'cli',
  model: DEFAULT_CLAUDE_MODEL, // claude-sonnet-4-5-20250929
  timeout: 300000,
  maxRetries: 2,
};

export const DEFAULT_GEMINI_SETTINGS: GeminiSettings = {
  backend: 'cli',
  model: DEFAULT_GEMINI_MODEL, // gemini-2.5-flash
  timeout: 300000,
  maxRetries: 2,
};

export const DEFAULT_EMBEDDINGS_SETTINGS: EmbeddingsSettings = {
  backend: 'local',
  model: DEFAULT_LOCAL_EMBEDDING_MODEL, // Xenova/all-MiniLM-L6-v2
  dimensions: 384,
  cacheEnabled: true,
};

export const DEFAULT_LLM_SETTINGS: LLMProviderSettings = {
  claude: DEFAULT_CLAUDE_SETTINGS,
  gemini: DEFAULT_GEMINI_SETTINGS,
  embeddings: DEFAULT_EMBEDDINGS_SETTINGS,
};
```

### Step 2.3: Update NexusFactory to Use Models Constants

In `src/NexusFactory.ts`, ensure model is passed from config:

```typescript
import { 
  DEFAULT_CLAUDE_MODEL, 
  DEFAULT_GEMINI_MODEL,
  DEFAULT_LOCAL_EMBEDDING_MODEL,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
} from './llm/models';

// In createClaudeClient():
const model = config.claudeSettings?.model ?? DEFAULT_CLAUDE_MODEL;

// In createGeminiClient():
const model = config.geminiSettings?.model ?? DEFAULT_GEMINI_MODEL;

// In createEmbeddingsService():
const model = config.embeddingsSettings?.model ?? 
  (config.embeddingsBackend === 'local' ? DEFAULT_LOCAL_EMBEDDING_MODEL : DEFAULT_OPENAI_EMBEDDING_MODEL);
```

### Step 2.4: Update GeminiCLIClient Default Model

Find and update `src/llm/clients/GeminiCLIClient.ts` or `GeminiCLIClient.types.ts`:

```typescript
import { DEFAULT_GEMINI_MODEL } from '../models';

export const DEFAULT_GEMINI_CLI_CONFIG: Required<Omit<GeminiCLIConfig, 'additionalFlags'>> = {
  cliPath: 'gemini',
  workingDirectory: process.cwd(),
  timeout: 300000,
  maxRetries: 2,
  model: DEFAULT_GEMINI_MODEL, // Use constant, not hardcoded string
};
```

### Step 2.5: Update LocalEmbeddingsService Default Model

Find and update `src/persistence/memory/LocalEmbeddingsService.types.ts`:

```typescript
import { DEFAULT_LOCAL_EMBEDDING_MODEL, LOCAL_EMBEDDING_MODELS } from '../../llm/models';

export const DEFAULT_LOCAL_EMBEDDINGS_CONFIG: Required<LocalEmbeddingsConfig> = {
  model: DEFAULT_LOCAL_EMBEDDING_MODEL,
  modelPath: '',
  dimensions: LOCAL_EMBEDDING_MODELS[DEFAULT_LOCAL_EMBEDDING_MODEL].dimensions,
  useGPU: false,
  batchSize: 32,
  cacheEnabled: true,
  maxCacheSize: 10000,
};
```

---

## FIX 3: Fix Minor Issues from Phase 16 Review

### Issue 1: Process Cleanup in GeminiCLIClient.executeStream()

In `src/llm/clients/GeminiCLIClient.ts`, find the `executeStream()` method and add process cleanup:

```typescript
async *executeStream(args: string[], input: string): AsyncGenerator<string> {
  const childProcess = spawn(this.config.cliPath, args, {
    cwd: this.config.workingDirectory,
    timeout: this.config.timeout,
  });
  
  let killed = false;
  
  try {
    // ... existing streaming logic ...
    
    for await (const chunk of childProcess.stdout) {
      yield chunk.toString();
    }
  } finally {
    // FIX: Always ensure process is killed on early termination
    if (!killed && childProcess.exitCode === null) {
      childProcess.kill('SIGTERM');
      killed = true;
      
      // Give it a moment, then force kill if needed
      setTimeout(() => {
        if (childProcess.exitCode === null) {
          childProcess.kill('SIGKILL');
        }
      }, 1000);
    }
  }
}
```

### Issue 2: True LRU Cache in LocalEmbeddingsService

In `src/persistence/memory/LocalEmbeddingsService.ts`, update the cache implementation:

```typescript
private addToCache(text: string, embedding: number[]): void {
  // FIX: Implement true LRU - delete and re-add on read to maintain order
  if (this.cache.has(text)) {
    this.cache.delete(text);
  }
  
  // Evict oldest if at capacity
  if (this.cache.size >= this.config.maxCacheSize) {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }
  
  this.cache.set(text, embedding);
}

// Also update the get method to refresh position:
private getFromCache(text: string): number[] | undefined {
  const embedding = this.cache.get(text);
  if (embedding) {
    // FIX: Move to end (most recently used)
    this.cache.delete(text);
    this.cache.set(text, embedding);
  }
  return embedding;
}
```

### Issue 3: TypeScript Configuration for Error.cause

In `tsconfig.json`, ensure the target supports Error.cause:

```json
{
  "compilerOptions": {
    "target": "ES2022",  // FIX: ES2022 supports Error.cause natively
    // ... rest of config
  }
}
```

If changing target isn't possible, update the error class:

```typescript
// In LocalEmbeddingsService.ts or LLMBackendErrors.ts
export class LocalEmbeddingsInitError extends Error {
  public override cause: unknown;  // Add override keyword
  
  constructor(model: string, cause: unknown) {
    super(`Failed to initialize...`);
    this.name = 'LocalEmbeddingsInitError';
    this.cause = cause;
  }
}
```

---

## FIX 4: Create Tests for Models Constants

Create `src/llm/models.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  CLAUDE_MODELS,
  GEMINI_MODELS,
  OPENAI_EMBEDDING_MODELS,
  LOCAL_EMBEDDING_MODELS,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
  DEFAULT_LOCAL_EMBEDDING_MODEL,
  getClaudeModel,
  getGeminiModel,
  isValidClaudeModel,
  isValidGeminiModel,
  getEmbeddingDimensions,
  getClaudeModelList,
  getGeminiModelList,
  NEXUS_AGENT_MODELS,
} from './models';

describe('LLM Models Configuration', () => {
  describe('Claude Models', () => {
    it('should have default model defined', () => {
      expect(DEFAULT_CLAUDE_MODEL).toBe('claude-sonnet-4-5-20250929');
      expect(CLAUDE_MODELS[DEFAULT_CLAUDE_MODEL]).toBeDefined();
    });
    
    it('should have all required Claude 4.5 models', () => {
      expect(CLAUDE_MODELS['claude-opus-4-5-20251101']).toBeDefined();
      expect(CLAUDE_MODELS['claude-sonnet-4-5-20250929']).toBeDefined();
      expect(CLAUDE_MODELS['claude-haiku-4-5-20251001']).toBeDefined();
    });
    
    it('should validate model IDs correctly', () => {
      expect(isValidClaudeModel('claude-sonnet-4-5-20250929')).toBe(true);
      expect(isValidClaudeModel('invalid-model')).toBe(false);
    });
    
    it('should get model info by ID', () => {
      const model = getClaudeModel('claude-opus-4-5-20251101');
      expect(model?.name).toBe('Claude Opus 4.5');
      expect(model?.contextWindow).toBe(200000);
    });
    
    it('should return model list for UI', () => {
      const list = getClaudeModelList();
      expect(list.length).toBeGreaterThan(0);
      expect(list.some(m => m.id === DEFAULT_CLAUDE_MODEL)).toBe(true);
    });
  });
  
  describe('Gemini Models', () => {
    it('should have default model defined', () => {
      expect(DEFAULT_GEMINI_MODEL).toBe('gemini-2.5-flash');
      expect(GEMINI_MODELS[DEFAULT_GEMINI_MODEL]).toBeDefined();
    });
    
    it('should have all required Gemini models', () => {
      expect(GEMINI_MODELS['gemini-3-pro']).toBeDefined();
      expect(GEMINI_MODELS['gemini-3-flash']).toBeDefined();
      expect(GEMINI_MODELS['gemini-2.5-pro']).toBeDefined();
      expect(GEMINI_MODELS['gemini-2.5-flash']).toBeDefined();
    });
    
    it('should validate model IDs correctly', () => {
      expect(isValidGeminiModel('gemini-2.5-flash')).toBe(true);
      expect(isValidGeminiModel('gemini-1.0-fake')).toBe(false);
    });
  });
  
  describe('Embedding Models', () => {
    it('should have default OpenAI embedding model', () => {
      expect(DEFAULT_OPENAI_EMBEDDING_MODEL).toBe('text-embedding-3-small');
      expect(OPENAI_EMBEDDING_MODELS[DEFAULT_OPENAI_EMBEDDING_MODEL]).toBeDefined();
    });
    
    it('should have default local embedding model', () => {
      expect(DEFAULT_LOCAL_EMBEDDING_MODEL).toBe('Xenova/all-MiniLM-L6-v2');
      expect(LOCAL_EMBEDDING_MODELS[DEFAULT_LOCAL_EMBEDDING_MODEL]).toBeDefined();
    });
    
    it('should return correct dimensions', () => {
      expect(getEmbeddingDimensions('Xenova/all-MiniLM-L6-v2', 'local')).toBe(384);
      expect(getEmbeddingDimensions('text-embedding-3-small', 'api')).toBe(1536);
      expect(getEmbeddingDimensions('text-embedding-3-large', 'api')).toBe(3072);
    });
  });
  
  describe('Nexus Agent Models', () => {
    it('should have models for all agent roles', () => {
      expect(NEXUS_AGENT_MODELS.planner).toBeDefined();
      expect(NEXUS_AGENT_MODELS.coder).toBeDefined();
      expect(NEXUS_AGENT_MODELS.tester).toBeDefined();
      expect(NEXUS_AGENT_MODELS.reviewer).toBeDefined();
      expect(NEXUS_AGENT_MODELS.merger).toBeDefined();
    });
    
    it('should reference valid models', () => {
      expect(isValidClaudeModel(NEXUS_AGENT_MODELS.planner.claude)).toBe(true);
      expect(isValidGeminiModel(NEXUS_AGENT_MODELS.planner.gemini)).toBe(true);
    });
  });
});
```

---

## FIX 5: Verification Steps

### Step 5.1: Search for Any Remaining Hardcoded Models

```bash
# These should return NO results (except models.ts and tests)
grep -rn "claude-sonnet-4-20250514" src/ --include="*.ts" | grep -v "models.ts" | grep -v ".test.ts"
grep -rn "gemini-2.0" src/ --include="*.ts" | grep -v "models.ts" | grep -v ".test.ts"
grep -rn "gemini-1.5" src/ --include="*.ts"

# Verify imports are correct
grep -rn "from.*models" src/ --include="*.ts" | head -20
```

### Step 5.2: Run All Checks

```bash
# TypeScript
npm run typecheck

# Lint
npm run lint

# Tests
npm test

# Verify new tests pass
npm test -- --testPathPattern="models.test"
```

### Step 5.3: Create Summary

After all fixes, create a summary:

```markdown
# NEXUS FINALIZATION COMPLETE

## Model Configuration Updated

### Claude (Default: claude-sonnet-4-5-20250929)
- ✅ Opus 4.5 (claude-opus-4-5-20251101)
- ✅ Sonnet 4.5 (claude-sonnet-4-5-20250929) - DEFAULT
- ✅ Haiku 4.5 (claude-haiku-4-5-20251001)
- ✅ Opus 4.1 (claude-opus-4-1-20250805)
- ✅ Sonnet 4 (claude-sonnet-4-20250514)

### Gemini (Default: gemini-2.5-flash)
- ✅ 3 Pro (gemini-3-pro)
- ✅ 3 Flash (gemini-3-flash)
- ✅ 2.5 Pro (gemini-2.5-pro)
- ✅ 2.5 Flash (gemini-2.5-flash) - DEFAULT
- ✅ 2.5 Flash-Lite (gemini-2.5-flash-lite)

### Embeddings
- ✅ OpenAI: text-embedding-3-small (DEFAULT)
- ✅ Local: Xenova/all-MiniLM-L6-v2 (DEFAULT)

## Minor Issues Fixed
1. ✅ GeminiCLIClient process cleanup
2. ✅ LocalEmbeddingsService true LRU cache
3. ✅ TypeScript Error.cause support

## Tests
- ✅ New model tests added
- ✅ All existing tests pass
- ✅ TypeScript: 0 errors
- ✅ ESLint: 0 errors
```

---

## CRITICAL NOTES FOR CLAUDE CODE

1. **ALWAYS use model constants** - Never hardcode model strings like `"gemini-2.5-pro"`. Always import from `src/llm/models.ts`.

2. **Update if models change** - When new models are released, update `src/llm/models.ts` ONLY.

3. **Default model rationale**:
   - Claude: Sonnet 4.5 is best balance for autonomous coding
   - Gemini: 2.5 Flash is stable and fast for reviews
   - Embeddings: MiniLM is fast and sufficient for code search

4. **User can override** - All defaults can be changed via Settings UI or config file.

5. **Verify after changes** - Run `npm test -- --testPathPattern="models"` to verify model config.

---

**Run this prompt with:**
```
claude-code run PROMPT-NEXUS-FINALIZATION-FIXES.md
```
