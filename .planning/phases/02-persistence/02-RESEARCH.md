# Phase 2: Persistence - Research

**Researched:** 2026-01-14
**Domain:** SQLite persistence with Drizzle ORM, embeddings, vector search
**Confidence:** HIGH

<research_summary>
## Summary

Researched the persistence stack for Nexus: Drizzle ORM with better-sqlite3, OpenAI embeddings, and vector search patterns. Phase 1 already established the core database infrastructure (DatabaseClient with WAL mode, foreign keys, Drizzle ORM).

Key findings:
1. **Drizzle ORM + better-sqlite3** is production-ready with transactions, relational queries, and type-safe operations
2. **text-embedding-3-small** is the recommended model: 5x cheaper than ada-002, better performance, flexible dimensions via Matryoshka representation
3. **Vector search options**: sqlite-vec extension OR application-layer cosine similarity (simpler, no native module complexity)
4. **Electron gotcha**: better-sqlite3 requires electron-rebuild, but Phase 1 already handles this

**Primary recommendation:** Use application-layer cosine similarity with Float32Array BLOBs for embeddings. Avoid sqlite-vec complexity in Electron. Store embeddings as BLOBs, compute similarity in TypeScript.

</research_summary>

<standard_stack>
## Standard Stack

### Core (Already Established in Phase 1)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| better-sqlite3 | 11.x | Synchronous SQLite for Node.js | Installed |
| drizzle-orm | 0.38.x | Type-safe ORM with SQLite support | Installed |
| drizzle-kit | 0.30.x | Schema migrations | Installed |

### New for Phase 2
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | ^4.x | Embeddings API client | Official SDK, TypeScript support |
| uuid | ^9.x | Unique ID generation | Already installed, standard for IDs |

### Not Needed
| Library | Why Not |
|---------|---------|
| sqlite-vec | Adds native module complexity in Electron; app-layer cosine is sufficient for <100k episodes |
| faiss-node | Overkill for episode memory; complex build |
| @xenova/transformers | Local embeddings add ~500MB; OpenAI API is simpler |

**Installation:**
```bash
npm install openai
# openai is the only new dependency needed
```

</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/persistence/
├── state/
│   └── StateManager.ts          # Project state CRUD + auto-save
├── checkpoints/
│   └── CheckpointManager.ts     # Snapshot create/restore
├── memory/
│   ├── MemorySystem.ts          # Episode storage + retrieval
│   └── EmbeddingsService.ts     # OpenAI embeddings + caching
├── requirements/
│   └── RequirementsDB.ts        # Requirements CRUD + categorization
└── database/
    ├── DatabaseClient.ts        # (Phase 1) Connection + migrations
    └── schema.ts                # (Phase 1) Table definitions

src/adapters/
└── StateFormatAdapter.ts        # STATE.md <-> NexusState conversion
```

### Pattern 1: Drizzle Transactions for Atomic State Updates
**What:** Wrap multi-table updates in transactions to ensure atomicity
**When to use:** saveState, checkpoint creation, bulk updates
**Example:**
```typescript
// Source: Context7 - Drizzle ORM transactions
await db.transaction(async (tx) => {
  await tx.update(projects).set({ status }).where(eq(projects.id, projectId));
  await tx.insert(tasks).values(newTasks);
  await tx.update(features).set({ completedTasks }).where(eq(features.id, featureId));
});
```

### Pattern 2: Relational Queries for State Hydration
**What:** Use Drizzle's `with` option to load related data in one query
**When to use:** loadState - fetch project with features, tasks, agents
**Example:**
```typescript
// Source: Context7 - Drizzle relational queries
const state = await db.query.projects.findFirst({
  where: eq(projects.id, projectId),
  with: {
    features: true,
    tasks: true,
    checkpoints: {
      orderBy: [desc(checkpoints.createdAt)],
      limit: 1
    }
  }
});
```

### Pattern 3: Float32Array BLOB for Embeddings
**What:** Store embeddings as BLOB, retrieve as Float32Array
**When to use:** Memory system episode storage
**Example:**
```typescript
// Source: DEV Community - Vector DB with SQLite
// Store
const embeddingBlob = Buffer.from(embedding.buffer);
await db.insert(episodes).values({ ...episode, embedding: embeddingBlob });

