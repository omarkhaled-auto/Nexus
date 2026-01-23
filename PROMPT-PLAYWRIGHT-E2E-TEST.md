# Nexus E2E Testing with Playwright MCP

## Context

**What is Nexus?**
Nexus AI Builder is an Electron-based application that helps developers build software projects using AI. It has two modes:
- **Genesis Mode**: Create a new project from scratch through AI-powered interviews
- **Evolution Mode**: Enhance an existing project through a Kanban-style task board

**Current State:**
- App launches successfully
- Basic UI flows work
- HashRouter configured for Electron compatibility
- Interview and Kanban pages functional

**Goal:**
Create a functional project using Nexus, fixing any issues encountered along the way. This is an EXPLORATORY AND FIXING test, not just observation.

---

## Prerequisites

### 1. Playwright MCP Configuration
Ensure Playwright MCP is available and configured in Claude Code.

### 2. Start Nexus Application
```bash
cd C:\Users\omars\OneDrive\Desktop\Nexus-master
npm run dev
```

Wait for the app to fully launch. The Electron window should open.

### 3. Get the App URL
The app runs at `http://localhost:5173` (Vite dev server). The Electron app loads this URL internally.

For testing with Playwright MCP, navigate to: `http://localhost:5173`

---

## Testing Philosophy

1. **EXPLORATORY AND FIXING** - When an issue is found, FIX IT before moving on
2. **Only stop for complete blockers** requiring human intervention (missing API keys, etc.)
3. **Take screenshots at EVERY major step** for debugging
4. **Log console output** when errors occur
5. **Verify each fix** before continuing to the next step

---

## How to Use Playwright MCP

### Key Tools

```javascript
// Navigate to a URL
browser_navigate({ url: "http://localhost:5173" })

// Take a screenshot (DO THIS AT EVERY STEP)
browser_screenshot()

// Click an element
browser_click({ element: "Genesis", ref: "element_ref_from_snapshot" })

// Type text into an input
browser_type({ element: "input", text: "my-project-name", ref: "element_ref" })

// Get page snapshot (shows all interactive elements with refs)
browser_snapshot()

// Wait for navigation/loading
browser_wait({ timeout: 3000 })

// Press keyboard keys
browser_press_key({ key: "Enter" })
```

### Workflow Pattern
1. `browser_navigate()` - Go to URL
2. `browser_snapshot()` - See what's on the page and get element refs
3. `browser_screenshot()` - Visual confirmation
4. `browser_click()` or `browser_type()` - Interact
5. `browser_wait()` - Wait for response
6. Repeat

---

## Nexus Application Structure

### URL Routes

| Page | URL | Description |
|------|-----|-------------|
| Mode Selector (Home) | `http://localhost:5173/#/` | Genesis/Evolution cards |
| Genesis Interview | `http://localhost:5173/#/genesis` | Chat-based interview |
| Evolution/Kanban | `http://localhost:5173/#/evolution` | Feature Kanban board |
| Dashboard | `http://localhost:5173/#/dashboard` | Project overview |
| Settings | `http://localhost:5173/#/settings` | App configuration |
| Agents | `http://localhost:5173/#/agents` | Agent activity view |
| Execution | `http://localhost:5173/#/execution` | Execution logs |

### Key Selectors Reference

| Element | Selector | Location | Notes |
|---------|----------|----------|-------|
| Genesis Card | `[data-testid="genesis-card"]` | Mode Selector | Click to start new project |
| Evolution Card | `[data-testid="evolution-card"]` | Mode Selector | Click to open existing |
| Folder Select Button | `[data-testid="folder-select-btn"]` | ProjectSelector Dialog | Opens native dialog |
| Cancel Button | `[data-testid="cancel-btn"]` | ProjectSelector Dialog | Cancels dialog |
| Confirm/Create Button | `[data-testid="confirm-btn"]` | ProjectSelector Dialog | Creates/opens project |
| Back Button | `[data-testid="back-button"]` | Interview Page | Returns to previous page |
| Save Draft Button | `[data-testid="save-draft-button"]` | Interview Page | Saves interview progress |
| Complete Button | `[data-testid="complete-button"]` | Interview Page | Completes interview (needs 3+ requirements) |
| Chat Input | `[data-testid="chat-input"]` | Interview Page | Text input for chat |
| Send Button | `[data-testid="send-button"]` | Interview Page | Sends message |
| Chat Panel | `[data-testid="chat-panel"]` | Interview Page | Chat container |
| Requirements Panel | `[data-testid="requirements-panel"]` | Interview Page | Shows extracted requirements |
| Resume Banner | `[data-testid="resume-banner"]` | Interview Page | Shows if previous session exists |
| Start Fresh Button | `[data-testid="start-fresh-button"]` | Interview Page | Starts new interview |
| Resume Button | `[data-testid="resume-button"]` | Interview Page | Resumes previous session |
| New Interview Button | `[data-testid="new-interview-button"]` | Interview Page Footer | Resets interview |
| AI Message | `[data-testid="ai-message"]` | Chat Panel | AI response bubble |
| User Message | `[data-testid="user-message"]` | Chat Panel | User message bubble |
| Page Loader | `[data-testid="page-loader"]` | Any Page | Loading spinner |
| Add Feature Title Input | `[data-testid="add-feature-title-input"]` | Kanban Page | Feature title input |
| Add Feature Description | `[data-testid="add-feature-description-input"]` | Kanban Page | Feature description |
| Add Feature Submit | `[data-testid="add-feature-submit"]` | Kanban Page | Creates new feature |

