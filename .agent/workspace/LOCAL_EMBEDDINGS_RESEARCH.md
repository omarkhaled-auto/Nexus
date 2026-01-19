# Local Embeddings Research

## Date: 2026-01-19

## Context

Nexus currently uses OpenAI's `text-embedding-3-small` model for vector embeddings via `EmbeddingsService` (src/persistence/memory/EmbeddingsService.ts). This research explores local embedding alternatives to enable offline/CLI-first operation.

---

## Existing EmbeddingsService Analysis

**File**: `src/persistence/memory/EmbeddingsService.ts`

**Key Characteristics:**
- Model: `text-embedding-3-small` (default)
- Dimensions: **1536**
- Features: Caching, batch operations, mock mode for testing
- API: OpenAI embeddings API
- Methods: `embed()`, `embedBatch()`, `cosineSimilarity()`, `findMostSimilar()`

**Interface to Match:**
```typescript
interface EmbeddingsServiceOptions {
  apiKey: string;
  model?: string;
  mockMode?: boolean;
  maxRetries?: number;
  batchSize?: number;
}

interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}
```

---

## Auto-Claude Implementation

**Note:** No specific "auto-claude" local embeddings implementation was found in public repositories. The concept refers to running Claude-like capabilities locally with local embeddings.

---

## Implementation Options for Nexus

### Option A: Transformers.js (RECOMMENDED)

**Package**: `@huggingface/transformers` (formerly `@xenova/transformers`)

**Model**: `Xenova/all-MiniLM-L6-v2`
- Dimensions: **384**
- Max tokens: 256 (128 recommended)
- Use case: Sentences and small paragraphs
- Performance: Fast, runs in Node.js
- No external server required

**Pros:**
- Runs completely locally in Node.js
- No additional services to install
- Good quality for semantic search
- Automatic model download on first use
- ONNX runtime - optimized inference
- Well-maintained by Hugging Face

**Cons:**
- Different dimensions than OpenAI (384 vs 1536)
- Limited context length (256 tokens max)
- First-run model download (~25MB)

**Installation:**
```bash
npm install @huggingface/transformers
```

**Basic Usage:**
```typescript
import { pipeline } from '@huggingface/transformers';

const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const output = await extractor('Hello world', { pooling: 'mean', normalize: true });
const embedding = Array.from(output.data);
```

### Option B: Ollama

**Package**: `ollama` (npm package)

**Model**: `nomic-embed-text`
- Dimensions: **1024** (closer to OpenAI)
- Context length: 8192 tokens
- Performance: Good quality, competitive with OpenAI

**Pros:**
- Higher quality embeddings
- Longer context support
- Closer dimensions to OpenAI
- REST API for flexibility
- Can run many models

**Cons:**
- Requires Ollama server running (`ollama serve`)
- Extra installation step for users
- More resource-intensive (~500MB+ model)
- External dependency

**Installation:**
```bash
# User must install Ollama first
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text

# Then in Node.js
npm install ollama
```

**Basic Usage:**
```typescript
import ollama from 'ollama';

const response = await ollama.embeddings({
  model: 'nomic-embed-text',
  prompt: 'Hello world'
});
const embedding = response.embedding; // number[]
```

### Option C: LlamaIndex / LlamaCpp

**Package**: `llama-index-embeddings-huggingface` (Python), `llama-node` (Node.js)

**Pros:**
- Full control over model loading
- Can use any GGUF model
- OpenVINO/ONNX acceleration

**Cons:**
- More complex setup
- Heavier dependency
- Better Python support than Node.js
- Requires native compilation

**Not Recommended** for this project due to complexity.

---

## Recommended Approach

### Primary: Transformers.js with `all-MiniLM-L6-v2`

**Reasons:**
1. **Zero external dependencies** - Just npm install
2. **Matches CLI-first philosophy** - Works offline immediately
3. **Good enough quality** - Proven for semantic search
4. **Fast** - ONNX runtime is highly optimized
5. **Well-maintained** - Active Hugging Face support

### Secondary/Fallback: Ollama (optional)

If user has Ollama installed, offer as higher-quality option:
- Detect `ollama` availability with `ollama list`
- Use `nomic-embed-text` for better quality/longer context

---

## Dimension Compatibility

### The Challenge

| Model | Dimensions |
|-------|------------|
| OpenAI text-embedding-3-small | 1536 |
| all-MiniLM-L6-v2 | 384 |
| nomic-embed-text | 1024 |

**Problem**: Existing Nexus vectors are 1536-dimensional. Local embeddings are different.

