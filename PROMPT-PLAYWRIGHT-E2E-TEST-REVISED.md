# Nexus E2E Test - Playwright MCP

## What You're Testing

**Nexus** is an Electron app that builds software projects using AI. You will test it by **actually using it to create a Todo App**.

**Success = Nexus creates a working Todo application**

---

## SETUP (Do This First)

### Step 1: Enable Playwright MCP

Run this command in your terminal:
```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

Then restart Claude Code or start a new session.

### Step 2: Verify Playwright MCP Works

Say: "Use Playwright MCP to navigate to google.com and take a screenshot"

If a browser opens and you see a screenshot, you're ready. If not, troubleshoot the MCP setup before continuing.

### Step 3: Start Nexus

In a separate terminal:
```bash
cd C:\Users\omars\OneDrive\Desktop\Nexus-master
npm run dev
```

Wait until you see the Electron window open. The dev server runs at `http://localhost:5173`.

---

## TESTING PHILOSOPHY

```
+------------------------------------------------------------------+
|  FIX ISSUES, DON'T JUST LOG THEM                                 |
|                                                                  |
|  When you encounter a bug:                                       |
|  1. Take a screenshot                                            |
|  2. Diagnose the root cause                                      |
|  3. FIX THE CODE                                                 |
|  4. Rebuild if needed (npm run build && npm run dev)             |
|  5. Verify the fix                                               |
|  6. Continue testing                                             |
|                                                                  |
|  ONLY STOP if you need API keys or credentials from the user.    |
+------------------------------------------------------------------+
```

---

## THE TEST

You will go through these phases. Take a screenshot after EVERY action.

### PHASE 1: Launch Verification

**Goal:** Verify Nexus app loads correctly.

1. Navigate to `http://localhost:5173`
2. Take a screenshot
3. You should see:
   - "Nexus" heading
   - A "Genesis" card (violet/purple color) - for new projects
   - An "Evolution" card (green color) - for existing projects

**If page is blank:** Check browser console for errors. The app may not be running.

**If you see 404:** The router may be wrong. Check `src/renderer/src/App.tsx` - it must use `createHashRouter`, not `createBrowserRouter`.

---

### PHASE 2: Start Genesis Mode

**Goal:** Click Genesis and get to the Interview page.

1. Click on the "Genesis" card
2. Take a screenshot
3. You might see a "Project Selector" dialog asking for folder/name - if so, click Cancel
4. Navigate directly to: `http://localhost:5173/#/genesis`
5. Take a screenshot
6. You should see:
   - An interview/chat interface
   - A chat input at the bottom
   - A requirements panel on the right (may be empty initially)

**If chat input is disabled:** The interview session may not have started. Check the console for errors.

**If you see "Backend not available":** The app isn't running in Electron context properly.

---

### PHASE 3: The Interview - Build a Todo App

**Goal:** Have a conversation with the AI to define a Todo app. You need AT LEAST 3 requirements for the Complete button to enable.

**Send these messages (wait for AI response between each):**

**Message 1:**
```
I want to build a simple Todo application using React and TypeScript. 
The app should allow users to:
- Add new todos with a title
- Mark todos as complete/incomplete  
- Delete todos
- Filter todos by status (all, active, completed)
```

Wait 15-20 seconds for AI response. Take a screenshot.

**Message 2:**
```
For the tech stack, I want:
- React 18 with functional components and hooks
- TypeScript for type safety
- Tailwind CSS for styling
- Local storage for persistence
- Vite as the build tool
```

Wait for response. Take a screenshot.

**Message 3:**
```
Additional features I'd like:
- Dark mode support
- Keyboard shortcuts (Enter to add, Escape to cancel)
- Todo count display showing "X items left"
- Clear completed button
- Responsive design that works on mobile
```

Wait for response. Take a screenshot.

**Check the requirements panel** on the right. It should show extracted requirements. You need 3+ for the Complete button to work.

**If AI doesn't respond:**
- This likely means Claude CLI is not installed or configured
- Go to Settings (`http://localhost:5173/#/settings`)
- Check if an LLM provider is configured
- If no API key/CLI is available, this is a BLOCKER - report to user

**If requirements panel stays empty:**
- The AI response parsing may be broken
- Check the InterviewEngine code in `src/main/services/InterviewEngine.ts`

