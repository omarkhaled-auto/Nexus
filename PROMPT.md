# Phase 23: Create Playwright MCP E2E Testing Prompt for Claude Code

## Context

- **Project:** Nexus AI Builder
- **Repository:** https://github.com/omarkhaled-auto/Nexus
- **Current State:** Phase 22-FIX complete, app launching, basic flows working
- **Purpose:** Write a comprehensive Playwright MCP E2E testing prompt for Claude Code
- **Reference:** PLAYWRIGHT_MCP_E2E_RESEARCH.md in project knowledge

---

## Mission Statement

You are Ralph. Your job is to:

1. **FIRST**: Analyze the Nexus codebase to understand ALL features, pages, components, and user flows
2. **THEN**: Write a comprehensive Playwright MCP E2E testing prompt tailored to Nexus
3. **OUTPUT**: A single markdown file that Claude Code will use to test Nexus end-to-end

The testing prompt you create will be given to Claude Code with Playwright MCP. Claude Code will then execute the tests, and **fix any issues it encounters** before moving on. The goal is a WORKING Nexus app that can create a functional project.

---

## Critical Rules

+============================================================================+
|                                                                            |
|  RULE 1: ANALYZE BEFORE WRITING                                            |
|          - Read ALL relevant source files first                            |
|          - Understand every page, component, and flow                      |
|          - Map out the complete user journey                               |
|                                                                            |
|  RULE 2: THE TESTING PROMPT MUST BE SELF-CONTAINED                         |
|          - Claude Code should be able to run it without asking questions   |
|          - Include ALL necessary context about Nexus                       |
|          - Specify exact selectors, paths, and expected behaviors          |
|                                                                            |
|  RULE 3: FIX ISSUES, DON'T JUST LOG THEM                                   |
|          - The prompt must instruct Claude Code to FIX problems            |
|          - Only stop for complete blockers requiring human help            |
|          - Each fix should be verified before moving on                    |
|                                                                            |
|  RULE 4: END-TO-END MEANS END-TO-END                                       |
|          - The test creates a REAL project using Nexus                     |
|          - Goes through the ENTIRE Genesis flow                            |
|          - Results in actual generated code/output                         |
|                                                                            |
+============================================================================+

---

# =============================================================================
# TASK 1: Analyze Nexus Codebase
# =============================================================================

## Objective
Understand every feature, page, component, and user flow in Nexus.

## Requirements

### 1.1 Read the UI Structure

```bash
# Find all pages
find src/renderer -name "*Page*" -type f -name "*.tsx"

# Find all components
find src/renderer/src/components -type f -name "*.tsx" | head -50

# Read the router configuration
cat src/renderer/src/App.tsx
```

Document:
- All route paths (/, /genesis, /evolution, /kanban, etc.)
- What component each route renders
- Navigation flow between pages

### 1.2 Read the Main Entry Points

```bash
# Main process entry
cat src/main/index.ts
cat src/main/main.ts

# Bootstrap and initialization
cat src/main/NexusBootstrap.ts | head -200
```

Document:
- How the app initializes
- What services are created
- What IPC handlers are registered

### 1.3 Read Key Pages

```bash
# Welcome/Mode selector page
cat src/renderer/src/pages/ModeSelectorPage.tsx 2>/dev/null || \
cat src/renderer/src/pages/WelcomePage.tsx 2>/dev/null

# Interview page
cat src/renderer/src/pages/InterviewPage.tsx 2>/dev/null

# Kanban page
cat src/renderer/src/pages/KanbanPage.tsx 2>/dev/null
```

Document for each page:
- What UI elements exist
- What actions user can take
- What events are triggered
- Expected navigation after actions

### 1.4 Read Key Components

```bash
# Project selector
cat src/renderer/src/components/ProjectSelector.tsx

# Interview components
find src/renderer -path "*interview*" -name "*.tsx" | xargs cat 2>/dev/null | head -300

# Kanban components
find src/renderer -path "*kanban*" -o -path "*Kanban*" | xargs cat 2>/dev/null | head -200
```

Document:
- Key interactive elements (buttons, inputs, etc.)
- CSS classes or data-testid attributes for selection
- Component props and state

