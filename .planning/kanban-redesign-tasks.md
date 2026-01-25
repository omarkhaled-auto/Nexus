# Kanban Board Redesign - Task Breakdown

## Overview
Linear-inspired minimal redesign of the Kanban board and feature/task modals.

---

## Phase 1: Card Redesign

### Task 1.1: Update FeatureCard Base Structure
**File:** `src/renderer/src/components/kanban/FeatureCard.tsx`
**Dependencies:** None
**Description:**
- Remove CardHeader and CardContent structure
- Create minimal card layout with flex container
- Add 4px left border for priority indicator
- Remove description preview, complexity badge, task count text
- Remove GripVertical drag handle (entire card becomes draggable)
- Keep only: title (2-line clamp) + assignee avatar + progress bar

### Task 1.2: Implement Priority Bar Styling
**File:** `src/renderer/src/components/kanban/FeatureCard.tsx`
**Dependencies:** Task 1.1
**Description:**
- Add `border-l-4` with dynamic color based on priority
- Priority colors:
  - Critical: `border-l-red-500`
  - High: `border-l-orange-500`
  - Medium: `border-l-yellow-500`
  - Low: `border-l-green-500`
- Remove old priority dot indicator

### Task 1.3: Add Assignee Avatar Component
**File:** `src/renderer/src/components/kanban/FeatureCard.tsx`
**Dependencies:** Task 1.1
**Description:**
- Create small avatar circle (24px)
- Show initials if no image
- Show agent icon if agent assigned
- Position in card footer area

### Task 1.4: Add Progress Bar to Card
**File:** `src/renderer/src/components/kanban/FeatureCard.tsx`
**Dependencies:** Task 1.1
**Description:**
- Add ultra-thin progress bar (2px height) at card bottom
- Only show when progress > 0
- Use primary color for fill
- Smooth width transition

### Task 1.5: Implement Card Hover State
**File:** `src/renderer/src/components/kanban/FeatureCard.tsx`
**Dependencies:** Task 1.1
**Description:**
- Add hover transform: `translateY(-2px)`
- Add hover shadow: `shadow-md`
- Transition: 150ms ease-out
- Add `group` class for child hover states

### Task 1.6: Create CardActions Component (Hover Reveal)
**File:** `src/renderer/src/components/kanban/CardActions.tsx` (NEW)
**Dependencies:** Task 1.5
**Description:**
- Create component with Edit, Move, Delete buttons
- Position absolute top-right of card
- Hidden by default, visible on card hover (opacity transition)
- Small icon buttons (16px icons)
- Stop event propagation to prevent card click

### Task 1.7: Integrate CardActions into FeatureCard
**File:** `src/renderer/src/components/kanban/FeatureCard.tsx`
**Dependencies:** Task 1.6
**Description:**
- Import and render CardActions component
- Pass feature and action handlers as props
- Position with absolute positioning in card

---

## Phase 2: Column Redesign

### Task 2.1: Update Column Header Styling
**File:** `src/renderer/src/components/kanban/KanbanColumn.tsx`
**Dependencies:** None
**Description:**
- Change title to `text-sm font-medium text-muted-foreground`
- Change count to simple number, same styling
- Remove rounded-full background from count badge
- Show count in different color when at WIP limit

### Task 2.2: Remove Column Background
**File:** `src/renderer/src/components/kanban/KanbanColumn.tsx`
**Dependencies:** Task 2.1
**Description:**
- Remove `bg-muted/30` background
- Make column transparent
- Add subtle border-b separator line below header only

### Task 2.3: Update Drop Zone Styling
**File:** `src/renderer/src/components/kanban/KanbanColumn.tsx`
**Dependencies:** Task 2.2
**Description:**
- Remove ring-2 on drag-over
- Add dashed border on drag-over
- Add light background tint: `bg-primary/5`
- Smooth transition

### Task 2.4: Update Column Spacing
**File:** `src/renderer/src/components/kanban/KanbanColumn.tsx`, `KanbanBoard.tsx`
**Dependencies:** Task 2.3
**Description:**
- Set column gap to 24px (gap-6)
- Set card gap to 8px (space-y-2)
- Ensure min-width of 280px

---

## Phase 3: Slide-Out Panel

### Task 3.1: Create DetailPanel Base Component
**File:** `src/renderer/src/components/kanban/DetailPanel.tsx` (NEW)
**Dependencies:** None
**Description:**
- Create base panel structure with fixed right position
- Width: 600px
- Full height
- White/dark background
- Z-index above board

### Task 3.2: Implement Panel Slide Animation
**File:** `src/renderer/src/components/kanban/DetailPanel.tsx`
**Dependencies:** Task 3.1
**Description:**
- Slide in from right on open
- Duration: 200ms
- Easing: cubic-bezier(0.32, 0.72, 0, 1)
- Use Framer Motion or CSS transitions
- Add backdrop overlay (slight dim, click to close)

### Task 3.3: Create Panel Header with Inline Edit
**File:** `src/renderer/src/components/kanban/DetailPanel.tsx`
**Dependencies:** Task 3.1
**Description:**
- Add close button (X) top-right
- Add inline editable status dropdown
- Add inline editable priority dropdown
- Add title (click to edit)
- Escape key to close panel