// Retrieve
const row = await db.query.episodes.findFirst({ where: eq(episodes.id, id) });
const embedding = new Float32Array(row.embedding.buffer);
```

### Pattern 4: Application-Layer Cosine Similarity
**What:** Compute similarity in TypeScript, not SQL
**When to use:** queryMemory with semantic search
**Example:**
```typescript
// Source: DEV Community - Building Vector Database
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Query: fetch all episodes, compute similarity, sort, return top-k
const episodes = await db.query.episodes.findMany({ where: eq(episodes.projectId, projectId) });
const queryEmbedding = await embeddingsService.generate(query);
const scored = episodes.map(ep => ({
  ...ep,
  similarity: cosineSimilarity(queryEmbedding, new Float32Array(ep.embedding.buffer))
}));
return scored.filter(s => s.similarity > 0.7).sort((a, b) => b.similarity - a.similarity).slice(0, limit);
```

### Anti-Patterns to Avoid
- **JSON.stringify for embeddings:** Use Buffer/BLOB for efficiency, not JSON arrays
- **Individual queries in loops:** Use transactions and batch operations
- **Storing embedding cache in DB:** Use in-memory Map with LRU eviction
- **Computing embeddings on every query:** Cache embeddings by content hash

</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Embedding generation | Custom neural network | OpenAI text-embedding-3-small | Quality, cost, maintenance |
| Database migrations | Manual ALTER TABLE | drizzle-kit generate/migrate | Type safety, rollback support |
| JSON serialization for state | Custom parser | JSON.stringify/parse | Battle-tested, handles edge cases |
| UUID generation | Math.random() IDs | uuid v4 | Collision-free, standard format |
| Markdown parsing for STATE.md | Regex everything | Simple section extraction | Full parser overkill for structured format |

**Key insight:** The persistence layer is plumbing. Use proven tools (Drizzle, OpenAI SDK) and focus implementation effort on the Nexus-specific logic (state shape, checkpoint triggers, memory relevance).

</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Foreign Keys Not Enforced
**What goes wrong:** Cascade deletes don't work, orphaned records
**Why it happens:** SQLite defaults foreign keys to OFF
**How to avoid:** Already handled in DatabaseClient: `this.sqlite.pragma('foreign_keys = ON')`
**Warning signs:** Delete parent succeeds but child records remain

### Pitfall 2: Node Version Mismatch with better-sqlite3
**What goes wrong:** "NODE_MODULE_VERSION mismatch" error
**Why it happens:** Native module compiled for different Node version than Electron's
**How to avoid:** Use electron-rebuild after npm install: `npx electron-rebuild -f -w better-sqlite3`
**Warning signs:** Module load errors on app startup

### Pitfall 3: Embedding Dimension Mismatch
**What goes wrong:** Cosine similarity returns NaN or wrong values
**Why it happens:** Comparing embeddings from different models or dimension settings
**How to avoid:** Store model name + dimensions with each embedding, validate on query
**Warning signs:** All similarity scores are 0 or NaN

### Pitfall 4: WAL Checkpoint on Close
**What goes wrong:** Database file larger than expected, potential corruption on crash
**Why it happens:** WAL file not checkpointed before closing
**How to avoid:** Already handled in DatabaseClient: `this.sqlite.pragma('wal_checkpoint(TRUNCATE)')`
**Warning signs:** Large .db-wal file after closing

### Pitfall 5: Embedding API Rate Limits
**What goes wrong:** 429 errors during batch operations
**Why it happens:** OpenAI rate limits on embeddings endpoint
**How to avoid:** Implement retry with exponential backoff, batch requests (max 2048 inputs), cache results
**Warning signs:** Intermittent failures during bulk memory operations

### Pitfall 6: STATE.md Import Loses Data
**What goes wrong:** Roundtrip export→import loses information
**Why it happens:** Export format doesn't capture all state fields
**How to avoid:** Test roundtrip equality in unit tests, ensure all NexusState fields have markdown representation
**Warning signs:** State differs after export/import cycle

</common_pitfalls>

<code_examples>
## Code Examples

### OpenAI Embeddings with Caching
```typescript
// Source: Context7 - OpenAI Node SDK
import OpenAI from 'openai';
import { createHash } from 'crypto';