### Text-Based Selectors (Fallback)

| Element | Text to Find | Notes |
|---------|--------------|-------|
| Genesis Card | "Genesis" or "Start a new project" | Has violet accent |
| Evolution Card | "Evolution" or "Enhance an existing project" | Has emerald accent |
| Create Project Button | "Create Project" | In ProjectSelector |
| Open Project Button | "Open Project" | In ProjectSelector |
| Complete Button | "Complete" | In Interview header |
| Send Button | Send icon (arrow) | Next to chat input |

---

## Test Flow

### Phase 1: App Launch Verification

**Objective:** Verify the Nexus app loads correctly.

1. **Navigate to Nexus**
   ```javascript
   browser_navigate({ url: "http://localhost:5173" })
   ```

2. **Take screenshot**
   ```javascript
   browser_screenshot()
   ```

3. **Get page snapshot** to see elements
   ```javascript
   browser_snapshot()
   ```

4. **Expected:**
   - Page title should contain "Nexus"
   - Should see "Nexus" heading
   - Should see "Genesis" card (violet accent)
   - Should see "Evolution" card (emerald accent)
   - Should see "Build anything with AI" subtitle

5. **IF ISSUE - Page is blank:**
   - Check browser console for errors
   - Verify `npm run dev` is running
   - Check if port 5173 is in use

6. **IF ISSUE - 404 or routing error:**
   - Verify HashRouter is being used (check `src/renderer/src/App.tsx`)
   - URL should include `/#/` for hash routing

---

### Phase 2: Genesis Mode Selection

**Objective:** Click Genesis and verify ProjectSelector opens.

1. **Click Genesis Card**
   ```javascript
   // Get element ref from snapshot first
   browser_click({ element: "[data-testid='genesis-card']", ref: "..." })
   ```

2. **Take screenshot**
   ```javascript
   browser_screenshot()
   ```

3. **Get snapshot** to see dialog
   ```javascript
   browser_snapshot()
   ```

4. **Expected:**
   - ProjectSelector dialog should appear
   - Title: "Create New Project"
   - Should see "Project Name" input field
   - Should see "Location" field with folder select button
   - Should see "Cancel" and "Create Project" buttons

5. **IF ISSUE - Dialog doesn't open:**
   - Check if `window.nexusAPI.dialog` is defined
   - May fall back to direct navigation if no dialog API
   - Fix: Check `src/renderer/src/pages/ModeSelectorPage.tsx` - `handleGenesisClick()`

6. **IF ISSUE - Dialog opens but buttons don't work:**
   - Check IPC handlers in `src/main/ipc/`
   - Verify `registerDialogHandlers()` is called in `src/main/index.ts`

---

### Phase 3: Project Creation

**Objective:** Create a test project for the interview.

**Note:** Native folder dialog cannot be automated. We have two options:

**Option A: Test with mock/fallback path (Recommended for E2E)**

1. If ProjectSelector shows, click "Cancel" to close dialog
   ```javascript
   browser_click({ element: "[data-testid='cancel-btn']", ref: "..." })
   ```

2. Navigate directly to Genesis interview page
   ```javascript
   browser_navigate({ url: "http://localhost:5173/#/genesis" })
   ```

3. Take screenshot
   ```javascript
   browser_screenshot()
   ```

**Option B: If the app navigates automatically without folder selection**

The app may fall back to direct navigation if dialog API isn't available. In this case:

1. After clicking Genesis, check if it navigated to `/#/genesis`
2. Take screenshot to verify Interview page loaded

4. **Expected after reaching Interview page:**
   - URL should be `/#/genesis`
   - Should see "Genesis Interview" heading
   - Should see chat panel on left
   - Should see requirements panel on right
   - Should see "Save Draft" button
   - Should see "Complete" button (disabled initially)

