/**
 * LLM Models Configuration Tests
 * Phase 16 Finalization: Centralized model configuration
 */

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
  isValidEmbeddingModel,
  getEmbeddingDimensions,
  getClaudeModelList,
  getGeminiModelList,
  getOpenAIEmbeddingModelList,
  getLocalEmbeddingModelList,
  NEXUS_AGENT_MODELS,
  MODEL_PRICING_INFO,
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

    it('should have Claude 4.x family for backwards compatibility', () => {
      expect(CLAUDE_MODELS['claude-opus-4-1-20250805']).toBeDefined();
      expect(CLAUDE_MODELS['claude-sonnet-4-20250514']).toBeDefined();
    });

    it('should validate model IDs correctly', () => {
      expect(isValidClaudeModel('claude-sonnet-4-5-20250929')).toBe(true);
      expect(isValidClaudeModel('claude-opus-4-5-20251101')).toBe(true);
      expect(isValidClaudeModel('invalid-model')).toBe(false);
      expect(isValidClaudeModel('')).toBe(false);
    });

    it('should get model info by ID', () => {
      const model = getClaudeModel('claude-opus-4-5-20251101');
      expect(model).toBeDefined();
      expect(model?.name).toBe('Claude Opus 4.5');
      expect(model?.contextWindow).toBe(200000);
    });

    it('should return undefined for unknown models', () => {
      expect(getClaudeModel('invalid-model')).toBeUndefined();
    });

    it('should return model list for UI', () => {
      const list = getClaudeModelList();
      expect(list.length).toBeGreaterThan(0);
      expect(list.some(m => m.id === DEFAULT_CLAUDE_MODEL)).toBe(true);
      // All should have required fields
      list.forEach(model => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.contextWindow).toBeGreaterThan(0);
      });
    });

    it('should mark default model correctly', () => {
      const defaultModel = CLAUDE_MODELS[DEFAULT_CLAUDE_MODEL];
      expect(defaultModel.isDefault).toBe(true);
    });
  });

  describe('Gemini Models', () => {
    it('should have default model defined', () => {
      expect(DEFAULT_GEMINI_MODEL).toBe('gemini-2.5-flash');
      expect(GEMINI_MODELS[DEFAULT_GEMINI_MODEL]).toBeDefined();
    });

    it('should have all required Gemini 3.x models', () => {
      expect(GEMINI_MODELS['gemini-3-pro']).toBeDefined();
      expect(GEMINI_MODELS['gemini-3-flash']).toBeDefined();
    });

    it('should have all required Gemini 2.5 models', () => {
      expect(GEMINI_MODELS['gemini-2.5-pro']).toBeDefined();
      expect(GEMINI_MODELS['gemini-2.5-flash']).toBeDefined();
      expect(GEMINI_MODELS['gemini-2.5-flash-lite']).toBeDefined();
    });

    it('should validate model IDs correctly', () => {
      expect(isValidGeminiModel('gemini-2.5-flash')).toBe(true);
      expect(isValidGeminiModel('gemini-3-pro')).toBe(true);
      expect(isValidGeminiModel('gemini-1.0-fake')).toBe(false);
      expect(isValidGeminiModel('')).toBe(false);
    });

    it('should get model info by ID', () => {
      const model = getGeminiModel('gemini-3-pro');
      expect(model).toBeDefined();
      expect(model?.name).toBe('Gemini 3 Pro');
      expect(model?.contextWindow).toBe(1000000);
    });

    it('should return model list for UI', () => {
      const list = getGeminiModelList();
      expect(list.length).toBeGreaterThan(0);
      expect(list.some(m => m.id === DEFAULT_GEMINI_MODEL)).toBe(true);
    });

    it('should mark default model correctly', () => {
      const defaultModel = GEMINI_MODELS[DEFAULT_GEMINI_MODEL];
      expect(defaultModel.isDefault).toBe(true);
    });
  });

  describe('OpenAI Embedding Models', () => {
    it('should have default embedding model', () => {
      expect(DEFAULT_OPENAI_EMBEDDING_MODEL).toBe('text-embedding-3-small');
      expect(OPENAI_EMBEDDING_MODELS[DEFAULT_OPENAI_EMBEDDING_MODEL]).toBeDefined();
    });

    it('should have all required embedding models', () => {
      expect(OPENAI_EMBEDDING_MODELS['text-embedding-3-small']).toBeDefined();
      expect(OPENAI_EMBEDDING_MODELS['text-embedding-3-large']).toBeDefined();
      expect(OPENAI_EMBEDDING_MODELS['text-embedding-ada-002']).toBeDefined();
    });

    it('should have correct dimensions', () => {
      expect(OPENAI_EMBEDDING_MODELS['text-embedding-3-small'].dimensions).toBe(1536);
      expect(OPENAI_EMBEDDING_MODELS['text-embedding-3-large'].dimensions).toBe(3072);
    });

    it('should validate embedding models correctly', () => {
      expect(isValidEmbeddingModel('text-embedding-3-small', 'api')).toBe(true);
      expect(isValidEmbeddingModel('invalid-model', 'api')).toBe(false);
    });

    it('should return embedding model list', () => {
      const list = getOpenAIEmbeddingModelList();
      expect(list.length).toBe(3);
    });
  });

  describe('Local Embedding Models', () => {
    it('should have default local embedding model', () => {
      expect(DEFAULT_LOCAL_EMBEDDING_MODEL).toBe('Xenova/all-MiniLM-L6-v2');
      expect(LOCAL_EMBEDDING_MODELS[DEFAULT_LOCAL_EMBEDDING_MODEL]).toBeDefined();
    });

    it('should have all required local models', () => {
      expect(LOCAL_EMBEDDING_MODELS['Xenova/all-MiniLM-L6-v2']).toBeDefined();
      expect(LOCAL_EMBEDDING_MODELS['Xenova/all-mpnet-base-v2']).toBeDefined();
      expect(LOCAL_EMBEDDING_MODELS['Xenova/bge-small-en-v1.5']).toBeDefined();
      expect(LOCAL_EMBEDDING_MODELS['Xenova/bge-base-en-v1.5']).toBeDefined();
    });

    it('should have correct dimensions', () => {
      expect(LOCAL_EMBEDDING_MODELS['Xenova/all-MiniLM-L6-v2'].dimensions).toBe(384);
      expect(LOCAL_EMBEDDING_MODELS['Xenova/all-mpnet-base-v2'].dimensions).toBe(768);
    });

    it('should validate local embedding models correctly', () => {
      expect(isValidEmbeddingModel('Xenova/all-MiniLM-L6-v2', 'local')).toBe(true);
      expect(isValidEmbeddingModel('invalid-model', 'local')).toBe(false);
    });

    it('should return local embedding model list', () => {
      const list = getLocalEmbeddingModelList();
      expect(list.length).toBe(4);
    });
  });

  describe('getEmbeddingDimensions', () => {
    it('should return correct dimensions for local models', () => {
      expect(getEmbeddingDimensions('Xenova/all-MiniLM-L6-v2', 'local')).toBe(384);
      expect(getEmbeddingDimensions('Xenova/all-mpnet-base-v2', 'local')).toBe(768);
    });

    it('should return correct dimensions for API models', () => {
      expect(getEmbeddingDimensions('text-embedding-3-small', 'api')).toBe(1536);
      expect(getEmbeddingDimensions('text-embedding-3-large', 'api')).toBe(3072);
    });

    it('should return default dimensions for unknown models', () => {
      expect(getEmbeddingDimensions('unknown-model', 'local')).toBe(384);
      expect(getEmbeddingDimensions('unknown-model', 'api')).toBe(1536);
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

    it('should reference valid Claude models', () => {
      expect(isValidClaudeModel(NEXUS_AGENT_MODELS.planner.claude)).toBe(true);
      expect(isValidClaudeModel(NEXUS_AGENT_MODELS.coder.claude)).toBe(true);
      expect(isValidClaudeModel(NEXUS_AGENT_MODELS.tester.claude)).toBe(true);
      expect(isValidClaudeModel(NEXUS_AGENT_MODELS.reviewer.claude)).toBe(true);
      expect(isValidClaudeModel(NEXUS_AGENT_MODELS.merger.claude)).toBe(true);
    });

    it('should reference valid Gemini models', () => {
      expect(isValidGeminiModel(NEXUS_AGENT_MODELS.planner.gemini)).toBe(true);
      expect(isValidGeminiModel(NEXUS_AGENT_MODELS.coder.gemini)).toBe(true);
      expect(isValidGeminiModel(NEXUS_AGENT_MODELS.tester.gemini)).toBe(true);
      expect(isValidGeminiModel(NEXUS_AGENT_MODELS.reviewer.gemini)).toBe(true);
      expect(isValidGeminiModel(NEXUS_AGENT_MODELS.merger.gemini)).toBe(true);
    });

    it('should use appropriate models for each role', () => {
      // Planner needs best reasoning
      expect(NEXUS_AGENT_MODELS.planner.claude).toBe('claude-opus-4-5-20251101');
      expect(NEXUS_AGENT_MODELS.planner.gemini).toBe('gemini-2.5-pro');

      // Coder needs fast, good coding
      expect(NEXUS_AGENT_MODELS.coder.claude).toBe('claude-sonnet-4-5-20250929');
      expect(NEXUS_AGENT_MODELS.coder.gemini).toBe('gemini-2.5-flash');
    });
  });

  describe('Model Pricing', () => {
    it('should have pricing for all default models', () => {
      expect(MODEL_PRICING_INFO[DEFAULT_CLAUDE_MODEL]).toBeDefined();
      expect(MODEL_PRICING_INFO[DEFAULT_GEMINI_MODEL]).toBeDefined();
    });

    it('should have valid pricing structure', () => {
      const claudePricing = MODEL_PRICING_INFO[DEFAULT_CLAUDE_MODEL];
      expect(claudePricing.inputPerMillion).toBeGreaterThan(0);
      expect(claudePricing.outputPerMillion).toBeGreaterThan(0);
    });

    it('should have pricing for Claude 4.5 family', () => {
      expect(MODEL_PRICING_INFO['claude-opus-4-5-20251101']).toBeDefined();
      expect(MODEL_PRICING_INFO['claude-sonnet-4-5-20250929']).toBeDefined();
      expect(MODEL_PRICING_INFO['claude-haiku-4-5-20251001']).toBeDefined();
    });

    it('should have pricing for Gemini models', () => {
      expect(MODEL_PRICING_INFO['gemini-2.5-flash']).toBeDefined();
      expect(MODEL_PRICING_INFO['gemini-2.5-pro']).toBeDefined();
    });
  });
});