### 1.5 Understand the Genesis Flow

Map out the COMPLETE Genesis flow:
```
1. App launches -> What page shows?
2. User clicks Genesis -> Where does it navigate?
3. User selects folder -> How? What component?
4. User enters project name -> What input?
5. User clicks Create -> What happens?
6. Interview page loads -> What elements?
7. User sends message -> How?
8. AI responds -> What shows?
9. User completes interview -> What button?
10. Tasks are created -> Where stored?
11. Kanban shows -> What displays?
12. Execution starts -> How triggered?
```

### 1.6 Document All Selectors

Find or infer selectors for:
- Buttons (Genesis, Evolution, Create, Send, Complete, etc.)
- Inputs (project name, chat input, etc.)
- Containers (chat area, kanban board, etc.)
- Status indicators (loading, error, success)

```bash
# Find data-testid attributes
grep -rn "data-testid" src/renderer/ --include="*.tsx" | head -50

# Find button text
grep -rn "<button\|<Button" src/renderer/ --include="*.tsx" | head -50

# Find input elements
grep -rn "<input\|<Input\|<textarea" src/renderer/ --include="*.tsx" | head -30
```

**[TASK 1 COMPLETE]** when you have a complete map of Nexus's UI and flows

---

# =============================================================================
# TASK 2: Write the Playwright MCP E2E Testing Prompt
# =============================================================================

## Objective
Create a comprehensive, self-contained prompt for Claude Code with Playwright MCP.

## Output File
Create: `PROMPT-PLAYWRIGHT-E2E-TEST.md`

## Prompt Structure

The prompt you write MUST follow this structure:

```markdown
# Nexus E2E Testing with Playwright MCP

## Context
- What is Nexus (brief description)
- Current state (app runs, basic flows work)
- Goal: Create a functional project using Nexus, fixing any issues encountered

## Prerequisites
- Playwright MCP must be configured
- Nexus must be running (`npm run dev`)
- How to verify MCP is working

## Testing Philosophy
- This is EXPLORATORY and FIXING, not just observing
- When an issue is found, FIX IT before moving on
- Only stop for complete blockers requiring human intervention
- Take screenshots at each major step
- Log all console output for debugging

## How to Use Playwright MCP
[Include the key tools and how to use them]
- browser_navigate
- browser_click
- browser_type
- browser_screenshot
- browser_snapshot
- etc.

## Nexus Application Structure
[Include what you learned in Task 1]
- Routes and pages
- Key components
- Selectors for interactive elements
- Expected behaviors

## Test Flow

### Phase 1: App Launch Verification
1. Navigate to Nexus (localhost URL)
2. Take screenshot
3. Verify welcome/mode selector page loads
4. Expected: See Genesis and Evolution options
5. IF ISSUE: [specific fix instructions]

### Phase 2: Genesis Mode Selection
1. Click Genesis mode button/card
2. Take screenshot
3. Verify navigation to project creation
4. Expected: See project selector or folder selection
5. IF ISSUE: [specific fix instructions]

### Phase 3: Project Creation
1. [Specific steps based on what you found]
2. Enter project name: "PlaywrightTestProject"
3. Click create button
4. Take screenshot
5. Expected: Navigation to interview page
6. IF ISSUE: [specific fix instructions]

### Phase 4: Interview Flow
1. Verify interview page elements
2. Send a test message: "I want to build a simple todo app with React"
3. Wait for AI response
4. Take screenshot
5. Verify response appears
6. IF ISSUE: [specific fix instructions]

### Phase 5: Complete Interview
1. [Continue based on what you found]
2. Click complete/finish button
3. Wait for task decomposition
4. Take screenshot
5. IF ISSUE: [specific fix instructions]

### Phase 6: Kanban Board
1. Verify Kanban page loads
2. Take screenshot
3. Verify tasks are displayed
4. IF ISSUE: [specific fix instructions]

### Phase 7: Execution (if applicable)
1. [Steps to start execution if UI supports it]
2. Monitor progress
3. Take screenshots
4. IF ISSUE: [specific fix instructions]

## Issue Resolution Guide

When you encounter an issue:

1. IDENTIFY: Take screenshot, read error messages, check console
2. DIAGNOSE: Determine root cause (UI bug, backend error, missing handler, etc.)
3. FIX: Make the necessary code change
4. VERIFY: Rebuild if needed, test the fix
5. CONTINUE: Move to next step

### Common Issues and Fixes

[Include based on what you know about Nexus]

#### Navigation Issues
- If 404 error: Check router config, ensure HashRouter is used
- If blank page: Check component rendering, look for errors

#### Dialog Issues
- If folder dialog doesn't work: Check IPC handlers, fs-extra imports

#### Interview Issues
- If chat doesn't respond: Check Claude CLI availability, API keys

#### State Issues
- If data doesn't persist: Check database operations, state management

## Stopping Criteria

ONLY stop the test if:
1. A critical dependency is missing (e.g., Claude CLI not installed, API key required)
2. A fix requires architectural changes beyond scope
3. User input is explicitly required (e.g., entering real API keys)

DO NOT stop for:
- UI bugs (fix them)
- Missing error handling (add it)
- Navigation issues (fix the routes)
- State management issues (fix the stores)

## Success Criteria

The test is SUCCESSFUL when:
1. App launches without errors
2. Genesis flow completes entirely
3. A project is created with proper structure
4. Interview captures requirements
5. Tasks are generated and displayed
6. (Optional) Execution produces output

## Final Report

After testing, provide:
1. Summary of steps completed
2. List of issues found and fixed
3. Screenshots of each major step
4. Any remaining issues that need human attention
5. Recommendations for improvement
```

