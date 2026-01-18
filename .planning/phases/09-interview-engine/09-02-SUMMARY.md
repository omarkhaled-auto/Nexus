# Plan 09-02: QuestionGenerator + InterviewEngine Summary

**Orchestration layer complete: QuestionGenerator produces contextual questions with gap detection; InterviewEngine coordinates full interview flow including message processing, extraction, storage, and event emission.**

## Accomplishments

- Created `INTERVIEWER_SYSTEM_PROMPT` with XML tag extraction format and role instructions
- Created `STANDARD_AREAS` (9 areas) for gap detection across project domains
- Implemented `QuestionGenerator` with contextual question generation and gap detection
- Implemented `InterviewEngine` as main orchestrator with full session lifecycle
- Added 41 new tests (18 QuestionGenerator + 23 InterviewEngine)
- Barrel export (`index.ts`) consolidates all interview module exports

## Files Created/Modified

- `src/interview/prompts/interviewer.ts` - Interview system prompt (95 lines)
- `src/interview/prompts/extractor.ts` - Standalone extraction prompt (84 lines)
- `src/interview/QuestionGenerator.ts` - Question generation and gap detection (322 lines)
- `src/interview/QuestionGenerator.test.ts` - 18 tests (310 lines)
- `src/interview/InterviewEngine.ts` - Main orchestrator (348 lines)
- `src/interview/InterviewEngine.test.ts` - 23 tests (344 lines)
- `src/interview/index.ts` - Barrel export (47 lines)

## Commits

1. `b5e0731` - feat(09-02): create interview prompts and QuestionGenerator
2. `8049403` - feat(09-02): implement InterviewEngine core

## Test Results

```
 PASS  src/interview/RequirementExtractor.test.ts (15 tests)
 PASS  src/interview/QuestionGenerator.test.ts (18 tests)
 PASS  src/interview/InterviewEngine.test.ts (23 tests)

 Test Files  3 passed
      Tests  56 passed (15 + 18 + 23)
```

## Decisions Made

1. **Standard Areas**: Selected 9 key areas for gap detection:
   - authentication, authorization, data_model, api, ui_ux, performance, security, integrations, deployment

2. **Gap Suggestion Threshold**: Gaps only suggested after 3+ requirements AND 2+ explored areas
   - Prevents premature suggestions before enough context gathered

3. **Category Mapping**: Interview categories map to RequirementsDB categories:
   - `constraint` -> `technical` (RequirementsDB doesn't have constraint)
   - `assumption` -> `functional` (treat as functional for now)

4. **Area Inference Order**: Specific keywords checked before generic ones
   - "protect" (security) checked before "data" (data_model)
   - Prevents false matches on substring containment

5. **Session State**: In-memory storage for now
   - 09-03 (InterviewSessionManager) will add persistence

## Architecture Notes

### Interview Flow
```
User message -> InterviewEngine.processMessage()
  1. Add message to session
  2. Build LLM messages with system prompt
  3. Call Claude via llmClient.chat()
  4. Add assistant response to session
  5. Call RequirementExtractor.extract()
  6. Store requirements in RequirementsDB
  7. Update exploredAreas
  8. Check shouldSuggestGap()
  9. Emit interview events
  10. Return response + extracted + gaps
```

### Events Emitted
- `interview:started` - Session created
- `interview:question-asked` - Each message (user and assistant)
- `interview:requirement-captured` - Each requirement extracted
- `interview:completed` - Session ended

## Issues Encountered

**Issue**: Area inference keyword order caused "protected" to match "data_model" instead of "security"
**Resolution**: Reordered keyword checks to prioritize specific terms (encrypt, protect, secure) before generic ones (data, model)

## Next Step

Ready for 09-03-PLAN.md (InterviewSessionManager + IPC integration)