5. **IF ISSUE - Interview page doesn't load:**
   - Check lazy loading in `App.tsx`
   - Look for `PageLoader` component
   - Check console for import errors

---

### Phase 4: Interview Flow

**Objective:** Have a conversation with the AI to define project requirements.

1. **Take initial snapshot**
   ```javascript
   browser_snapshot()
   ```

2. **Verify chat panel elements**
   - Should see welcome message from AI OR empty state with "Welcome to Genesis Mode"
   - Should see chat input at bottom
   - Should see send button

3. **Wait for AI initialization** (may take a few seconds)
   ```javascript
   browser_wait({ timeout: 5000 })
   ```

4. **Type first message**
   ```javascript
   browser_type({
     element: "[data-testid='chat-input']",
     text: "I want to build a simple todo app with React. It should have features to add, edit, delete, and mark todos as complete.",
     ref: "..."
   })
   ```

5. **Send message**
   ```javascript
   browser_click({ element: "[data-testid='send-button']", ref: "..." })
   ```
   OR
   ```javascript
   browser_press_key({ key: "Enter" })
   ```

6. **Take screenshot**
   ```javascript
   browser_screenshot()
   ```

7. **Wait for AI response**
   ```javascript
   browser_wait({ timeout: 15000 })  // AI can take time
   ```

8. **Take another screenshot** to capture response
   ```javascript
   browser_screenshot()
   ```

9. **Expected:**
   - User message should appear in chat
   - AI response should appear (may show typing indicator first)
   - Requirements panel on right may start populating

10. **IF ISSUE - Chat input is disabled:**
    - Interview may not have started
    - Check `isInterviewing` state in store
    - Look for error messages below chat input

11. **IF ISSUE - No AI response:**
    - Check if Claude CLI is installed and configured
    - Check if API key is set in Settings
    - Look for error in chat panel: "Backend not available"
    - **Fix:** May need to configure LLM in Settings page first

12. **IF ISSUE - Error message appears:**
    - Read the error message
    - Common: "Claude CLI not found" - need to install Claude CLI
    - Common: "API key required" - need to set key in Settings

---

### Phase 5: Continue Interview

**Objective:** Provide more details to generate at least 3 requirements.

1. **Wait for AI response to complete** (no more typing indicator)

2. **Send second message**
   ```javascript
   browser_type({
     element: "[data-testid='chat-input']",
     text: "The app should use a modern tech stack with TypeScript. Users should be able to filter todos by status (all, active, completed). Add local storage persistence.",
     ref: "..."
   })
   browser_click({ element: "[data-testid='send-button']", ref: "..." })
   ```

3. **Wait and screenshot**
   ```javascript
   browser_wait({ timeout: 15000 })
   browser_screenshot()
   ```

4. **Send third message** (to ensure we have 3+ requirements)
   ```javascript
   browser_type({
     element: "[data-testid='chat-input']",
     text: "The UI should have a clean, minimal design with dark mode support. Each todo should show creation date and allow setting due dates.",
     ref: "..."
   })
   browser_click({ element: "[data-testid='send-button']", ref: "..." })
   ```

5. **Wait and screenshot**
   ```javascript
   browser_wait({ timeout: 15000 })
   browser_screenshot()
   ```

6. **Verify requirements panel**
   ```javascript
   browser_snapshot()
   ```

   - Check `[data-testid="requirements-panel"]`
   - Should show requirement count badge
   - Should show categorized requirements

7. **Expected:**
   - At least 3 requirements extracted
   - Requirements grouped by category (functional, technical, etc.)
   - "Complete" button should become enabled

---

### Phase 6: Complete Interview

**Objective:** Complete the interview and transition to Kanban view.

1. **Verify Complete button is enabled**
   - Look for `[data-testid="complete-button"]`
   - Should NOT have `disabled` attribute if 3+ requirements

2. **If Complete is still disabled:**
   - Check requirements count in footer: "Need at least 3 requirements to complete"
   - Continue interview with more messages until 3 requirements are captured

3. **Click Complete button**
   ```javascript
   browser_click({ element: "[data-testid='complete-button']", ref: "..." })
   ```

4. **Wait for transition**
   ```javascript
   browser_wait({ timeout: 5000 })
   ```

5. **Take screenshot**
   ```javascript
   browser_screenshot()
   ```

6. **Expected:**
   - Should navigate to `/#/evolution` (Kanban page)
   - Should see Kanban board with columns
   - May see features generated from requirements

7. **IF ISSUE - Stays on interview page:**
   - Check console for navigation errors
   - Verify `navigate('/evolution')` is being called
   - Check if backend `interview.end()` failed