### Task 3.4: Create Quick Info Bar
**File:** `src/renderer/src/components/kanban/DetailPanel.tsx`
**Dependencies:** Task 3.3
**Description:**
- Show assignee (clickable to change)
- Show progress bar (if applicable)
- Show created/updated dates
- Horizontal layout with dividers

### Task 3.5: Create Description Section
**File:** `src/renderer/src/components/kanban/DetailPanel.tsx`
**Dependencies:** Task 3.4
**Description:**
- Full description display
- Expandable if long (show more/less)
- Inline editing supported (click to edit)

### Task 3.6: Create Tab Navigation Component
**File:** `src/renderer/src/components/kanban/DetailPanel.tsx`
**Dependencies:** Task 3.5
**Description:**
- Horizontal tab bar
- Tabs: Overview, Dependencies, Files, Logs, History
- Active tab indicator (bottom border)
- Smooth tab switch animation

### Task 3.7: Create Overview Tab Content
**File:** `src/renderer/src/components/kanban/panel-tabs/OverviewTab.tsx` (NEW)
**Dependencies:** Task 3.6
**Description:**
- Acceptance criteria checklist
- Metadata grid (complexity, estimated time, actual time, dates)
- Errors section (if any)
- Cleaner layout than current modal

### Task 3.8: Create Dependencies Tab Content
**File:** `src/renderer/src/components/kanban/panel-tabs/DependenciesTab.tsx` (NEW)
**Dependencies:** Task 3.6
**Description:**
- Upstream dependencies list
- Downstream dependencies list
- Blocking indicator
- Cleaner cards for each dependency

### Task 3.9: Create Files Tab Content
**File:** `src/renderer/src/components/kanban/panel-tabs/FilesTab.tsx` (NEW)
**Dependencies:** Task 3.6
**Description:**
- Files to create list
- Files to modify list
- Compact list design
- Status indicators (created/modified)

### Task 3.10: Create Logs Tab Content
**File:** `src/renderer/src/components/kanban/panel-tabs/LogsTab.tsx` (NEW)
**Dependencies:** Task 3.6
**Description:**
- Real-time log display
- Level filtering
- Auto-scroll toggle
- Copy logs button
- Cleaner log entry design

### Task 3.11: Create History Tab Content
**File:** `src/renderer/src/components/kanban/panel-tabs/HistoryTab.tsx` (NEW)
**Dependencies:** Task 3.6
**Description:**
- Timeline of status changes
- Cleaner timeline design
- Status badges
- Timestamps

### Task 3.12: Create Panel Footer Actions
**File:** `src/renderer/src/components/kanban/DetailPanel.tsx`
**Dependencies:** Task 3.6
**Description:**
- Context-aware action buttons
- Left side: Skip, Reopen (secondary)
- Right side: Retry, Cancel, Start Now, Delete (primary)
- Loading states for actions

### Task 3.13: Refactor FeatureDetailModal to use DetailPanel
**File:** `src/renderer/src/components/kanban/FeatureDetailModal.tsx`
**Dependencies:** Task 3.12, Task 3.7
**Description:**
- Replace Dialog with DetailPanel
- Map feature data to panel props
- Keep delete functionality
- Add edit functionality

### Task 3.14: Refactor TaskDetailModal to use DetailPanel
**File:** `src/renderer/src/components/kanban/TaskDetailModal.tsx`
**Dependencies:** Task 3.12, Task 3.7, Task 3.8, Task 3.9, Task 3.10, Task 3.11
**Description:**
- Replace Dialog with DetailPanel
- Map task data to panel props
- Keep all action handlers
- Use all tab content components

### Task 3.15: Update KanbanBoard to use Panel
**File:** `src/renderer/src/components/kanban/KanbanBoard.tsx`
**Dependencies:** Task 3.13, Task 3.14
**Description:**
- Replace modal rendering with panel rendering
- Add slight backdrop dim when panel open
- Ensure board is still interactive when panel open

---

## Phase 4: Quick Actions System

### Task 4.1: Create CardContextMenu Component
**File:** `src/renderer/src/components/kanban/CardContextMenu.tsx` (NEW)
**Dependencies:** None
**Description:**
- Create right-click context menu component
- Use Radix UI ContextMenu
- Basic structure with menu items

### Task 4.2: Add Menu Items to CardContextMenu
**File:** `src/renderer/src/components/kanban/CardContextMenu.tsx`
**Dependencies:** Task 4.1
**Description:**
- Edit item
- Move to → submenu with all columns
- Change priority → submenu
- Change assignee → submenu (if applicable)
- Duplicate item
- Delete item (with confirmation)

### Task 4.3: Integrate CardContextMenu into FeatureCard
**File:** `src/renderer/src/components/kanban/FeatureCard.tsx`
**Dependencies:** Task 4.2
**Description:**
- Wrap card with ContextMenuTrigger
- Pass feature and handlers to context menu
- Handle menu actions

### Task 4.4: Add Move Functionality
**File:** `src/renderer/src/components/kanban/CardContextMenu.tsx`, `KanbanBoard.tsx`
**Dependencies:** Task 4.3
**Description:**
- Implement move to column action
- Call moveFeature from store
- Update UI after move