export class EmbeddingsService {
  private client: OpenAI;
  private cache = new Map<string, number[]>();

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const hash = createHash('md5').update(text).digest('hex');
    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }

    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;
    this.cache.set(hash, embedding);
    return embedding;
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
      encoding_format: 'float',
    });

    return response.data.map(d => d.embedding);
  }
}
```

### Drizzle State Hydration
```typescript
// Source: Context7 - Drizzle relational queries
async loadState(projectId: string): Promise<NexusState | null> {
  const result = await this.db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      features: {
        with: { subFeatures: true }
      },
      tasks: true,
      checkpoints: {
        orderBy: [desc(checkpoints.createdAt)],
        limit: 1
      }
    }
  });

  if (!result) return null;

  return {
    projectId: result.id,
    project: result,
    features: result.features,
    tasks: result.tasks,
    agents: [], // Loaded separately from agents table
    status: result.status as NexusState['status'],
    lastCheckpointId: result.checkpoints[0]?.id
  };
}
```

### Checkpoint with Git State
```typescript
// Source: Better-sqlite3 docs + custom pattern
async createCheckpoint(projectId: string, reason: string): Promise<Checkpoint> {
  const state = await this.stateManager.loadState(projectId);
  if (!state) throw new CheckpointNotFoundError(projectId);

  // Capture git state
  const gitStatus = await this.gitService.status();

  const checkpoint: NewCheckpoint = {
    id: `chk-${Date.now()}`,
    projectId,
    name: reason,
    reason,
    state: JSON.stringify(state),
    gitCommit: gitStatus.currentCommit,
    createdAt: new Date(),
  };

  await this.db.insert(checkpoints).values(checkpoint);

  // Emit event for dashboard notification
  this.eventBus?.emit('CHECKPOINT_CREATED', { checkpoint });

  return checkpoint;
}
```

### STATE.md Format
```typescript
// Source: Custom pattern for human-readable state
exportToSTATE_MD(state: NexusState): string {
  const progress = Math.round((state.tasksCompleted / state.totalTasks) * 100) || 0;
  const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

  return `# Project State: ${state.project.name}

## Status
- **Phase:** ${state.currentPhase || 'N/A'}
- **Status:** ${state.status}
- **Progress:** ${progressBar} ${progress}%

## Current Work
- Active task: ${state.activeTasks?.[0]?.name || 'None'}
- Assigned agent: ${state.activeAgents?.[0]?.id || 'None'}

## Features
| Feature | Status | Progress |
|---------|--------|----------|
${state.features.map(f => `| ${f.name} | ${f.status} | ${Math.round((f.completedTasks / f.estimatedTasks) * 100) || 0}% |`).join('\n')}

## Recent Tasks
${state.tasks.slice(0, 5).map(t => `- [${t.status === 'completed' ? 'x' : ' '}] ${t.name}${t.status === 'in_progress' ? ' (in progress)' : ''}`).join('\n')}

## Checkpoints
- Latest: \`${state.lastCheckpointId || 'None'}\`

---
*Last updated: ${new Date().toISOString()}*
`;
}
```

</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| text-embedding-ada-002 | text-embedding-3-small | Jan 2024 | 5x cheaper, better quality, flexible dimensions |
| sqlite-vss (Faiss) | sqlite-vec (pure C) | 2024 | Simpler, no Faiss dependency, cross-platform |
| Manual migrations | drizzle-kit push/generate | 2024+ | Type-safe, automatic diff detection |
| Knex.js/Sequelize | Drizzle ORM | 2024+ | Better TypeScript, lighter weight |

**New tools/patterns to consider:**
- **Matryoshka embeddings:** text-embedding-3-small supports reducing dimensions (e.g., 512 instead of 1536) for faster similarity search with minimal quality loss
- **OpenAI Batch API:** For bulk embedding operations, 50% cost reduction vs realtime

**Deprecated/outdated:**
- **text-embedding-ada-002:** Still works but no reason to use over 3-small
- **sqlite-vss:** Faiss dependency problematic in Electron; sqlite-vec or app-layer preferred

</sota_updates>

<open_questions>
## Open Questions

1. **Embedding dimension reduction**
   - What we know: text-embedding-3-small supports Matryoshka (512, 256 dimensions)
   - What's unclear: Performance impact of 512 vs 1536 for episode memory specifically
   - Recommendation: Start with 1536 (default), add dimension option later if storage/speed is issue

2. **Auto-checkpoint frequency**
   - What we know: Master Book specifies triggers (phase_complete, task_failed, qa_exhausted, human_request)
   - What's unclear: Optimal interval for periodic auto-checkpoints
   - Recommendation: Start with trigger-based only, add time-based (every 30 min) in polish phase if needed

3. **Memory pruning strategy**
   - What we know: pruneOldEpisodes(maxAge) interface defined
   - What's unclear: Optimal maxAge, whether to also limit by count
   - Recommendation: Default 90 days, add count limit (10k episodes) as secondary constraint

</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [/llmstxt/orm_drizzle_team_llms_txt](https://orm.drizzle.team) - SQLite setup, transactions, relational queries
- [/wiselibs/better-sqlite3](https://github.com/wiselibs/better-sqlite3) - WAL mode, performance, Electron usage
- [/openai/openai-node](https://github.com/openai/openai-node) - Embeddings API, batch operations

### Secondary (MEDIUM confidence)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) - text-embedding-3-small vs ada-002
- [DEV Community - Vector DB with SQLite](https://dev.to/sfundomhlungu/how-to-build-a-vector-database-with-sqlite-in-nodejs-1epd) - Cosine similarity pattern
- [sqlite-vec docs](https://alexgarcia.xyz/sqlite-vec/js.html) - Extension usage (decided against for Electron)

### Tertiary (Context from codebase)
- `src/persistence/database/DatabaseClient.ts` - Phase 1 established patterns
- `src/persistence/database/schema.ts` - Existing table structure

</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Drizzle ORM + better-sqlite3 (already established)
- Ecosystem: OpenAI embeddings, vector search patterns
- Patterns: Transaction management, state hydration, embedding storage
- Pitfalls: Foreign keys, native modules, rate limits, dimension mismatch

**Confidence breakdown:**
- Standard stack: HIGH - Phase 1 already validated, minimal additions
- Architecture: HIGH - Patterns from Context7 + official docs
- Pitfalls: HIGH - Documented in GitHub issues, verified in docs
- Code examples: HIGH - From Context7/official sources + codebase patterns

**Research date:** 2026-01-14
**Valid until:** 2026-02-14 (30 days - stack is stable)

</metadata>

---

*Phase: 02-persistence*
*Research completed: 2026-01-14*
*Ready for planning: yes*
