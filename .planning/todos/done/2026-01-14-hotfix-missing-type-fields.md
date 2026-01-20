---
created: 2026-01-14T12:00
title: Hotfix - Add missing type fields before Phase 2
area: types
priority: critical
files:
  - src/types/task.ts
  - src/types/core.ts
  - src/persistence/database/schema.ts
---

## Problem

Gemini code review found 3 critical missing fields that block Phase 2:

### Issue 1: Missing Task.type field
- **Files:** src/types/task.ts, src/persistence/database/schema.ts
- **Missing:** `type: 'auto' | 'checkpoint' | 'tdd'`
- **Why needed:** Distinguishes automated tasks from human checkpoints. Required for Execution Layer.

### Issue 2: Missing Requirement fields
- **Files:** src/types/core.ts, src/persistence/database/schema.ts
- **Missing:** `userStories: string[]`, `acceptanceCriteria: string[]`
- **Why needed:** Required for Planning Engine to generate tests and verify requirements.

### Issue 3: Missing Feature.complexity
- **Files:** src/types/core.ts, src/persistence/database/schema.ts
- **Missing:** `complexity: 'simple' | 'complex'`
- **Why needed:** Required for Planner agent to decide decomposition strategy.

## Solution

1. Update src/types/task.ts - add `type` field to Task interface
2. Update src/types/core.ts - add `userStories`, `acceptanceCriteria` to Requirement; add `complexity` to Feature
3. Update src/persistence/database/schema.ts - add columns to tasks, requirements, features tables
4. Create new migration for schema changes
5. Run pnpm test to verify nothing breaks