## Important Inclusions

### 1. Exact Selectors
Based on your analysis, include the EXACT selectors Claude Code should use:

```markdown
## Selectors Reference

| Element | Selector | Notes |
|---------|----------|-------|
| Genesis Button | `text=Genesis` or `[data-testid="genesis-button"]` | On welcome page |
| Project Name Input | `input[placeholder*="name"]` or `[data-testid="project-name"]` | In project selector |
| Create Button | `button:has-text("Create")` | Submits project creation |
| Chat Input | `[data-testid="chat-input"]` or `textarea` | In interview page |
| Send Button | `button:has-text("Send")` | Sends chat message |
| Complete Button | `button:has-text("Complete")` | Ends interview |
```

### 2. Expected URLs
Include the routes:

```markdown
## URL Routes

| Page | URL | Component |
|------|-----|-----------|
| Welcome | `/#/` | ModeSelectorPage |
| Genesis Interview | `/#/genesis` | InterviewPage |
| Evolution | `/#/evolution` | KanbanPage |
| Kanban | `/#/kanban` | KanbanPage |
```

### 3. IPC Handlers to Know About
Include relevant IPC calls:

```markdown
## Key IPC Handlers

| Action | IPC Channel | Purpose |
|--------|-------------|---------|
| Create Project | `project:initialize` | Creates project structure |
| Open Dialog | `dialog:openDirectory` | Opens folder picker |
| Send Message | `interview:sendMessage` | Sends chat to AI |
| Complete Interview | `interview:complete` | Ends interview session |
```

### 4. Fix Instructions
For EACH potential issue, include specific fix instructions:

```markdown
## Issue: Navigation shows 404

### Diagnosis
- React Router is using BrowserRouter instead of HashRouter
- Electron requires HashRouter for file:// protocol

### Fix
1. Open `src/renderer/src/App.tsx`
2. Change `createBrowserRouter` to `createHashRouter`
3. Rebuild: `npm run build`
4. Restart: `npm run dev`
5. Verify fix by navigating again
```

**[TASK 2 COMPLETE]** when the full prompt is written

---

# =============================================================================
# TASK 3: Finalize and Save
# =============================================================================

## Objective
Save the complete testing prompt and verify it's ready for Claude Code.

## Requirements

### 3.1 Save the Prompt

Save to: `PROMPT-PLAYWRIGHT-E2E-TEST.md`

### 3.2 Verification Checklist

Before marking complete, verify:

- [x] Prompt includes complete Nexus context
- [x] All routes and pages documented
- [x] All selectors specified
- [x] All test steps detailed
- [x] Issue resolution guide included
- [x] Stopping criteria clear
- [x] Success criteria defined
- [x] Fix instructions for common issues included
- [x] Screenshots requested at each step
- [x] Console logging instructions included

### 3.3 Commit

```bash
git add PROMPT-PLAYWRIGHT-E2E-TEST.md
git commit -m "feat: Add Playwright MCP E2E testing prompt for Claude Code