### Task 4.5: Add Priority Change Functionality
**File:** `src/renderer/src/components/kanban/CardContextMenu.tsx`
**Dependencies:** Task 4.3
**Description:**
- Implement priority change action
- Call updateFeature from store
- Update UI after change

### Task 4.6: Add Duplicate Functionality
**File:** `src/renderer/src/components/kanban/CardContextMenu.tsx`
**Dependencies:** Task 4.3
**Description:**
- Implement duplicate feature action
- Create copy with new ID
- Add to same column

---

## Phase 5: Command Palette

### Task 5.1: Create useCommandPalette Hook
**File:** `src/renderer/src/hooks/useCommandPalette.ts` (NEW)
**Dependencies:** None
**Description:**
- Listen for Cmd+K / Ctrl+K keyboard shortcut
- Manage open/close state
- Provide search state
- Handle escape to close

### Task 5.2: Create CommandPalette Base Component
**File:** `src/renderer/src/components/kanban/CommandPalette.tsx` (NEW)
**Dependencies:** Task 5.1
**Description:**
- Modal/dialog structure
- Search input at top
- Results list below
- Keyboard navigation (up/down arrows, enter to select)

### Task 5.3: Implement Feature Search
**File:** `src/renderer/src/components/kanban/CommandPalette.tsx`
**Dependencies:** Task 5.2
**Description:**
- Fuzzy search features by title/description
- Display matching features with priority indicator
- Click to open feature panel

### Task 5.4: Add Quick Actions to Command Palette
**File:** `src/renderer/src/components/kanban/CommandPalette.tsx`
**Dependencies:** Task 5.3
**Description:**
- Add "Create new feature" action
- Add "Go to backlog" action
- Add "Filter by priority" actions
- Group actions vs search results

### Task 5.5: Integrate Command Palette into KanbanBoard
**File:** `src/renderer/src/components/kanban/KanbanBoard.tsx`
**Dependencies:** Task 5.4
**Description:**
- Render CommandPalette component
- Connect to feature store
- Handle feature selection (open panel)

---

## Phase 6: Polish & Testing

### Task 6.1: Fine-tune Animations
**File:** All component files
**Dependencies:** All previous tasks
**Description:**
- Ensure all animations are 150-200ms
- Test animation smoothness
- Adjust easing curves if needed

### Task 6.2: Keyboard Accessibility
**File:** All component files
**Dependencies:** All previous tasks
**Description:**
- Ensure all interactive elements are keyboard accessible
- Tab order is logical
- Focus indicators are visible

### Task 6.3: Dark Mode Verification
**File:** All component files
**Dependencies:** All previous tasks
**Description:**
- Test all components in dark mode
- Adjust colors if needed
- Ensure contrast is sufficient

### Task 6.4: Integration Testing
**File:** N/A
**Dependencies:** All previous tasks
**Description:**
- Test drag and drop still works
- Test filtering still works
- Test all CRUD operations
- Test panel opening/closing
- Test command palette
- Test context menu actions

---

## Dependency Graph

```
Phase 1 (Cards):
1.1 → 1.2, 1.3, 1.4, 1.5
1.5 → 1.6
1.6 → 1.7

Phase 2 (Columns):
2.1 → 2.2 → 2.3 → 2.4

Phase 3 (Panel):
3.1 → 3.2
3.1 → 3.3 → 3.4 → 3.5 → 3.6
3.6 → 3.7, 3.8, 3.9, 3.10, 3.11
3.6 → 3.12
3.12 + 3.7 → 3.13
3.12 + 3.7 + 3.8 + 3.9 + 3.10 + 3.11 → 3.14
3.13 + 3.14 → 3.15

Phase 4 (Context Menu):
4.1 → 4.2 → 4.3
4.3 → 4.4, 4.5, 4.6

Phase 5 (Command Palette):
5.1 → 5.2 → 5.3 → 5.4 → 5.5

Phase 6 (Polish):
All → 6.1, 6.2, 6.3, 6.4
```

## Parallel Execution Opportunities

**Can run in parallel:**
- Phase 1 and Phase 2 (independent)
- Tasks 1.2, 1.3, 1.4 (all depend only on 1.1)
- Tasks 3.7, 3.8, 3.9, 3.10, 3.11 (all depend only on 3.6)
- Tasks 4.4, 4.5, 4.6 (all depend only on 4.3)
- Phase 4 and Phase 5 (after Phase 3 is complete)

**Must be sequential:**
- Within each task chain (1.1 → 1.5 → 1.6 → 1.7)
- Panel refactoring (3.13, 3.14, 3.15) after tab content
- Phase 6 after all others

---

## Estimated Task Counts

- **Phase 1 (Cards):** 7 tasks
- **Phase 2 (Columns):** 4 tasks
- **Phase 3 (Panel):** 15 tasks
- **Phase 4 (Context Menu):** 6 tasks
- **Phase 5 (Command Palette):** 5 tasks
- **Phase 6 (Polish):** 4 tasks

**Total:** 41 tasks