### Solution Strategies

#### Strategy 1: Separate Vector Stores (RECOMMENDED)
- Create new vector index for local embeddings
- Keep OpenAI index separate
- On backend switch, re-embed relevant data
- Simple, clean, no data corruption

#### Strategy 2: Dimension Adapter (NOT RECOMMENDED)
```typescript
// Padding: Add zeros to match target
function padEmbedding(embedding: number[], target: number): number[] {
  if (embedding.length >= target) return embedding.slice(0, target);
  return [...embedding, ...new Array(target - embedding.length).fill(0)];
}
```
**Problems:** Breaks semantic similarity, not mathematically valid

#### Strategy 3: Re-embed on Switch (PRACTICAL)
- When user switches to local embeddings
- Automatically re-embed existing memories
- Progress indicator for large datasets
- One-time migration per backend change

### Recommendation

1. **New projects**: Use local embeddings from start (384 dims)
2. **Existing projects with OpenAI**: Offer migration wizard
3. **Mixed mode**: Not supported (too complex)

---

## Fallback Strategy

```typescript
async function createEmbeddingsService(config: Config): Promise<EmbeddingsLike> {
  // 1. Try local (default for CLI-first)
  if (config.embeddingsBackend === 'local') {
    const local = new LocalEmbeddingsService(config.localConfig);
    if (await local.isAvailable()) {
      return local;
    }

    // 2. Fallback to API if key exists
    if (config.openaiApiKey) {
      console.warn('Local embeddings unavailable, using OpenAI API');
      return new EmbeddingsService({ apiKey: config.openaiApiKey });
    }

    // 3. Error with helpful message
    throw new LocalEmbeddingsUnavailableError();
  }

  // API explicitly requested
  if (!config.openaiApiKey) {
    throw new Error('OpenAI API key required for API embeddings');
  }
  return new EmbeddingsService({ apiKey: config.openaiApiKey });
}
```

---

## Implementation Plan for LocalEmbeddingsService

### Files to Create

1. `src/persistence/memory/LocalEmbeddingsService.types.ts`
   - `LocalEmbeddingsConfig`
   - `LocalEmbeddingResult`
   - `MODEL_DIMENSIONS` mapping
   - Default config

2. `src/persistence/memory/LocalEmbeddingsService.ts`
   - Main service class
   - Uses `@huggingface/transformers`
   - Implements same interface as `EmbeddingsService`
   - Caching support
   - Batch operations

3. `src/persistence/memory/LocalEmbeddingsService.test.ts`
   - Unit tests
   - Mock pipeline for fast tests
   - Integration tests with real model (optional)

### Interface Design

```typescript
export interface LocalEmbeddingsConfig {
  model?: string;                    // 'all-MiniLM-L6-v2'
  cacheEnabled?: boolean;            // true
  maxCacheSize?: number;             // 10000
  progressCallback?: (pct: number) => void;
}

export class LocalEmbeddingsService {
  // Same interface as EmbeddingsService
  async embed(text: string): Promise<EmbeddingResult>;
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
  cosineSimilarity(a: number[], b: number[]): number;
  findMostSimilar(query: number[], candidates: number[][], topK?: number): Array<{index: number; similarity: number}>;
  getDimension(): number;  // Returns 384 for MiniLM
  clearCache(): void;
  getCacheSize(): number;

  // Local-specific
  async isAvailable(): Promise<boolean>;
  async initialize(): Promise<void>;
}
```

---

## Summary

| Aspect | Decision |
|--------|----------|
| **Primary Option** | Transformers.js with all-MiniLM-L6-v2 |
| **Dimensions** | 384 (local) vs 1536 (OpenAI) |
| **Dimension Strategy** | Separate vector stores, re-embed on switch |
| **Fallback** | OpenAI API if key available |
| **Installation** | npm install @huggingface/transformers |
| **Offline Support** | Yes (after first model download) |

---

## Sources

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js/en/index)
- [Xenova/all-MiniLM-L6-v2 Model](https://huggingface.co/Xenova/all-MiniLM-L6-v2)
- [How to Create Vector Embeddings in Node.js](https://dev.to/datastax/how-to-create-vector-embeddings-in-nodejs-2khl)
- [LanceDB Transformers.js Example](https://lancedb.github.io/lancedb/examples/transformerjs_embedding_search_nodejs/)
- [Ollama Embeddings Documentation](https://docs.ollama.com/capabilities/embeddings)
- [nomic-embed-text Model](https://ollama.com/library/nomic-embed-text)