---

### Phase 7: Kanban Board Verification

**Objective:** Verify Kanban board displays correctly.

1. **Get page snapshot**
   ```javascript
   browser_snapshot()
   ```

2. **Take screenshot**
   ```javascript
   browser_screenshot()
   ```

3. **Expected Kanban columns (6 columns):**
   - Backlog
   - Planning
   - In Progress (limit: 3)
   - AI Review
   - Human Review
   - Done

4. **Verify header elements:**
   - Project name or "Evolution Mode"
   - Feature count
   - Search input
   - "Add Feature" button

5. **Test Add Feature (optional):**
   ```javascript
   // Click Add Feature button (if visible)
   browser_click({ element: "text=Add Feature", ref: "..." })
   browser_wait({ timeout: 1000 })
   browser_screenshot()
   ```

6. **IF ISSUE - Empty state showing:**
   - This is OK - means no features were auto-created from interview
   - Features can be added manually

7. **IF ISSUE - Loading never completes:**
   - Check `nexusAPI.getFeatures()` IPC handler
   - Verify database connection

---

### Phase 8: Add Feature Manually (Optional)

**Objective:** Test manual feature creation.

1. **Click "Add Feature" button**
   ```javascript
   browser_click({ element: "text=Add Feature", ref: "..." })
   ```

2. **Fill in feature details**
   ```javascript
   browser_type({
     element: "[data-testid='add-feature-title-input']",
     text: "User Authentication",
     ref: "..."
   })

   browser_type({
     element: "[data-testid='add-feature-description-input']",
     text: "Implement user login and registration with email/password",
     ref: "..."
   })
   ```

3. **Select priority (click a priority button)**
   ```javascript
   browser_click({ element: "[data-testid='add-feature-priority-high']", ref: "..." })
   ```

4. **Submit feature**
   ```javascript
   browser_click({ element: "[data-testid='add-feature-submit']", ref: "..." })
   ```

5. **Take screenshot**
   ```javascript
   browser_screenshot()
   ```

6. **Expected:**
   - Dialog should close
   - New feature should appear in Backlog column

---

## Issue Resolution Guide

### Navigation Issues

**Issue: 404 Error or Blank Page**
- **Diagnosis:** Router not configured for Electron
- **Fix:**
  1. Open `src/renderer/src/App.tsx`
  2. Verify using `createHashRouter` (not `createBrowserRouter`)
  3. Rebuild: `npm run build`
  4. Restart: `npm run dev`

**Issue: Page shows but navigation doesn't work**
- **Diagnosis:** Route paths may be wrong
- **Fix:** Check route configuration matches expected paths

### Dialog Issues

**Issue: Folder dialog doesn't open**
- **Diagnosis:** IPC handler not registered
- **Fix:**
  1. Verify `registerDialogHandlers()` in `src/main/index.ts`
  2. Check `src/main/ipc/dialog-handlers.ts` exists
  3. Restart app

**Issue: Dialog opens but selecting folder fails**
- **Diagnosis:** Path handling issue
- **Fix:** Check `dialog.showOpenDialog` return value handling

### Interview Issues

**Issue: Chat input disabled**
- **Diagnosis:** Interview session not started
- **Fix:**
  1. Check `startInterview()` is called on page mount
  2. Verify `isInterviewing` becomes true

**Issue: "Backend not available" error**
- **Diagnosis:** Not running in Electron context
- **Fix:** Run via `npm run dev` (not just opening HTML)

**Issue: AI doesn't respond**
- **Diagnosis:** Claude CLI or API not configured
- **Fix:**
  1. Go to Settings (`/#/settings`)
  2. Configure LLM provider (Claude/Gemini)
  3. Set API key OR configure CLI backend
  4. Restart app

**Issue: Requirements not extracted**
- **Diagnosis:** Backend parsing issue
- **Fix:** Check `InterviewEngine` logs in console

### State Issues

**Issue: Interview data doesn't persist**
- **Diagnosis:** LocalStorage or backend save failing
- **Fix:** Check `useInterviewPersistence` hook

**Issue: Kanban doesn't show features**
- **Diagnosis:** Feature store not populated
- **Fix:**
  1. Check `getFeatures()` IPC call
  2. Verify database has features
  3. Check `mapBackendFeature()` function

---

## Stopping Criteria

**ONLY stop the test if:**
1. Claude CLI/API is not installed and API key is required (human needs to configure)
2. Critical dependency is missing (e.g., npm packages not installed)
3. App completely fails to start (build errors)
4. Native dialog interaction required that cannot be bypassed

