# Nexus Configuration Options

> Phase 17 Research Task R4: Extract Configuration Options
> Generated: Phase 17 UI Redesign

This document provides a comprehensive inventory of all configurable options in Nexus,
including their types, default values, validation constraints, and UI requirements.

---

## Table of Contents

1. [Configuration Sources](#configuration-sources)
2. [LLM Configuration](#llm-configuration)
   - [Claude Provider](#claude-provider)
   - [Gemini Provider](#gemini-provider)
   - [Embeddings Provider](#embeddings-provider)
   - [Orchestration Settings](#orchestration-settings)
3. [Agent Configuration](#agent-configuration)
4. [Checkpoint Configuration](#checkpoint-configuration)
5. [UI Settings](#ui-settings)
6. [Project Settings](#project-settings)
7. [QA Configuration](#qa-configuration)
8. [Iteration Configuration](#iteration-configuration)
9. [Model Constants](#model-constants)
   - [Claude Models](#claude-models)
   - [Gemini Models](#gemini-models)
   - [OpenAI Embedding Models](#openai-embedding-models)
   - [Local Embedding Models](#local-embedding-models)
10. [Agent Role Model Assignments](#agent-role-model-assignments)
11. [Configuration Priority](#configuration-priority)
12. [UI Requirements Summary](#ui-requirements-summary)

---

## Configuration Sources

Nexus supports multiple configuration sources with the following priority (highest to lowest):

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | Config File | `nexus.config.ts/js/json` in project root |
| 2 | Settings UI | Electron app preferences (electron-store) |
| 3 | Environment Variables | `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `OPENAI_API_KEY` |
| 4 | Default Values | Hardcoded defaults in source |

### Supported Config File Formats

- `nexus.config.ts` - TypeScript (recommended)
- `nexus.config.js` - JavaScript
- `nexus.config.json` - JSON
- `.nexusrc` - JSON
- `.nexusrc.json` - JSON

---

## LLM Configuration

### Claude Provider

**Interface:** `ClaudeProviderSettings`
**Settings Path:** `llm.claude`

| Option | Type | Default | Validation | Description |
|--------|------|---------|------------|-------------|
| `backend` | `'cli' \| 'api'` | `'cli'` | enum | Backend to use: CLI (default) or API |
| `apiKeyEncrypted` | `string?` | - | - | Encrypted API key (internal, use setApiKey) |
| `cliPath` | `string?` | `'claude'` | - | Path to Claude CLI binary |
| `timeout` | `number?` | `300000` | 1000-600000 | Request timeout in ms (5 minutes default) |
| `maxRetries` | `number?` | `2` | 0-10 | Maximum retry attempts |
| `model` | `string?` | `'claude-sonnet-4-5-20250929'` | Valid model ID | Model to use |

**UI Requirements:**
- [ ] Backend toggle: CLI / API radio buttons
- [ ] CLI status indicator (detected/not found)
- [ ] Model dropdown with all Claude models
- [ ] Model description shown below dropdown
- [ ] API key input (masked, only for API mode)
- [ ] Collapsible "Advanced" section for timeout/retries
- [ ] CLI path input (optional, in Advanced)

### Gemini Provider

**Interface:** `GeminiProviderSettings`
**Settings Path:** `llm.gemini`

| Option | Type | Default | Validation | Description |
|--------|------|---------|------------|-------------|
| `backend` | `'cli' \| 'api'` | `'cli'` | enum | Backend to use: CLI (default) or API |
| `apiKeyEncrypted` | `string?` | - | - | Encrypted API key |
| `cliPath` | `string?` | `'gemini'` | - | Path to Gemini CLI binary |
| `timeout` | `number?` | `300000` | 1000-600000 | Request timeout in ms |
| `model` | `string?` | `'gemini-2.5-flash'` | Valid model ID | Model to use |

**UI Requirements:**
- [ ] Backend toggle: CLI / API radio buttons
- [ ] CLI status indicator (detected/not found)
- [ ] Model dropdown with all Gemini models
- [ ] Model description shown below dropdown
- [ ] API key input (masked, only for API mode)
- [ ] Timeout input in Advanced section

### Embeddings Provider

**Interface:** `EmbeddingsProviderSettings`
**Settings Path:** `llm.embeddings`

| Option | Type | Default | Validation | Description |
|--------|------|---------|------------|-------------|
| `backend` | `'local' \| 'api'` | `'local'` | enum | Backend: local transformers.js or OpenAI API |
| `apiKeyEncrypted` | `string?` | - | - | OpenAI API key (encrypted) |
| `localModel` | `string?` | `'Xenova/all-MiniLM-L6-v2'` | Valid model ID | Local model to use |
| `dimensions` | `number?` | `384` | minimum: 1 | Embedding vector dimensions |
| `cacheEnabled` | `boolean?` | `true` | - | Enable embedding cache |
| `maxCacheSize` | `number?` | `10000` | minimum: 100 | Maximum cached embeddings |

**UI Requirements:**
- [ ] Backend toggle: Local / OpenAI API radio buttons
- [ ] "No API key needed" indicator for local mode
- [ ] Local model dropdown (when backend='local')
- [ ] OpenAI API key input (when backend='api')
- [ ] Dimensions display (auto-filled from model)
- [ ] Cache toggle and size input

### Orchestration Settings

**Settings Path:** `llm`

| Option | Type | Default | Validation | Description |
|--------|------|---------|------------|-------------|
| `defaultProvider` | `'claude' \| 'gemini'` | `'claude'` | enum | Default provider for orchestration |
| `defaultModel` | `string` | `'claude-sonnet-4-5-20250929'` | - | Default model (provider-specific) |
| `fallbackEnabled` | `boolean` | `true` | - | Enable automatic fallback on failure |
| `fallbackOrder` | `string[]` | `['claude', 'gemini']` | - | Provider fallback order |

**UI Requirements:**
- [ ] Default provider radio buttons
- [ ] Fallback toggle
- [ ] Fallback order drag-and-drop list

---

## Agent Configuration

**Interface:** `AgentSettings`
**Settings Path:** `agents`

| Option | Type | Default | Validation | Description |
|--------|------|---------|------------|-------------|
| `maxParallelAgents` | `number` | `4` | 1-10 | Maximum concurrent agents |
| `taskTimeoutMinutes` | `number` | `30` | 1-120 | Task timeout in minutes |
| `maxRetries` | `number` | `3` | 0-10 | Maximum task retry attempts |
| `autoRetryEnabled` | `boolean` | `true` | - | Enable automatic task retry |

**Config File Additional Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAgentsByType.coder` | `number` | `3` | Max concurrent coder agents |
| `maxAgentsByType.tester` | `number` | `2` | Max concurrent tester agents |
| `maxAgentsByType.reviewer` | `number` | `2` | Max concurrent reviewer agents |
| `maxAgentsByType.merger` | `number` | `1` | Max concurrent merger agents |
| `maxAgentsByType.architect` | `number` | `1` | Max concurrent architect agents |
| `maxAgentsByType.debugger` | `number` | `2` | Max concurrent debugger agents |
| `maxAgentsByType.documenter` | `number` | `1` | Max concurrent documenter agents |

**UI Requirements:**
- [ ] Agent model assignment table (5 agent types)
- [ ] Per-agent provider dropdown
- [ ] Per-agent model dropdown (filtered by provider)
- [ ] "Use Recommended Defaults" button
- [ ] Pool limits section with numeric inputs
- [ ] Auto-retry toggle

---

## Checkpoint Configuration

**Interface:** `CheckpointSettings`
**Settings Path:** `checkpoints`

| Option | Type | Default | Validation | Description |
|--------|------|---------|------------|-------------|
| `autoCheckpointEnabled` | `boolean` | `true` | - | Enable automatic checkpoints |
| `autoCheckpointIntervalMinutes` | `number` | `5` | 5-60 | Auto-save interval in minutes |
| `maxCheckpointsToKeep` | `number` | `10` | 1-50 | Maximum checkpoints to retain |
| `checkpointOnFeatureComplete` | `boolean` | `true` | - | Create checkpoint on feature completion |

**UI Requirements:**
- [ ] Auto-checkpoint master toggle
- [ ] Interval slider or numeric input (5-60 min)
- [ ] Max checkpoints numeric input
- [ ] Feature completion checkpoint toggle
- [ ] List of recent checkpoints with restore action

---

## UI Settings

**Interface:** `UISettings`
**Settings Path:** `ui`

| Option | Type | Default | Validation | Description |
|--------|------|---------|------------|-------------|
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | enum | Application theme |
| `sidebarWidth` | `number` | `280` | 200-500 | Sidebar width in pixels |
| `showNotifications` | `boolean` | `true` | - | Show desktop notifications |
| `notificationDuration` | `number` | `5000` | 1000-30000 | Notification display duration in ms |

**UI Requirements:**
- [ ] Theme selector (Light / Dark / System)
- [ ] System theme detection indicator
- [ ] Notifications toggle
- [ ] Notification duration slider
- [ ] Sidebar width slider (visual preview)

---

## Project Settings

**Interface:** `ProjectSettings`
**Settings Path:** `project`

| Option | Type | Default | Validation | Description |
|--------|------|---------|------------|-------------|
| `defaultLanguage` | `string` | `'typescript'` | - | Default programming language |
| `defaultTestFramework` | `string` | `'vitest'` | - | Default test framework |
| `outputDirectory` | `string` | `'.nexus'` | - | Nexus output directory |

**Config File Additional Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `project.name` | `string?` | - | Project name for logs/checkpoints |
| `project.description` | `string?` | - | Project description |
| `project.workingDir` | `string?` | - | Custom working directory |

**UI Requirements:**
- [ ] Default language dropdown (TypeScript, JavaScript, Python, etc.)
- [ ] Default test framework dropdown
- [ ] Output directory input with folder picker

---

## QA Configuration

**Config File Only - Interface:** `QAConfigFile`
**Config Path:** `qa`

| Option | Type | Default | Validation | Description |
|--------|------|---------|------------|-------------|
| `buildTimeout` | `number?` | `60000` | positive | Build timeout in ms (1 minute) |
| `lintTimeout` | `number?` | `120000` | positive | Lint timeout in ms (2 minutes) |
| `testTimeout` | `number?` | `300000` | positive | Test timeout in ms (5 minutes) |
| `autoFixLint` | `boolean?` | `false` | - | Auto-fix lint issues when possible |

**UI Requirements:**
- [ ] QA timeout configuration (Advanced section)
- [ ] Auto-fix lint toggle
- [ ] Per-timeout inputs (Build, Lint, Test)

---

## Iteration Configuration

**Config File Only - Interface:** `IterationConfigFile`
**Config Path:** `iteration`

| Option | Type | Default | Validation | Description |
|--------|------|---------|------------|-------------|
| `maxIterations` | `number?` | `50` | positive | Maximum iterations before escalation |
| `commitEachIteration` | `boolean?` | `true` | - | Commit after each iteration |

**UI Requirements:**
- [ ] Max iterations slider (10-200 range)
- [ ] Commit per iteration toggle
- [ ] Escalation threshold indicator

---

## Model Constants

### Claude Models

**Source:** `src/llm/models.ts`
**Constant:** `CLAUDE_MODELS`

| Model ID | Display Name | Context Window | Description |
|----------|-------------|----------------|-------------|
| `claude-opus-4-5-20251101` | Claude Opus 4.5 | 200,000 | Most intelligent - Best for complex coding, agents, and sophisticated tasks |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 | 200,000 | **DEFAULT** - Best balance of speed and intelligence |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 | 200,000 | Fast and lightweight - Best for simple tasks and high volume |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 | 200,000 | Previous Opus - Strong coding and agentic capabilities |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 | 200,000 | Previous Sonnet - Good all-around performance |

**Default:** `claude-sonnet-4-5-20250929`

**Helper Functions:**
- `getClaudeModel(modelId)` - Get model info by ID
- `getClaudeModelList()` - Get all models as array (for dropdowns)
- `isValidClaudeModel(modelId)` - Validate model ID

### Gemini Models

**Constant:** `GEMINI_MODELS`

| Model ID | Display Name | Context Window | Description |
|----------|-------------|----------------|-------------|
| `gemini-3-pro` | Gemini 3 Pro | 1,000,000 | Most powerful reasoning model - Best for complex analysis |
| `gemini-3-flash` | Gemini 3 Flash | 1,000,000 | Fast with PhD-level reasoning - New default in Gemini app |
| `gemini-2.5-pro` | Gemini 2.5 Pro | 1,000,000 | Advanced reasoning with thinking - Stable release |
| `gemini-2.5-flash` | Gemini 2.5 Flash | 1,000,000 | **DEFAULT** - Fast and capable - Best balance for production use |
| `gemini-2.5-flash-lite` | Gemini 2.5 Flash-Lite | 1,000,000 | Cost-optimized - Best for high-volume tasks |

**Default:** `gemini-2.5-flash`

**Helper Functions:**
- `getGeminiModel(modelId)` - Get model info by ID
- `getGeminiModelList()` - Get all models as array (for dropdowns)
- `isValidGeminiModel(modelId)` - Validate model ID

### OpenAI Embedding Models

**Constant:** `OPENAI_EMBEDDING_MODELS`

| Model ID | Display Name | Dimensions | Description |
|----------|-------------|------------|-------------|
| `text-embedding-3-small` | Text Embedding 3 Small | 1536 | **DEFAULT** - Good balance of quality and cost |
| `text-embedding-3-large` | Text Embedding 3 Large | 3072 | Highest quality embeddings |
| `text-embedding-ada-002` | Ada 002 (Legacy) | 1536 | Previous generation - Legacy support |

**Default:** `text-embedding-3-small`

### Local Embedding Models

**Constant:** `LOCAL_EMBEDDING_MODELS`

| Model ID | Display Name | Dimensions | Description |
|----------|-------------|------------|-------------|
| `Xenova/all-MiniLM-L6-v2` | MiniLM L6 v2 | 384 | **DEFAULT** - Fast, lightweight - Best for most use cases |
| `Xenova/all-mpnet-base-v2` | MPNet Base v2 | 768 | Higher quality - Larger model |
| `Xenova/bge-small-en-v1.5` | BGE Small English | 384 | Optimized for retrieval tasks |
| `Xenova/bge-base-en-v1.5` | BGE Base English | 768 | Higher quality BGE model |

**Default:** `Xenova/all-MiniLM-L6-v2`

**Helper Functions:**
- `getLocalEmbeddingModel(modelId)` - Get model info by ID
- `getLocalEmbeddingModelList()` - Get all models as array (for dropdowns)
- `getEmbeddingDimensions(modelId, backend)` - Get dimensions for model

---

## Agent Role Model Assignments

**Constant:** `NEXUS_AGENT_MODELS`
**Source:** `src/llm/models.ts`

Recommended models for each Nexus agent role (can be overridden by user settings):

| Agent Role | Claude Model | Gemini Model | Rationale |
|------------|--------------|--------------|-----------|
| **Planner** | `claude-opus-4-5-20251101` | `gemini-2.5-pro` | Needs strong reasoning |
| **Coder** | `claude-sonnet-4-5-20250929` | `gemini-2.5-flash` | Fast, accurate coding |
| **Tester** | `claude-sonnet-4-5-20250929` | `gemini-2.5-flash` | Good balance |
| **Reviewer** | `claude-sonnet-4-5-20250929` | `gemini-2.5-pro` | Thorough analysis |
| **Merger** | `claude-sonnet-4-5-20250929` | `gemini-2.5-flash` | Reliable, fast |

**Default Model Configs by Agent Type:**

```typescript
// From src/llm/types.ts
DEFAULT_MODEL_CONFIGS = {
  planner:  { model: 'claude-sonnet-4-5-20250929', provider: 'claude' },
  coder:    { model: 'claude-sonnet-4-5-20250929', provider: 'claude' },
  tester:   { model: 'claude-sonnet-4-5-20250929', provider: 'claude' },
  reviewer: { model: 'gemini-2.5-flash', provider: 'gemini' },
  merger:   { model: 'claude-sonnet-4-5-20250929', provider: 'claude' },
}
```

---

## Configuration Priority

```
╔═══════════════════════════════════════════════════════════════════════╗
║                    CONFIGURATION PRIORITY                              ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  1. Config File (highest priority)                                     ║
║     └── nexus.config.ts/js/json in project root                       ║
║                                                                        ║
║  2. Settings UI                                                        ║
║     └── Electron app preferences (electron-store)                     ║
║                                                                        ║
║  3. Environment Variables                                              ║
║     ├── ANTHROPIC_API_KEY (Claude API)                                ║
║     ├── GOOGLE_AI_API_KEY (Gemini API)                                ║
║     └── OPENAI_API_KEY (OpenAI Embeddings)                            ║
║                                                                        ║
║  4. Default Values (lowest priority)                                   ║
║     └── Hardcoded in source code                                      ║
║                                                                        ║
╚═══════════════════════════════════════════════════════════════════════╝
```

**Security Note:** API keys should NEVER be stored in config files. Use environment variables or the Settings UI (which uses OS-level encryption via safeStorage).

---

## UI Requirements Summary

### Settings Page Tabs

1. **LLM Providers Tab**
   - Claude configuration section
   - Gemini configuration section
   - Embeddings configuration section
   - Backend toggles with CLI detection indicators
   - Model dropdowns with descriptions
   - API key inputs (masked)
   - Advanced options (collapsible)

2. **Agents Tab**
   - Agent model assignment table (5 rows)
   - Provider dropdown per agent
   - Model dropdown per agent (filtered by provider)
   - "Use Recommended Defaults" button
   - Pool limits section
   - Auto-retry settings

3. **Checkpoints Tab**
   - Auto-checkpoint toggle
   - Interval configuration
   - Max checkpoints to keep
   - Checkpoint history list
   - Restore action per checkpoint

4. **UI Preferences Tab**
   - Theme selector (Light/Dark/System)
   - Notifications toggle
   - Notification duration
   - Sidebar width

5. **Projects Tab**
   - Default language
   - Default test framework
   - Output directory

### Common UI Patterns

- All settings should have "Reset to Defaults" option
- Changes should be tracked with dirty state
- Save/Discard buttons for pending changes
- Success/error toasts on save
- Form validation with error messages
- Loading states during save operations

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Renderer (UI)                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  settingsStore (Zustand)                                         │   │
│  │  ├── settings: NexusSettingsPublic                              │   │
│  │  ├── pendingChanges: PendingChanges                             │   │
│  │  ├── isDirty: boolean                                           │   │
│  │  └── actions: loadSettings, updateSetting, saveSettings, etc.   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                            ▲ │                                          │
│                            │ │ IPC                                      │
└────────────────────────────┼─┼──────────────────────────────────────────┘
                             │ ▼
┌────────────────────────────┴─┬──────────────────────────────────────────┐
│  Main Process                ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  settingsService (Singleton)                                     │   │
│  │  ├── store: electron-store (JSON with schema)                   │   │
│  │  ├── safeStorage: OS-level encryption for API keys              │   │
│  │  └── methods: getAll, get, set, setApiKey, hasApiKey, reset     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Methods (IPC)

| Method | Description |
|--------|-------------|
| `settings.getAll()` | Get all settings (public view, no encrypted keys) |
| `settings.get(key)` | Get single setting by dot-notation path |
| `settings.set(key, value)` | Set single setting |
| `settings.setApiKey(provider, key)` | Securely store API key |
| `settings.hasApiKey(provider)` | Check if API key is set |
| `settings.clearApiKey(provider)` | Remove API key |
| `settings.reset()` | Reset all settings to defaults |

---

## Summary

Nexus has a comprehensive configuration system with:

- **5 main settings categories**: LLM, Agents, Checkpoints, UI, Project
- **3 LLM providers**: Claude, Gemini, Embeddings (each with backend selection)
- **5 Claude models** and **5 Gemini models** available
- **4 local embedding models** and **3 OpenAI embedding models**
- **5 agent roles** with configurable model assignments
- **Multiple configuration sources** with clear priority order
- **Secure API key storage** via OS-level encryption

The Settings UI must expose ALL of these options with:
- Proper validation
- Clear descriptions
- Backend detection indicators
- Model dropdowns with context
- Secure API key handling
- Reset to defaults functionality
