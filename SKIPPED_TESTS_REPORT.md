# Nexus Skipped Tests Report

Generated: 2026-01-18

## Summary

| Category | Count | Status |
|----------|-------|--------|
| TreeSitter Integration Tests | 16 | **ENABLED** :white_check_mark: |
| Missing Module Tests | 20 | Pending implementation |
| Total Issues | 20 | - |

## Part 1: TreeSitter Integration Tests (16 tests) - NOW ENABLED

### Location
`src/infrastructure/analysis/TreeSitterParser.integration.test.ts`

### Status
**ENABLED AND PASSING** - These tests were previously skipped but are now fully functional.

### Changes Made
1. Created separate integration test file `TreeSitterParser.integration.test.ts`
2. Configured vitest for WASM support:
   - Added `vite-plugin-wasm` and `vite-plugin-top-level-await` plugins
   - Set `pool: 'forks'` with `singleFork: true` for WASM compatibility
   - Configured `server.deps.external` for tree-sitter packages
3. Fixed TreeSitterParser implementation:
   - Fixed namespace import parsing to use `firstNamedChild` instead of `childForFieldName('alias')`
   - Fixed JSDoc extraction to check parent's previousSibling for exported declarations

### Tests Now Passing

| # | Test Name | Category |
|---|-----------|----------|
| 1 | should extract function declarations | symbol extraction |
| 2 | should extract classes with methods | symbol extraction |
| 3 | should extract interfaces | symbol extraction |
| 4 | should extract type aliases | symbol extraction |
| 5 | should extract enums | symbol extraction |
| 6 | should extract arrow functions assigned to const | symbol extraction |
| 7 | should extract named imports | import extraction |
| 8 | should extract default imports | import extraction |
| 9 | should extract namespace imports | import extraction |
| 10 | should extract side-effect imports | import extraction |
| 11 | should extract type-only imports | import extraction |
| 12 | should extract named exports | export extraction |
| 13 | should extract default exports | export extraction |
| 14 | should extract re-exports | export extraction |
| 15 | should extract JSDoc documentation | documentation extraction |
| 16 | should detect syntax errors | error detection |

---

## Part 2: Failing Tests Due to Missing Modules (20 test files)

These tests import modules that have not been implemented yet. They are integration tests for planned features.

### Failed Test Files

| # | Test File | Missing Module(s) |
|---|-----------|-------------------|
| 1 | `tests/integration/agents/coder.test.ts` | `@/execution/agents/CoderRunner` |
| 2 | `tests/integration/agents/planner.test.ts` | `@/planning/decomposition/TaskDecomposer` |
| 3 | `tests/integration/agents/reviewer.test.ts` | `@/execution/agents/ReviewerRunner` |
| 4 | `tests/integration/flows/evolution.test.ts` | Multiple modules |
| 5 | `tests/integration/flows/genesis.test.ts` | Multiple modules |
| 6 | `tests/integration/execution-quality.test.ts` | Execution modules |
| 7 | `tests/integration/infra-persistence.test.ts` | Persistence modules |
| 8 | `tests/integration/persistence-planning.test.ts` | Planning modules |
| 9 | `tests/integration/planning-execution.test.ts` | Planning/Execution modules |
| 10 | `tests/helpers/fixtures.test.ts` | Helper modules |

### Missing Modules Summary

The following modules are referenced in tests but do not exist:

**Execution Agents:**
- `@/execution/agents/CoderRunner`
- `@/execution/agents/ReviewerRunner`
- `@/execution/agents/TesterRunner`
- `@/execution/agents/MergerRunner`

**Planning:**
- `@/planning/decomposition/TaskDecomposer`
- `@/planning/decomposition/FeatureAnalyzer`

**Quality:**
- `@/quality/verification/BuildVerifier`
- `@/quality/verification/TestRunner`

### Recommendation
**DO NOT UNSKIP** - These tests are placeholders for features that need to be implemented. The modules they import do not exist yet.

When implementing these features:
1. Create the missing modules
2. Run the corresponding integration tests
3. Fix any test failures

---

## Part 3: Configuration Issues Fixed

During investigation, the following configuration issues were identified and fixed:

### 1. Missing src/renderer/index.html
**Status:** FIXED
- Created `src/renderer/index.html` - HTML entry point for electron-vite
- Created `src/renderer/src/main.tsx` - React entry point
- Created `src/renderer/src/index.css` - Tailwind CSS base styles

### 2. Missing electron.vite.config.ts
**Status:** FIXED
- Created `electron.vite.config.ts` with:
  - Path aliases matching tsconfig.json
  - External packages for main process: `better-sqlite3`, `@google/generative-ai`, `openai`
  - React plugin for renderer

### 3. Vitest Path Resolution
**Status:** ALREADY WORKING
- `vite-tsconfig-paths` was already installed and configured in `vitest.config.ts`
- Path resolution works correctly for `src/` directory tests
- Tests in `tests/` directory fail due to missing modules, not path issues

### 4. Missing UI Components
**Status:** FIXED
- Created `src/renderer/src/components/ui/card.tsx`
- Created `src/renderer/src/components/ui/button.tsx`
- Created barrel exports (index.ts) for component directories
- Created dashboard components: CostTracker, OverviewCards, ProgressChart, AgentActivity
- Created interview components: InterviewLayout, ChatPanel
- Created kanban components: FeatureCard, FeatureDetailModal

---

## Verification Commands

```bash
# Verify lint passes
npm run lint

# Verify electron build works
npm run build:electron

# Run all TreeSitterParser tests (unit + integration)
npx vitest run src/infrastructure/analysis/TreeSitterParser.test.ts src/infrastructure/analysis/TreeSitterParser.integration.test.ts

# Run all tests
npm test

# Run only passing tests (exclude integration tests with missing modules)
npm test -- --exclude=tests/integration
```

---

## Recommendations

### Completed Actions
1. **TreeSitter WASM Setup**: DONE - Configured vitest with WASM support
2. **TreeSitter Integration Tests**: DONE - All 16 tests now passing
3. **Parser Fixes**: DONE - Fixed namespace import and JSDoc extraction

### Remaining Work
1. Do not attempt to enable the 20 integration tests until the corresponding modules are implemented
2. **Agent Implementation**: Implement CoderRunner, ReviewerRunner, and other agent modules
3. **Planning Module**: Implement TaskDecomposer and related planning functionality
4. **Component Tests**: Update component tests to match the new implementations

### Test Coverage Notes
- TreeSitter unit tests: 26 passing
- TreeSitter integration tests: 16 passing (NEWLY ENABLED)
- Failing integration tests: 20 (due to missing modules)