- Complete testing prompt for Genesis flow
- Includes all selectors and expected behaviors
- Issue resolution guide with specific fixes
- Screenshots and logging at each step"
```

**[TASK 3 COMPLETE]**

---

## Success Criteria

+============================================================================+
|                                                                            |
|  1. COMPLETE CODEBASE ANALYSIS                                             |
|     - All pages and routes documented                                      |
|     - All interactive elements identified                                  |
|     - All flows mapped                                                     |
|                                                                            |
|  2. COMPREHENSIVE TESTING PROMPT                                           |
|     - Self-contained (no external context needed)                          |
|     - Specific selectors and steps                                         |
|     - Issue resolution instructions                                        |
|     - Clear success/stopping criteria                                      |
|                                                                            |
|  3. ACTIONABLE FIX INSTRUCTIONS                                            |
|     - For each potential issue type                                        |
|     - Specific file and code changes                                       |
|     - Verification steps                                                   |
|                                                                            |
+============================================================================+

---

## Output

After completion, this file should exist:
```
PROMPT-PLAYWRIGHT-E2E-TEST.md   # Complete testing prompt for Claude Code
```

This prompt will then be given to Claude Code with Playwright MCP configured to:
1. Launch Nexus
2. Test the complete Genesis flow
3. Fix any issues encountered
4. Create a real functional project
5. Report results

---

## Notes

- Be THOROUGH in the codebase analysis - the testing prompt depends on it
- Be SPECIFIC in selectors - vague selectors cause flaky tests
- Be DETAILED in fix instructions - Claude Code should know exactly what to change
- The goal is a WORKING Nexus, not just a test report
- Screenshots at every step help diagnose issues

---

**[PHASE 23 COMPLETE]**

---

## Completion Summary

### Task 1: Analyze Nexus Codebase ✅ COMPLETE

**Pages Analyzed:**
- ModeSelectorPage - Landing page with Genesis/Evolution mode cards
- InterviewPage - Genesis mode interview interface with chat panel and requirements sidebar
- KanbanPage - Evolution mode with 6-column Kanban board
- DashboardPage - Project overview and metrics
- SettingsPage - LLM provider configuration
- AgentsPage - Agent activity monitoring
- ExecutionPage - Execution logs viewer

**Routes Documented:**
- `/` - Mode Selector (ModeSelectorPage)
- `/genesis` - Interview Page (InterviewPage)
- `/evolution` - Kanban Page (KanbanPage)
- `/dashboard` - Dashboard Page (DashboardPage)
- `/settings` - Settings Page (SettingsPage)
- `/agents` - Agents Page (AgentsPage)
- `/execution` - Execution Page (ExecutionPage)

**Key Components:**
- ProjectSelector - Dialog for folder selection and project creation
- ChatPanel - Interview chat interface
- RequirementsSidebar - Real-time requirements display
- KanbanBoard - 6-column drag-and-drop board
- KanbanHeader - Board header with search and add feature
- KanbanColumn - Individual column with sortable cards
- FeatureCard - Draggable feature card

**Selectors Documented:** 50+ data-testid attributes cataloged

### Task 2: Write Playwright MCP E2E Testing Prompt ✅ COMPLETE

**Created:** `PROMPT-PLAYWRIGHT-E2E-TEST.md`

**Contents:**
- Complete Nexus context and architecture
- Prerequisites and setup instructions
- Playwright MCP usage guide
- 8 test phases (Launch → Genesis → Project → Interview → Continue → Complete → Kanban → Add Feature)
- Full selector reference table
- IPC channel documentation
- Issue resolution guide with specific fixes
- Stopping and success criteria
- Final report template

### Task 3: Finalize and Save ✅ COMPLETE

**File saved:** `PROMPT-PLAYWRIGHT-E2E-TEST.md`
**Verification checklist:** All items checked
**Ready for commit**