**DO NOT stop for:**
- UI bugs (fix them)
- Navigation issues (fix the routes)
- State management issues (fix the stores)
- Missing error handling (add it)
- Backend connection issues (check handlers and fix)

---

## Success Criteria

The test is SUCCESSFUL when:
1. [x] App launches without errors
2. [x] Genesis mode can be selected
3. [x] Interview page loads
4. [x] User can send messages in chat
5. [x] AI responds (or appropriate error shown if not configured)
6. [x] Requirements are captured (at least 3)
7. [x] Interview can be completed
8. [x] Kanban page loads
9. [x] Features/tasks are displayed (or empty state with "Add Feature" option)
10. [ ] (Optional) Manual feature creation works

---

## Final Report Template

After testing, provide:

### 1. Summary of Steps Completed
- List each phase completed
- Note any that were skipped and why

### 2. Issues Found and Fixed
| Issue | Diagnosis | Fix Applied | Verified |
|-------|-----------|-------------|----------|
| ... | ... | ... | Yes/No |

### 3. Screenshots Captured
- List each screenshot with description
- Attach or reference file paths

### 4. Remaining Issues
- List any issues that couldn't be fixed
- Note if they require human intervention

### 5. Recommendations
- Suggestions for improving the app
- Potential edge cases to test
- Performance observations

---

## Quick Reference: IPC Channels

| Action | IPC Channel | Purpose |
|--------|-------------|---------|
| Start Genesis | `mode:genesis` | Initiates genesis mode |
| Start Evolution | `mode:evolution` | Initiates evolution mode |
| Create Project | `project:initialize` | Creates new project structure |
| Load Project | `project:load` | Loads existing project |
| Open Directory Dialog | `dialog:openDirectory` | Native folder picker |
| Start Interview | `interview:start` | Starts interview session |
| Send Message | `interview:sendMessage` | Sends chat message |
| End Interview | `interview:end` | Completes interview |
| Get Features | `features:list` | Gets all features |
| Create Feature | `feature:create` | Creates new feature |
| Update Feature | `feature:update` | Updates feature |
| Get Settings | `settings:getAll` | Gets app settings |

---

## Appendix: Complete Element Reference

### Mode Selector Page (`/#/`)
```
[data-testid="genesis-card"] - Genesis mode card
[data-testid="evolution-card"] - Evolution mode card
[data-testid="project-select-{id}"] - Project selection button
```

### Project Selector Dialog
```
[data-testid="folder-select-btn"] - Folder selection button
[data-testid="cancel-btn"] - Cancel button
[data-testid="confirm-btn"] - Confirm/Create button
input#project-name - Project name input (Genesis only)
input#project-path - Path display (read-only)
```

### Interview Page (`/#/genesis`)
```
[data-testid="back-button"] - Back navigation
[data-testid="save-draft-button"] - Save draft
[data-testid="complete-button"] - Complete interview
[data-testid="chat-panel"] - Chat container
[data-testid="chat-input"] - Message input
[data-testid="send-button"] - Send message
[data-testid="ai-message"] - AI message bubble
[data-testid="user-message"] - User message bubble
[data-testid="requirements-panel"] - Requirements sidebar
[data-testid="resume-banner"] - Resume session banner
[data-testid="resume-button"] - Resume previous session
[data-testid="start-fresh-button"] - Start new interview
[data-testid="new-interview-button"] - Reset interview
[data-testid="export-button"] - Export requirements
[data-testid="interview-progress"] - Progress bar
[data-testid="interview-layout"] - Main layout
```

### Kanban Page (`/#/evolution`)
```
input[placeholder="Search features..."] - Search input
button (contains "Add Feature") - Add feature button
[data-testid="add-feature-title-input"] - Feature title
[data-testid="add-feature-description-input"] - Feature description
[data-testid="add-feature-priority-{level}"] - Priority buttons
[data-testid="add-feature-complexity-{level}"] - Complexity buttons
[data-testid="add-feature-submit"] - Submit button
```

### Settings Page (`/#/settings`)
```
[data-testid="settings-page"] - Page container
[data-testid="tab-{id}"] - Tab buttons
[data-testid="save-button"] - Save settings
[data-testid="cancel-button"] - Cancel changes
[data-testid="reset-defaults-button"] - Reset to defaults
[data-testid="api-key-input-{provider}"] - API key inputs
[data-testid="save-key-{provider}"] - Save key button
[data-testid="clear-key-{provider}"] - Clear key button
```

---

**[END OF TESTING PROMPT]**

Remember: The goal is a WORKING Nexus app. Fix issues as you encounter them, take screenshots at every step, and only stop for true blockers!