---

### PHASE 4: Complete the Interview

**Goal:** Click Complete and transition to Kanban.

1. Look for the "Complete" button in the header
2. It should be enabled (not grayed out) if you have 3+ requirements
3. Click "Complete"
4. Wait 5 seconds
5. Take a screenshot
6. You should now be on the Kanban page (`/#/evolution`)

**If Complete button is disabled:** You need more requirements. Send another message describing more features.

**If clicking Complete does nothing:** Check the console for errors. The `interview:end` IPC handler may be failing.

---

### PHASE 5: Verify Kanban Board

**Goal:** See the Kanban board with your project's tasks.

1. You should see a Kanban board with columns:
   - Backlog
   - Planning  
   - In Progress
   - AI Review
   - Human Review
   - Done

2. Take a screenshot

3. There may or may not be auto-generated features. Both states are valid.

4. If empty, you'll see an "Add Feature" button - that's OK.

**If Kanban doesn't load:** Check `src/renderer/src/pages/KanbanPage.tsx` for errors.

---

### PHASE 6: Verify Project Was Created

**Goal:** Confirm Nexus created actual project files.

1. Check the project directory that was created
2. Use your terminal to explore:
   ```bash
   # Find recently created Nexus projects
   ls -la ~/Desktop/  # or wherever projects are saved
   ```

3. The project should have:
   - A `.nexus/` configuration folder
   - A `package.json` (if scaffolding ran)
   - Source files (if code generation ran)

**If no project files exist:** The project initialization may have failed. Check `ProjectInitializer.ts`.

---

## ISSUE RESOLUTION QUICK REFERENCE

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Blank page | App not running | Run `npm run dev` |
| 404 error | Wrong router | Change to `createHashRouter` in App.tsx |
| Dialog doesn't open | IPC not registered | Check `registerDialogHandlers()` in main/index.ts |
| Chat disabled | Session not started | Check `startInterview()` is called |
| No AI response | Claude CLI missing | Configure in Settings or install Claude CLI |
| Complete button disabled | <3 requirements | Send more messages to extract requirements |
| Kanban empty | No features created | This is OK - manual creation works |
| Navigation broken | Route mismatch | Check route paths in App.tsx |

---

## KEY SELECTORS

If you need to find elements, use these data-testid attributes:

**Mode Selector Page:**
- `[data-testid="genesis-card"]` - Genesis button
- `[data-testid="evolution-card"]` - Evolution button

**Interview Page:**
- `[data-testid="chat-input"]` - Message input
- `[data-testid="send-button"]` - Send button
- `[data-testid="complete-button"]` - Complete interview
- `[data-testid="requirements-panel"]` - Requirements sidebar
- `[data-testid="chat-panel"]` - Chat messages area

**Kanban Page:**
- `[data-testid="add-feature-submit"]` - Add feature button
- Column headers: Backlog, Planning, In Progress, etc.

---

## STOPPING CRITERIA

**STOP and report to user ONLY if:**
1. Claude CLI / API key is required but not configured (user must provide)
2. npm packages won't install (dependency issue)
3. Build completely fails and you can't fix it

**DO NOT STOP for:**
- UI bugs → Fix them
- Navigation issues → Fix the router
- State bugs → Fix the store
- Missing handlers → Add them
- Any fixable code issue → Fix it

---

## SUCCESS CRITERIA

The test PASSES when:

- [x] App launches
- [x] Genesis mode accessible
- [x] Interview page works
- [x] Can send messages in chat
- [x] AI responds (or clear error if not configured)
- [x] Requirements are captured
- [x] Can complete interview
- [x] Kanban page loads
- [ ] Project files created on disk

---

## FINAL REPORT

After testing, provide:

### Summary
- Phases completed: X/6
- Issues found: [list]
- Issues fixed: [list]

### Screenshots
[Reference all screenshots taken]

### Code Changes Made
```
file: path/to/file.ts
change: description of fix
```

### Blockers (if any)
- What blocked progress
- What user needs to do

### Recommendations
- Improvements for Nexus
- Edge cases to test later

---

**BEGIN TESTING**

Start by enabling Playwright MCP, then navigate to `http://localhost:5173` and proceed through each phase. Take screenshots constantly. Fix issues as you find them. Good luck!
