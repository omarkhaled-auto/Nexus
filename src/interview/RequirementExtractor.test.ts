/**
 * RequirementExtractor Tests
 *
 * TDD tests for the RequirementExtractor class.
 * Tests cover parsing, categorization, confidence filtering, and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RequirementExtractor } from './RequirementExtractor';
import type { ExtractedRequirement, ExtractionResult } from './types';

describe('RequirementExtractor', () => {
  let extractor: RequirementExtractor;

  beforeEach(() => {
    extractor = new RequirementExtractor();
  });

  describe('extract()', () => {
    it('should extract a single requirement from response', () => {
      const response = `
        Here's what I understood from your description:

        <requirement>
          <text>Users must be able to log in with email and password</text>
          <category>functional</category>
          <priority>must</priority>
          <confidence>0.95</confidence>
          <area>authentication</area>
        </requirement>

        Would you like to tell me more about the authentication flow?
      `;

      const result = extractor.extract(response, 'msg-001');

      expect(result.requirements).toHaveLength(1);
      expect(result.rawCount).toBe(1);
      expect(result.filteredCount).toBe(1);
      expect(result.requirements[0].text).toBe('Users must be able to log in with email and password');
      expect(result.requirements[0].category).toBe('functional');
      expect(result.requirements[0].priority).toBe('must');
      expect(result.requirements[0].confidence).toBe(0.95);
      expect(result.requirements[0].area).toBe('authentication');
      expect(result.requirements[0].sourceMessageId).toBe('msg-001');
      expect(result.requirements[0].id).toBeDefined();
    });

    it('should extract multiple requirements from response', () => {
      const response = `
        I've identified several requirements:

        <requirement>
          <text>System must support user registration</text>
          <category>functional</category>
          <priority>must</priority>
          <confidence>0.9</confidence>
          <area>authentication</area>
        </requirement>

        <requirement>
          <text>API response time should be under 200ms</text>
          <category>non_functional</category>
          <priority>should</priority>
          <confidence>0.85</confidence>
          <area>performance</area>
        </requirement>

        <requirement>
          <text>Database must use PostgreSQL</text>
          <category>technical</category>
          <priority>must</priority>
          <confidence>0.8</confidence>
          <area>infrastructure</area>
        </requirement>
      `;

      const result = extractor.extract(response, 'msg-002');

      expect(result.requirements).toHaveLength(3);
      expect(result.rawCount).toBe(3);
      expect(result.filteredCount).toBe(3);
    });

    it('should return empty array when no requirements found', () => {
      const response = `
        Thanks for sharing! That sounds like an interesting project.
        Could you tell me more about the target users?
      `;

      const result = extractor.extract(response, 'msg-003');

      expect(result.requirements).toHaveLength(0);
      expect(result.rawCount).toBe(0);
      expect(result.filteredCount).toBe(0);
    });

    it('should skip malformed requirement blocks and return valid ones', () => {
      const response = `
        <requirement>
          <text>Valid requirement with proper structure</text>
          <category>functional</category>
          <priority>must</priority>
          <confidence>0.9</confidence>
        </requirement>

        <requirement>
          <text>Missing category requirement</text>
          <priority>should</priority>
          <confidence>0.8</confidence>
        </requirement>

        <requirement>
          <category>technical</category>
          <priority>could</priority>
          <confidence>0.75</confidence>
        </requirement>

        <requirement>
          <text>Another valid requirement</text>
          <category>constraint</category>
          <priority>should</priority>
          <confidence>0.85</confidence>
        </requirement>
      `;

      const result = extractor.extract(response, 'msg-004');

      // Only requirements with both text and category should be extracted
      expect(result.requirements).toHaveLength(2);
      expect(result.requirements[0].text).toBe('Valid requirement with proper structure');
      expect(result.requirements[1].text).toBe('Another valid requirement');
    });

    it('should filter requirements below confidence threshold', () => {
      const response = `
        <requirement>
          <text>High confidence requirement</text>
          <category>functional</category>
          <priority>must</priority>
          <confidence>0.9</confidence>
        </requirement>

        <requirement>
          <text>Low confidence requirement</text>
          <category>functional</category>
          <priority>should</priority>
          <confidence>0.5</confidence>
        </requirement>

        <requirement>
          <text>Borderline confidence requirement</text>
          <category>functional</category>
          <priority>could</priority>
          <confidence>0.7</confidence>
        </requirement>
      `;

      const result = extractor.extract(response, 'msg-005');

      // Default threshold is 0.7, so 0.5 should be filtered out
      expect(result.rawCount).toBe(3);
      expect(result.filteredCount).toBe(2);
      expect(result.requirements).toHaveLength(2);
      expect(result.requirements.some(r => r.text === 'Low confidence requirement')).toBe(false);
    });

    it('should map non_functional category to non-functional', () => {
      const response = `
        <requirement>
          <text>System should handle 1000 concurrent users</text>
          <category>non_functional</category>
          <priority>should</priority>
          <confidence>0.85</confidence>
          <area>scalability</area>
        </requirement>
      `;

      const result = extractor.extract(response, 'msg-006');

      expect(result.requirements).toHaveLength(1);
      expect(result.requirements[0].category).toBe('non-functional');
    });
  });

  describe('extractTag()', () => {
    it('should correctly extract content from XML tags', () => {
      // Testing through the class's internal method behavior via extract
      const response = `
        <requirement>
          <text>  Requirement with whitespace  </text>
          <category>functional</category>
          <priority>must</priority>
          <confidence>0.9</confidence>
          <area>  payments  </area>
        </requirement>
      `;

      const result = extractor.extract(response, 'msg-007');

      // extractTag should trim whitespace
      expect(result.requirements[0].text).toBe('Requirement with whitespace');
      expect(result.requirements[0].area).toBe('payments');
    });

    it('should return null for missing tags (area is optional)', () => {
      const response = `
        <requirement>
          <text>Requirement without area</text>
          <category>functional</category>
          <priority>should</priority>
          <confidence>0.8</confidence>
        </requirement>
      `;

      const result = extractor.extract(response, 'msg-008');

      expect(result.requirements).toHaveLength(1);
      expect(result.requirements[0].area).toBeUndefined();
    });
  });

  describe('setConfidenceThreshold()', () => {
    it('should change filtering behavior with new threshold', () => {
      const response = `
        <requirement>
          <text>High confidence</text>
          <category>functional</category>
          <priority>must</priority>
          <confidence>0.9</confidence>
        </requirement>

        <requirement>
          <text>Medium confidence</text>
          <category>functional</category>
          <priority>should</priority>
          <confidence>0.6</confidence>
        </requirement>

        <requirement>
          <text>Low confidence</text>
          <category>functional</category>
          <priority>could</priority>
          <confidence>0.4</confidence>
        </requirement>
      `;

      // With default threshold (0.7), only high confidence passes
      let result = extractor.extract(response, 'msg-009');
      expect(result.filteredCount).toBe(1);

      // Lower threshold to 0.5
      extractor.setConfidenceThreshold(0.5);
      result = extractor.extract(response, 'msg-009');
      expect(result.filteredCount).toBe(2);

      // Lower threshold to 0.3 to include all
      extractor.setConfidenceThreshold(0.3);
      result = extractor.extract(response, 'msg-009');
      expect(result.filteredCount).toBe(3);
    });
  });

  describe('real-world LLM response handling', () => {
    it('should handle response with thinking tags and requirements', () => {
      const response = `
        <thinking>
        The user wants to build a todo application. Let me extract the key requirements:
        1. Basic todo CRUD operations
        2. User authentication
        3. Data persistence

        I should ask about mobile support and offline capabilities.
        </thinking>

        I understand you want to build a todo application! Here's what I've captured:

        <requirements>
        <requirement>
          <text>Users can create, read, update, and delete todo items</text>
          <category>functional</category>
          <priority>must</priority>
          <confidence>0.95</confidence>
          <area>core</area>
        </requirement>

        <requirement>
          <text>Users must authenticate before accessing their todos</text>
          <category>functional</category>
          <priority>must</priority>
          <confidence>0.9</confidence>
          <area>authentication</area>
        </requirement>

        <requirement>
          <text>Todo data must persist across sessions</text>
          <category>non_functional</category>
          <priority>must</priority>
          <confidence>0.85</confidence>
          <area>persistence</area>
        </requirement>
        </requirements>

        A few questions:
        1. Do you need mobile app support?
        2. Should todos work offline?
      `;

      const result = extractor.extract(response, 'msg-010');

      expect(result.requirements).toHaveLength(3);
      expect(result.rawCount).toBe(3);
      expect(result.filteredCount).toBe(3);

      // Verify requirements are correctly extracted despite thinking tags
      const coreReq = result.requirements.find(r => r.area === 'core');
      expect(coreReq).toBeDefined();
      expect(coreReq?.text).toBe('Users can create, read, update, and delete todo items');

      const authReq = result.requirements.find(r => r.area === 'authentication');
      expect(authReq).toBeDefined();
      expect(authReq?.category).toBe('functional');

      const persistReq = result.requirements.find(r => r.area === 'persistence');
      expect(persistReq).toBeDefined();
      expect(persistReq?.category).toBe('non-functional');
    });
  });

  describe('constructor options', () => {
    it('should accept custom confidence threshold in constructor', () => {
      const customExtractor = new RequirementExtractor({ confidenceThreshold: 0.5 });

      const response = `
        <requirement>
          <text>Medium confidence requirement</text>
          <category>functional</category>
          <priority>should</priority>
          <confidence>0.6</confidence>
        </requirement>
      `;

      const result = customExtractor.extract(response, 'msg-011');
      expect(result.filteredCount).toBe(1);

      // Same response with default extractor would filter it out
      const defaultResult = extractor.extract(response, 'msg-011');
      expect(defaultResult.filteredCount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle requirements with multiline text', () => {
      const response = `
        <requirement>
          <text>
            Users should be able to:
            - Create accounts
            - Reset passwords
            - Update profile information
          </text>
          <category>functional</category>
          <priority>should</priority>
          <confidence>0.85</confidence>
          <area>user-management</area>
        </requirement>
      `;

      const result = extractor.extract(response, 'msg-012');

      expect(result.requirements).toHaveLength(1);
      expect(result.requirements[0].text).toContain('Create accounts');
      expect(result.requirements[0].text).toContain('Reset passwords');
    });

    it('should use default priority when missing', () => {
      const response = `
        <requirement>
          <text>Requirement without priority</text>
          <category>functional</category>
          <confidence>0.8</confidence>
        </requirement>
      `;

      const result = extractor.extract(response, 'msg-013');

      expect(result.requirements).toHaveLength(1);
      expect(result.requirements[0].priority).toBe('should');
    });

    it('should use default confidence when missing or invalid', () => {
      const response = `
        <requirement>
          <text>Requirement without confidence</text>
          <category>functional</category>
          <priority>must</priority>
        </requirement>
      `;

      // With default confidence of 0.5 and threshold of 0.7, should be filtered
      const result = extractor.extract(response, 'msg-014');

      expect(result.rawCount).toBe(1);
      // Default confidence 0.5 is below 0.7 threshold
      expect(result.filteredCount).toBe(0);
    });

    it('should generate unique IDs for each requirement', () => {
      const response = `
        <requirement>
          <text>First requirement</text>
          <category>functional</category>
          <priority>must</priority>
          <confidence>0.9</confidence>
        </requirement>

        <requirement>
          <text>Second requirement</text>
          <category>functional</category>
          <priority>must</priority>
          <confidence>0.9</confidence>
        </requirement>
      `;

      const result = extractor.extract(response, 'msg-015');

      expect(result.requirements).toHaveLength(2);
      expect(result.requirements[0].id).not.toBe(result.requirements[1].id);
    });
  });
});
