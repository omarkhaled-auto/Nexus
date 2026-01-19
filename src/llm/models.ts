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
// MODEL PRICING (per million tokens)
// =============================================================================

export interface ModelPricingInfo {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const MODEL_PRICING_INFO: Record<string, ModelPricingInfo> = {
  // Claude 4.5 Family
  'claude-opus-4-5-20251101': {
    inputPerMillion: 5.0,
    outputPerMillion: 25.0,
  },
  'claude-sonnet-4-5-20250929': {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
  'claude-haiku-4-5-20251001': {
    inputPerMillion: 1.0,
    outputPerMillion: 5.0,
  },
  // Claude 4.x Family
  'claude-opus-4-1-20250805': {
    inputPerMillion: 15.0,
    outputPerMillion: 75.0,
  },
  'claude-sonnet-4-20250514': {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
  // Gemini models (approximate)
  'gemini-3-pro': {
    inputPerMillion: 1.25,
    outputPerMillion: 5.0,
  },
  'gemini-3-flash': {
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
  },
  'gemini-2.5-pro': {
    inputPerMillion: 1.25,
    outputPerMillion: 5.0,
  },
  'gemini-2.5-flash': {
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
  },
  'gemini-2.5-flash-lite': {
    inputPerMillion: 0.0375,
    outputPerMillion: 0.15,
  },
} as const;

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
