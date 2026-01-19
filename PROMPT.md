# Phase 17: Nexus UI Complete Redesign

## MISSION STATEMENT

Design and implement a complete UI overhaul for Nexus that reflects **every capability** of the powerful backend system. The UI must be professional, clean, and provide the **best user experience** in the AI development tool space.

**Philosophy:** "The UI should be a window into Nexus's power, not a wall hiding it."

---

## CRITICAL CONSTRAINTS

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  ⚠️  READ CAREFULLY - THESE ARE NON-NEGOTIABLE                                 ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  1. NO FUNCTIONALITY CHANGES - Backend works perfectly, don't touch logic      ║
║  2. NO BREAKING CHANGES - All 2,084+ tests must continue to pass              ║
║  3. NO BACKEND MODIFICATIONS - UI only, call existing APIs/services           ║
║  4. MINOR FIXES ALLOWED - Only if absolutely necessary and non-breaking       ║
║                                                                                ║
║  The backend is a tested, working powerhouse. Your job is to EXPOSE it,       ║
║  not change it.                                                                ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

## Project Path

```
C:\Users\Omar Khaled\OneDrive\Desktop\Nexus
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART 1: RESEARCH & EXTRACTION PHASE
# ═══════════════════════════════════════════════════════════════════════════════

## Objective

Before designing anything, you must deeply understand EVERY capability Nexus has. Extract a complete map of:
- All services and their methods
- All data models and their fields
- All events and their payloads
- All user-configurable options
- All real-time data streams

## Research Tasks

### Task R1: Extract Service Layer Capabilities

**Goal:** Map every service that the UI can call.

```bash
# Find all services
find src -name "*Service*.ts" -o -name "*service*.ts" | grep -v test | grep -v ".d.ts"

# Find all public methods in services
for file in $(find src -name "*Service*.ts" | grep -v test); do
  echo "=== $file ==="
  grep -E "^\s*(public |async |export ).*\(" "$file" | head -30
done
```

**Document in** `.agent/workspace/PHASE_17_RESEARCH/SERVICES.md`:

```markdown
# Nexus Services Map

## Interview Services
- InterviewEngine
  - startSession(): Creates new interview
  - processMessage(): Handles user input
  - extractRequirements(): Parses requirements
  - ...

## Planning Services  
- TaskDecomposer
  - decompose(): Breaks features into tasks
  - ...

## Execution Services
- AgentPool
  - ...

[Continue for ALL services]
```

### Task R2: Extract Data Models & Types

**Goal:** Understand all data structures the UI needs to display.

```bash
# Find all type definitions
find src -name "types.ts" -o -name "*.types.ts" | grep -v node_modules

# Find all interfaces
grep -rn "^export interface" src/ --include="*.ts" | grep -v test | grep -v node_modules
```

**Document in** `.agent/workspace/PHASE_17_RESEARCH/DATA_MODELS.md`:

```markdown
# Nexus Data Models

## Core Entities
- Project: { id, name, path, mode, status, ... }
- Task: { id, name, description, status, assignedAgent, ... }
- Agent: { id, type, status, currentTask, ... }

## Settings
- LLMProviderSettings: { claude, gemini, embeddings }
- ClaudeSettings: { backend, model, apiKey, ... }

[Continue for ALL models]
```

### Task R3: Extract Event System

**Goal:** Map all events the UI can subscribe to for real-time updates.

```bash
# Find EventBus usage
grep -rn "eventBus\|EventBus\|emit\|on(" src/ --include="*.ts" | grep -v test | head -50

# Find event types
grep -rn "Event\s*=" src/ --include="*.ts" | grep -v test
```

**Document in** `.agent/workspace/PHASE_17_RESEARCH/EVENTS.md`:

```markdown
# Nexus Event System

## Interview Events
- interview:started - { sessionId, timestamp }
- interview:message - { sessionId, role, content }
- interview:complete - { sessionId, requirements }

## Agent Events
- agent:spawned - { agentId, type }
- agent:working - { agentId, taskId, progress }
- agent:complete - { agentId, taskId, result }

## QA Events
- qa:build:start - { taskId }
- qa:build:complete - { taskId, success, errors }
- qa:lint:start - ...

[Continue for ALL events]
```

### Task R4: Extract Configuration Options

**Goal:** Find every setting the user can configure.

```bash
# Find settings/config types
grep -rn "Settings\|Config" src/shared/types/ --include="*.ts"
cat src/shared/types/settings.ts

# Find defaults
grep -rn "DEFAULT_" src/ --include="*.ts" | grep -v test | grep -v node_modules
```

**Document in** `.agent/workspace/PHASE_17_RESEARCH/CONFIG_OPTIONS.md`:

```markdown
# Nexus Configuration Options

## LLM Configuration
### Claude
- backend: 'cli' | 'api' (default: 'cli')
- model: string (default: 'claude-sonnet-4-5-20250929')
- Available models: [list from models.ts]
- timeout: number (default: 300000)
- maxRetries: number (default: 2)

### Gemini
- backend: 'cli' | 'api' (default: 'cli')
- model: string (default: 'gemini-2.5-flash')
- Available models: [list from models.ts]
...

## Agent Configuration
- Agent pool limits
- Per-agent model assignments

## Checkpoint Configuration
- Auto-save interval
- Max checkpoints

[Continue for ALL configurable options]
```

### Task R5: Extract Database Schema

**Goal:** Understand what data is persisted and can be displayed.

```bash
# Find database/schema files
find src -name "*schema*" -o -name "*database*" -o -name "*migration*" | grep -v node_modules

# Find table/collection definitions
grep -rn "CREATE TABLE\|createTable\|schema\." src/ --include="*.ts" | grep -v test
```

**Document in** `.agent/workspace/PHASE_17_RESEARCH/DATABASE.md`:

```markdown
# Nexus Database Schema

## Tables
### projects
- id: string (primary key)
- name: string
- path: string
- mode: 'genesis' | 'evolution'
- created_at: timestamp
- updated_at: timestamp

### tasks
- id: string (primary key)
- project_id: string (foreign key)
- name: string
- status: 'pending' | 'in_progress' | 'complete' | 'failed'
...

[Continue for ALL tables]
```

### Task R6: Extract Existing UI Components

**Goal:** Inventory current components to understand what exists and what needs redesign.

```bash
# Find all React components
find src/renderer -name "*.tsx" | grep -v test

# Find component structure
ls -la src/renderer/src/components/
ls -la src/renderer/src/pages/

# Find Zustand stores
find src -name "*store*" -o -name "*Store*" | grep -v node_modules | grep -v test
```

**Document in** `.agent/workspace/PHASE_17_RESEARCH/EXISTING_UI.md`:

```markdown
# Existing Nexus UI

## Pages
- InterviewPage.tsx - [current state description]
- KanbanPage.tsx - [current state description]
- SettingsPage.tsx - [current state description]
- DashboardPage.tsx - [if exists]

## Components
- [list all components]

## Stores (Zustand)
- settingsStore - [what it manages]
- projectStore - [if exists]
...

## Gaps Identified
- No real-time agent activity view
- No execution logs view
- Settings missing model dropdowns
...
```

### Task R7: Create Feature-to-UI Mapping

**Goal:** Create the master mapping of backend features to UI elements.

**Document in** `.agent/workspace/PHASE_17_RESEARCH/FEATURE_UI_MAP.md`:

```markdown
# Feature to UI Mapping

| Backend Feature | Current UI | Required UI | Priority |
|-----------------|------------|-------------|----------|
| InterviewEngine | InterviewPage (basic) | Enhanced chat with requirement cards | HIGH |
| TaskDecomposer | None visible | Task breakdown visualization | HIGH |
| AgentPool | Kanban (basic) | Real-time agent activity panel | HIGH |
| QA Runners | None | Build/Lint/Test/Review status cards | HIGH |
| CheckpointManager | None | Checkpoint history timeline | MEDIUM |
| MemorySystem | None | Context/memory visualization | MEDIUM |
| CLI Backend Toggle | None | Settings toggle | HIGH |
| Model Selection | Text input | Dropdown with all models | HIGH |
| Per-Agent Models | None | Agent configuration panel | MEDIUM |
...

[Map EVERY backend feature]
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART 2: NEXUS DESIGN IDENTITY
# ═══════════════════════════════════════════════════════════════════════════════

## Design Philosophy

Nexus is an **autonomous AI application builder**. The UI should convey:
- **Power** - This tool builds entire applications
- **Intelligence** - AI agents working in harmony
- **Trust** - Professional, reliable, enterprise-ready
- **Clarity** - Complex processes made understandable

## Visual Identity

### Color Palette

```
PRIMARY COLORS
==============
Background Dark:    #0D1117  (GitHub-like deep dark)
Background Card:    #161B22  (Elevated surfaces)
Background Hover:   #21262D  (Interactive states)

Accent Primary:     #7C3AED  (Nexus Purple - AI/Intelligence)
Accent Secondary:   #06B6D4  (Cyan - Technology/Speed)
Accent Success:     #10B981  (Green - Success/Complete)
Accent Warning:     #F59E0B  (Amber - Attention)
Accent Error:       #EF4444  (Red - Error/Failed)

Text Primary:       #F0F6FC  (High contrast)
Text Secondary:     #8B949E  (Muted/descriptions)
Text Tertiary:      #6E7681  (Disabled/hints)

Border Default:     #30363D  (Subtle separation)
Border Focus:       #7C3AED  (Focus states - accent)
```

### Typography

```
Font Family:        'Inter', -apple-system, BlinkMacSystemFont, sans-serif
Font Mono:          'JetBrains Mono', 'Fira Code', monospace

Headings:
  H1: 28px / 700 weight / -0.02em tracking
  H2: 22px / 600 weight / -0.01em tracking  
  H3: 18px / 600 weight / normal tracking
  H4: 16px / 500 weight / normal tracking

Body:
  Large:  16px / 400 weight / 1.6 line-height
  Normal: 14px / 400 weight / 1.5 line-height
  Small:  12px / 400 weight / 1.4 line-height

Code:
  Normal: 13px / 400 weight / 1.5 line-height
```

### Spacing System

```
Base unit: 4px

Spacing scale:
  xs:   4px   (0.25rem)
  sm:   8px   (0.5rem)
  md:   16px  (1rem)
  lg:   24px  (1.5rem)
  xl:   32px  (2rem)
  2xl:  48px  (3rem)
  3xl:  64px  (4rem)
```

### Border Radius

```
None:     0px      (Sharp edges for code blocks)
Small:    4px      (Buttons, inputs, small elements)
Medium:   8px      (Cards, panels)
Large:    12px     (Modal dialogs, large cards)
Full:     9999px   (Pills, avatars, circular elements)
```

### Shadows

```
Elevation 1:  0 1px 2px rgba(0, 0, 0, 0.3)           (Subtle lift)
Elevation 2:  0 4px 8px rgba(0, 0, 0, 0.4)           (Cards, dropdowns)
Elevation 3:  0 8px 16px rgba(0, 0, 0, 0.5)          (Modals, overlays)
Glow:         0 0 20px rgba(124, 58, 237, 0.3)       (Accent glow effect)
```

### Iconography

```
Icon Library:       Lucide React (consistent, clean)
Icon Size Small:    16px
Icon Size Normal:   20px
Icon Size Large:    24px
Icon Stroke:        1.5px (matches Inter weight)
```

---

## UI/UX Principles

### 1. Progressive Disclosure

```
DEFAULT VIEW                    EXPANDED VIEW
============                    =============
Summary card                    Full details panel
"3 tasks complete"    →         List of all tasks with details
Progress bar                    Step-by-step breakdown
                                Logs and output
```

**Implementation:**
- Every summary should be expandable
- Click/hover to reveal more
- "Show more" / "Show less" patterns
- Collapsible sections

### 2. Real-Time Feedback

```
Every action should have immediate visual feedback:

User clicks "Start"  →  Button shows loading state
                     →  Status changes to "Starting..."
                     →  Progress indicator appears
                     →  Real-time updates stream in
                     →  Completion animation
```

### 3. Information Hierarchy

```
MOST IMPORTANT (Always visible)
├── Current status
├── Active task
└── Critical errors

IMPORTANT (Visible on page)
├── Progress indicators
├── Recent activity
└── Quick actions

DETAILS (On demand)
├── Full logs
├── Configuration
└── Historical data
```

### 4. Consistent Patterns

```
CARDS - For discrete pieces of information
TABLES - For lists of similar items
PANELS - For detailed views
MODALS - For focused actions (sparingly)
TOASTS - For transient notifications
```

---

## Component Design Standards

### Buttons

```tsx
// Primary - Main actions
<Button variant="primary">Start Genesis</Button>
// Background: accent-primary, Text: white

// Secondary - Secondary actions  
<Button variant="secondary">View Details</Button>
// Background: transparent, Border: border-default, Text: text-primary

// Ghost - Tertiary actions
<Button variant="ghost">Cancel</Button>
// Background: transparent, Text: text-secondary

// Danger - Destructive actions
<Button variant="danger">Delete Project</Button>
// Background: accent-error, Text: white

// States: hover, active, disabled, loading
```

### Inputs

```tsx
// Text input with label
<Input 
  label="Project Name"
  placeholder="my-awesome-app"
  hint="Letters, numbers, and hyphens only"
  error="Name is required"
/>

// Select dropdown
<Select
  label="Claude Model"
  options={getClaudeModelList()}
  value={settings.claude.model}
  onChange={...}
/>

// Toggle switch
<Toggle
  label="Use CLI Backend"
  checked={settings.claude.backend === 'cli'}
  onChange={...}
/>
```

### Cards

```tsx
// Status card with expandable details
<StatusCard
  title="Build"
  status="success" // success | error | running | pending
  summary="Compiled successfully"
  expandable={true}
>
  <CodeBlock>{buildOutput}</CodeBlock>
</StatusCard>
```

### Agent Indicators

```tsx
// Agent status badge
<AgentBadge
  type="coder"        // planner | coder | tester | reviewer | merger
  status="working"    // idle | working | complete | error
  task="Implementing auth middleware"
/>
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3: PAGE DESIGNS
# ═══════════════════════════════════════════════════════════════════════════════

## Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Nexus Logo]   Dashboard  Projects  Settings          [?] [⚙️] [👤] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         PAGE CONTENT                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Navigation Items:**
- **Dashboard** - Overview of all projects and activity
- **Projects** - List/manage projects (Genesis & Evolution)
- **Settings** - All configuration options

**Within a Project:**
- **Overview** - Project status and summary
- **Interview** - Requirements gathering (Genesis mode)
- **Tasks** - Kanban board of all tasks
- **Agents** - Real-time agent activity
- **Execution** - Build/Test/Review logs
- **Memory** - Context and learned information
- **Settings** - Project-specific settings

---

## Page: Dashboard

**Purpose:** High-level overview of Nexus activity across all projects.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                    [+ New Project] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Active Projects │  │  Tasks Today    │  │  Agent Activity │             │
│  │       3         │  │      12         │  │    5 working    │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  Recent Projects                                              [View All →]  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🚀 my-saas-app          Genesis    ████████░░ 80%    2 agents active │  │
│  │ 🔄 legacy-refactor      Evolution  ██████████ Done   Completed today │  │
│  │ 🆕 mobile-app           Genesis    ██░░░░░░░░ 15%    Planning phase  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Live Agent Feed                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ [Coder]    Working on: auth/middleware.ts         my-saas-app        │  │
│  │ [Tester]   Running tests: 47/52 passed            my-saas-app        │  │
│  │ [Reviewer] Reviewing: database schema             mobile-app         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- Project list from database
- Task counts from TaskQueue
- Agent status from AgentPool
- Real-time updates from EventBus

---

## Page: Interview (Genesis Mode)

**Purpose:** Guided conversation to gather project requirements.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back    Interview: my-saas-app                    [Save Draft] [Complete] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────┬───────────────────────────────────┐│
│  │         CONVERSATION                │      EXTRACTED REQUIREMENTS       ││
│  │                                     │                                   ││
│  │  ┌─────────────────────────────┐   │  Requirements (7)      [Export]   ││
│  │  │ 🤖 What kind of application │   │                                   ││
│  │  │    would you like to build? │   │  ┌─────────────────────────────┐ ││
│  │  └─────────────────────────────┘   │  │ ✓ User Authentication       │ ││
│  │                                     │  │   - Email/password login    │ ││
│  │  ┌─────────────────────────────┐   │  │   - OAuth (Google, GitHub)  │ ││
│  │  │ 👤 I want to build a SaaS   │   │  │   Priority: HIGH            │ ││
│  │  │    platform for project     │   │  └─────────────────────────────┘ ││
│  │  │    management with team     │   │                                   ││
│  │  │    collaboration features   │   │  ┌─────────────────────────────┐ ││
│  │  └─────────────────────────────┘   │  │ ✓ Team Management           │ ││
│  │                                     │  │   - Create/join teams       │ ││
│  │  ┌─────────────────────────────┐   │  │   - Role-based permissions  │ ││
│  │  │ 🤖 Great! Let me understand │   │  │   Priority: HIGH            │ ││
│  │  │    the authentication...    │   │  └─────────────────────────────┘ ││
│  │  └─────────────────────────────┘   │                                   ││
│  │                                     │  ┌─────────────────────────────┐ ││
│  │  [Type your response...]     [Send] │  │ ○ Real-time Updates         │ ││
│  │                                     │  │   - WebSocket connections   │ ││
│  └─────────────────────────────────────┴───────────────────────────────────┘│
│                                                                             │
│  Interview Progress: ████████████████░░░░░░░░ 65%  ~5 questions remaining   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- InterviewEngine for conversation
- RequirementExtractor for right panel
- Real-time message events

---

## Page: Tasks (Kanban Board)

**Purpose:** Visual task management with agent assignments.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back    Tasks: my-saas-app                      [Filter ▼] [+ Add Task]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  PLANNED    │ │ IN PROGRESS │ │  IN REVIEW  │ │  COMPLETE   │           │
│  │     (5)     │ │     (3)     │ │     (2)     │ │    (12)     │           │
│  ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤           │
│  │             │ │             │ │             │ │             │           │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │           │
│  │ │ Setup   │ │ │ │ Auth    │ │ │ │ Database│ │ │ │ Init    │ │           │
│  │ │ CI/CD   │ │ │ │ System  │ │ │ │ Schema  │ │ │ │ Project │ │           │
│  │ │         │ │ │ │ ───────  │ │ │ │ ──────── │ │ │ │ ✓       │ │           │
│  │ │ 25 min  │ │ │ │ [Coder] │ │ │ │[Reviewer]│ │ │ │ 15 min  │ │           │
│  │ │ ○○○○○   │ │ │ │ ████░░  │ │ │ │ Pending │ │ │ │ ●●●●●   │ │           │
│  │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │           │
│  │             │ │             │ │             │ │             │           │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │           │
│  │ │ Payment │ │ │ │ API     │ │ │ │ User    │ │ │ │ Package │ │           │
│  │ │ Gateway │ │ │ │ Routes  │ │ │ │ Tests   │ │ │ │ Setup   │ │           │
│  │ │         │ │ │ │ ──────── │ │ │ │ ──────── │ │ │ │ ✓       │ │           │
│  │ │ 30 min  │ │ │ │ [Coder] │ │ │ │[Tester] │ │ │ │ 10 min  │ │           │
│  │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │           │
│  │             │ │             │ │             │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- TaskQueue for task list
- DependencyResolver for ordering
- AgentPool for assignments
- Real-time task status events

---

## Page: Agents (Real-Time Activity)

**Purpose:** Watch AI agents work in real-time.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back    Agent Activity: my-saas-app                          [Pause All] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Agent Pool Status                                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ [Planner]  ●  Idle      │ [Coder]    ●  Working   │ [Tester]  ●  Idle │ │
│  │ [Reviewer] ●  Working   │ [Merger]   ●  Idle      │                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────┬───────────────────────────────────────┐│
│  │      ACTIVE AGENTS              │         SELECTED AGENT DETAILS        ││
│  │                                 │                                       ││
│  │  ┌───────────────────────────┐  │  Coder Agent                         ││
│  │  │ 🔵 Coder                  │  │  ─────────────────────────────────── ││
│  │  │ Task: Auth middleware     │  │                                       ││
│  │  │ File: src/auth/index.ts   │  │  Model: claude-sonnet-4-5            ││
│  │  │ Progress: ████████░░ 75%  │  │  Task: Implementing auth middleware  ││
│  │  │ Iteration: 3/50           │  │  Files modified: 3                   ││
│  │  └───────────────────────────┘  │  Current iteration: 3 of 50 max      ││
│  │                                 │                                       ││
│  │  ┌───────────────────────────┐  │  Live Output:                        ││
│  │  │ 🟢 Reviewer               │  │  ┌─────────────────────────────────┐ ││
│  │  │ Task: Database schema     │  │  │ Creating authMiddleware.ts...  │ ││
│  │  │ Status: Analyzing code    │  │  │ Adding JWT validation...       │ ││
│  │  │ Model: gemini-2.5-pro     │  │  │ Implementing refresh tokens... │ ││
│  │  └───────────────────────────┘  │  │ Running type check...          │ ││
│  │                                 │  │ ✓ No TypeScript errors         │ ││
│  │  ┌───────────────────────────┐  │  └─────────────────────────────────┘ ││
│  │  │ ⚫ Planner (idle)         │  │                                       ││
│  │  │ ⚫ Tester (idle)          │  │  QA Status:                          ││
│  │  │ ⚫ Merger (idle)          │  │  [Build ✓] [Lint ✓] [Test ◌] [Rev ◌]││
│  │  └───────────────────────────┘  │                                       ││
│  └─────────────────────────────────┴───────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- AgentPool for agent status
- RalphStyleIterator for iteration count
- EventBus for real-time updates
- QA runners for build/lint/test/review status

---

## Page: Execution Logs

**Purpose:** Detailed view of build, lint, test, and review outputs.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back    Execution: my-saas-app                              [Clear Logs] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Build] [Lint] [Test] [Review]                        Current Task: Auth  │
│  ───────────────────────────────                                           │
│                                                                             │
│  Build Output                                              ✓ Success        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ $ tsc --noEmit                                                       │  │
│  │                                                                      │  │
│  │ Compiling 47 files...                                                │  │
│  │ ✓ src/auth/middleware.ts                                             │  │
│  │ ✓ src/auth/jwt.ts                                                    │  │
│  │ ✓ src/auth/oauth.ts                                                  │  │
│  │                                                                      │  │
│  │ Compilation complete. 0 errors.                                      │  │
│  │ Duration: 2.3s                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Lint Output                                               ✓ 0 issues      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ $ eslint src/ --ext .ts,.tsx                                         │  │
│  │                                                                      │  │
│  │ ✓ All files passed linting                                           │  │
│  │ Checked 47 files in 1.1s                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Test Output                                               ✓ 23/23 pass    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ $ vitest run                                                         │  │
│  │                                                                      │  │
│  │  ✓ auth/middleware.test.ts (8 tests)                                 │  │
│  │  ✓ auth/jwt.test.ts (10 tests)                                       │  │
│  │  ✓ auth/oauth.test.ts (5 tests)                                      │  │
│  │                                                                      │  │
│  │ Test Files  3 passed (3)                                             │  │
│  │ Tests       23 passed (23)                                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- BuildRunner output
- LintRunner output
- TestRunner output
- ReviewRunner output

---

## Page: Settings (Enhanced)

**Purpose:** Complete configuration of all Nexus options.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [LLM Providers] [Agents] [Checkpoints] [UI] [Projects]                     │
│  ────────────────                                                           │
│                                                                             │
│  Claude Configuration                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  Backend        [● CLI] [○ API]           ✓ CLI detected            │  │
│  │                                                                      │  │
│  │  Model          [claude-sonnet-4-5-20250929        ▼]               │  │
│  │                 Best balance of speed and intelligence               │  │
│  │                                                                      │  │
│  │  API Key        [••••••••••••••••••••••••] (optional for CLI)       │  │
│  │                                                                      │  │
│  │  ▼ Advanced                                                          │  │
│  │    Timeout      [300000] ms                                          │  │
│  │    Max Retries  [2]                                                  │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Gemini Configuration                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  Backend        [● CLI] [○ API]           ✓ CLI detected            │  │
│  │                                                                      │  │
│  │  Model          [gemini-2.5-flash                  ▼]               │  │
│  │                 Fast and capable - Best for production use           │  │
│  │                                                                      │  │
│  │  API Key        [••••••••••••••••••••••••] (optional for CLI)       │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Embeddings Configuration                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  Backend        [● Local] [○ OpenAI API]  ✓ No API key needed       │  │
│  │                                                                      │  │
│  │  Model          [Xenova/all-MiniLM-L6-v2           ▼]               │  │
│  │                 Fast, lightweight - 384 dimensions                   │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                                                      [Reset Defaults] [Save]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Settings: Agents Tab

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [LLM Providers] [Agents] [Checkpoints] [UI] [Projects]                     │
│                  ────────                                                   │
│                                                                             │
│  Agent Model Assignments                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  Each agent can use a different model optimized for its role.        │  │
│  │                                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐│  │
│  │  │ Agent      │ Provider  │ Model                                  ││  │
│  │  ├────────────┼───────────┼────────────────────────────────────────┤│  │
│  │  │ 🧠 Planner │ [Claude▼] │ [claude-opus-4-5-20251101          ▼] ││  │
│  │  │ 💻 Coder   │ [Claude▼] │ [claude-sonnet-4-5-20250929        ▼] ││  │
│  │  │ 🧪 Tester  │ [Claude▼] │ [claude-sonnet-4-5-20250929        ▼] ││  │
│  │  │ 👁️ Reviewer│ [Gemini▼] │ [gemini-2.5-pro                    ▼] ││  │
│  │  │ 🔀 Merger  │ [Claude▼] │ [claude-sonnet-4-5-20250929        ▼] ││  │
│  │  └─────────────────────────────────────────────────────────────────┘│  │
│  │                                                                      │  │
│  │  [Use Recommended Defaults]                                          │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Agent Pool Limits                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  Max Concurrent Agents    [5]                                        │  │
│  │  QA Iteration Limit       [50]        (escalate to human after)     │  │
│  │  Task Time Limit          [30] min    (split if exceeded)           │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                                                      [Reset Defaults] [Save]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Page: Memory/Context View (Optional - If Time Permits)

**Purpose:** Show what Nexus "knows" about the project.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back    Memory: my-saas-app                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Repository Map                                         [Refresh] [Export] │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ src/                                                                 │  │
│  │ ├── auth/                                                            │  │
│  │ │   ├── middleware.ts    [AuthMiddleware, validateJWT, refreshToken] │  │
│  │ │   ├── jwt.ts           [signToken, verifyToken, TokenPayload]      │  │
│  │ │   └── oauth.ts         [GoogleOAuth, GitHubOAuth]                  │  │
│  │ ├── api/                                                             │  │
│  │ │   ├── routes.ts        [setupRoutes, apiRouter]                    │  │
│  │ │   └── handlers/        [userHandler, teamHandler, projectHandler]  │  │
│  │ └── database/                                                        │  │
│  │     ├── schema.ts        [User, Team, Project, Task]                 │  │
│  │     └── migrations/      [001_init, 002_add_teams]                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Learned Patterns                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ • Project uses TypeScript with strict mode                           │  │
│  │ • Database: PostgreSQL with Prisma ORM                               │  │
│  │ • Auth: JWT with refresh token rotation                              │  │
│  │ • Testing: Vitest with 85% coverage requirement                      │  │
│  │ • Style: ESLint + Prettier, 2-space indentation                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART 4: EXECUTION PLAN
# ═══════════════════════════════════════════════════════════════════════════════

## Phase 17 Structure

```
PHASE 17A: RESEARCH & DESIGN SPECS (Tasks 1-7)
==============================================
Task 1: Execute all research tasks (R1-R7)
Task 2: Create complete feature-to-UI mapping
Task 3: Design component library specifications
Task 4: Create wireframes for each page
Task 5: Define all component props and states
Task 6: Document data flow for each page
Task 7: Create design spec document

PHASE 17B: FOUNDATION (Tasks 8-12)
===================================
Task 8: Set up design system (colors, typography, spacing)
Task 9: Create base components (Button, Input, Select, Toggle, Card)
Task 10: Create layout components (Sidebar, Header, Page)
Task 11: Create feedback components (Toast, Modal, Loading)
Task 12: Create agent-specific components (AgentBadge, StatusCard)

PHASE 17C: CORE PAGES (Tasks 13-22)
===================================
Task 13: Redesign Navigation and App Shell
Task 14: Redesign Dashboard Page
Task 15: TEST Dashboard with Playwright MCP (must pass before continuing)
Task 16: Redesign Interview Page
Task 17: TEST Interview with Playwright MCP (must pass before continuing)
Task 18: Redesign Tasks/Kanban Page
Task 19: TEST Tasks with Playwright MCP (must pass before continuing)
Task 20: Create Agents Activity Page
Task 21: TEST Agents with Playwright MCP (must pass before continuing)
Task 22: Create Execution Logs Page
Task 23: TEST Execution with Playwright MCP (must pass before continuing)

PHASE 17D: SETTINGS & POLISH (Tasks 24-31)
==========================================
Task 24: Redesign Settings - LLM Providers tab
Task 25: Redesign Settings - Agents tab
Task 26: Create Settings - Checkpoints tab
Task 27: Create Settings - UI Preferences tab
Task 28: TEST Settings (all tabs) with Playwright MCP (must pass before continuing)
Task 29: Add animations and micro-interactions
Task 30: Responsive design and final polish
Task 31: TEST all pages responsive design with Playwright MCP

PHASE 17E: INTEGRATION & FINAL TESTING (Tasks 32-36)
====================================================
Task 32: Connect all pages to real data
Task 33: Test all real-time updates with Playwright MCP
Task 34: Run FULL Playwright test suite (all pages)
Task 35: Visual regression testing (screenshots comparison)
Task 36: Generate final test report and documentation

[PHASE 17 COMPLETE - ALL PLAYWRIGHT TESTS MUST PASS]
```

### CRITICAL: Testing Gates

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  🚫 DO NOT proceed to the next page until Playwright tests PASS               ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  Dashboard  ──[TEST]──►  Interview  ──[TEST]──►  Tasks  ──[TEST]──►           ║
║                                                                                ║
║  Agents  ──[TEST]──►  Execution  ──[TEST]──►  Settings  ──[TEST]──►           ║
║                                                                                ║
║  Final Polish  ──[FULL TEST SUITE]──►  COMPLETE ✓                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

## Design Spec Document Template

For Task 7, create `.agent/workspace/PHASE_17_DESIGN/DESIGN_SPEC.md`:

```markdown
# Nexus UI Design Specification

## 1. Design System
### Colors
[Full color palette with hex codes and usage]

### Typography
[Font families, sizes, weights, line heights]

### Spacing
[Spacing scale with usage examples]

### Components
[List of all components with props]

## 2. Page Specifications

### Dashboard
- Purpose: [description]
- Data sources: [list]
- Components used: [list]
- User interactions: [list]
- Wireframe: [ASCII or description]

### Interview
[Same structure]

### Tasks
[Same structure]

[Continue for all pages]

## 3. Component Specifications

### Button
- Variants: primary, secondary, ghost, danger
- Sizes: sm, md, lg
- States: default, hover, active, disabled, loading
- Props: [list with types]

[Continue for all components]

## 4. Data Flow

### Real-time Updates
- EventBus subscriptions per page
- State management approach
- Optimistic updates

### API Calls
- Service methods called per page
- Loading states
- Error handling

## 5. Animations

### Micro-interactions
- Button hover/click
- Card expansion
- Status transitions

### Page Transitions
- Route changes
- Modal open/close
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART 5: IMPLEMENTATION GUIDELINES
# ═══════════════════════════════════════════════════════════════════════════════

## Code Standards

```typescript
// Component file structure
src/renderer/src/
├── components/
│   ├── ui/              // Base design system components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   └── ...
│   ├── layout/          // Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── PageLayout.tsx
│   ├── agents/          // Agent-specific components
│   │   ├── AgentBadge.tsx
│   │   ├── AgentCard.tsx
│   │   └── AgentActivity.tsx
│   └── ...
├── pages/
│   ├── DashboardPage.tsx
│   ├── InterviewPage.tsx
│   ├── TasksPage.tsx
│   ├── AgentsPage.tsx
│   ├── ExecutionPage.tsx
│   └── SettingsPage.tsx
├── stores/              // Zustand stores
│   ├── settingsStore.ts
│   ├── projectStore.ts
│   └── agentStore.ts
├── hooks/               // Custom hooks
│   ├── useEventBus.ts
│   ├── useAgent.ts
│   └── useSettings.ts
└── styles/
    └── globals.css      // Tailwind + custom styles
```

## Component Template

```tsx
// src/renderer/src/components/ui/Button.tsx

import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
          'disabled:pointer-events-none disabled:opacity-50',
          
          // Variants
          variant === 'primary' && 'bg-accent-primary text-white hover:bg-accent-primary/90',
          variant === 'secondary' && 'border border-border-default bg-transparent hover:bg-bg-hover',
          variant === 'ghost' && 'hover:bg-bg-hover',
          variant === 'danger' && 'bg-accent-error text-white hover:bg-accent-error/90',
          
          // Sizes
          size === 'sm' && 'h-8 px-3 text-sm',
          size === 'md' && 'h-10 px-4 text-sm',
          size === 'lg' && 'h-12 px-6 text-base',
          
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

## Data Fetching Pattern

```tsx
// Using custom hook for agent data
export function useAgentStatus() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const eventBus = useEventBus();
  
  useEffect(() => {
    // Initial load
    const loadAgents = async () => {
      const status = await agentPool.getStatus();
      setAgents(status);
    };
    loadAgents();
    
    // Real-time updates
    const unsubscribe = eventBus.on('agent:status', (event) => {
      setAgents(prev => prev.map(a => 
        a.id === event.agentId ? { ...a, ...event } : a
      ));
    });
    
    return () => unsubscribe();
  }, []);
  
  return agents;
}
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART 6: FREEDOM & CREATIVITY
# ═══════════════════════════════════════════════════════════════════════════════

## Ralph's Creative Freedom

While following the design system and principles above, Ralph has freedom to:

1. **Add new views** that would benefit users, as long as they:
   - Follow the Nexus design identity
   - Match the visual language of other pages
   - Expose useful backend functionality
   - Don't duplicate existing pages

2. **Enhance interactions** with:
   - Thoughtful animations
   - Helpful tooltips
   - Keyboard shortcuts
   - Context menus
   - Drag-and-drop where useful

3. **Improve information display** by:
   - Creating better visualizations
   - Adding charts/graphs where data warrants
   - Designing better status indicators
   - Creating more intuitive layouts

4. **Add quality-of-life features** like:
   - Command palette (Cmd+K)
   - Breadcrumb navigation
   - Quick actions
   - Recently visited
   - Search functionality

---

## Success Criteria

```
PHASE 17 SUCCESS CHECKLIST
==========================

Design System:
[ ] Color palette implemented consistently
[ ] Typography scale applied throughout
[ ] Spacing system used consistently
[ ] All base components created
[ ] Dark theme polished

Pages:
[ ] Dashboard - Complete with live data
[ ] Interview - Redesigned with requirement extraction
[ ] Tasks - Kanban with agent assignments
[ ] Agents - Real-time activity monitoring
[ ] Execution - Build/Lint/Test/Review logs
[ ] Settings - All configuration options exposed

Functionality:
[ ] All backend features exposed in UI
[ ] Real-time updates working
[ ] All settings configurable
[ ] Model dropdowns populated
[ ] Backend toggles working
[ ] Per-agent configuration working

Quality:
[ ] No console errors
[ ] Responsive design
[ ] Consistent interactions
[ ] Smooth animations
[ ] Professional polish

Testing:
[ ] All existing tests pass (2,084+)
[ ] UI components accessible
[ ] No breaking changes to backend
[ ] Playwright E2E tests pass for ALL pages
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART 7: PLAYWRIGHT MCP TESTING (CRITICAL)
# ═══════════════════════════════════════════════════════════════════════════════

## Why Playwright Testing is MANDATORY

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  ⚠️  CRITICAL: Every page MUST be tested with Playwright MCP                   ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  The ONLY way to guarantee a perfect UI on the first try is to:               ║
║  1. Implement the page                                                         ║
║  2. Test it with Playwright MCP                                               ║
║  3. Fix any issues found                                                       ║
║  4. Re-test until perfect                                                      ║
║                                                                                ║
║  DO NOT move to the next page until Playwright tests PASS for current page.   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

## Playwright MCP Testing Strategy

### For EACH Page, Test the Following:

```
PAGE TESTING CHECKLIST
======================

1. RENDERING
   - Page loads without errors
   - All expected components render
   - No console errors
   - No missing images/assets

2. LAYOUT
   - Correct positioning of elements
   - Responsive at different viewport sizes
   - No overlapping elements
   - Proper spacing between components

3. STYLING
   - Correct colors applied (use visual comparison)
   - Typography matches design system
   - Hover states work correctly
   - Focus states visible

4. INTERACTIVITY
   - All buttons clickable
   - All inputs focusable and typeable
   - Dropdowns open and close
   - Modals open and close
   - Toggles switch states
   - Forms submit correctly

5. DATA DISPLAY
   - Real data loads and displays
   - Loading states shown while fetching
   - Empty states shown when no data
   - Error states shown on failure

6. REAL-TIME UPDATES
   - EventBus events trigger UI updates
   - Status changes reflect immediately
   - Progress indicators update
   - Live feeds scroll/update

7. NAVIGATION
   - All links work
   - Breadcrumbs update
   - Back button works
   - Route parameters work
```

### Playwright Test Structure

Create tests in `tests/e2e/` for each page:

```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test.describe('Rendering', () => {
    test('should load without errors', async ({ page }) => {
      // Check no console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      
      await page.waitForLoadState('networkidle');
      expect(errors).toHaveLength(0);
    });

    test('should display all main sections', async ({ page }) => {
      await expect(page.locator('[data-testid="stats-cards"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-projects"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-feed"]')).toBeVisible();
    });
  });

  test.describe('Interactivity', () => {
    test('should navigate to project when clicked', async ({ page }) => {
      await page.click('[data-testid="project-card"]:first-child');
      await expect(page).toHaveURL(/\/projects\/.+/);
    });

    test('should open new project modal', async ({ page }) => {
      await page.click('[data-testid="new-project-button"]');
      await expect(page.locator('[data-testid="new-project-modal"]')).toBeVisible();
    });
  });

  test.describe('Data Display', () => {
    test('should show loading state initially', async ({ page }) => {
      // Intercept and delay API response
      await page.route('**/api/projects', async route => {
        await new Promise(r => setTimeout(r, 1000));
        await route.continue();
      });
      
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible();
    });

    test('should display project data', async ({ page }) => {
      await page.waitForSelector('[data-testid="project-card"]');
      const projectCards = await page.locator('[data-testid="project-card"]').count();
      expect(projectCards).toBeGreaterThan(0);
    });
  });
});
```

### Page-Specific Test Requirements

#### Dashboard Page Tests
```typescript
// tests/e2e/dashboard.spec.ts
- [ ] Stats cards display correct counts
- [ ] Recent projects list loads
- [ ] Project cards show correct status
- [ ] Progress bars animate correctly
- [ ] "New Project" button opens modal
- [ ] Click project navigates to project page
- [ ] Agent feed shows live updates
- [ ] "View All" link works
```

#### Interview Page Tests
```typescript
// tests/e2e/interview.spec.ts
- [ ] Chat interface loads
- [ ] Can type in message input
- [ ] Send button sends message
- [ ] AI response appears in chat
- [ ] Requirement cards extract from conversation
- [ ] Requirement cards are clickable
- [ ] Progress indicator updates
- [ ] "Complete" button enabled when ready
- [ ] Split pane resizable
- [ ] Save draft works
```

#### Tasks/Kanban Page Tests
```typescript
// tests/e2e/tasks.spec.ts
- [ ] All columns render (Planned, In Progress, Review, Complete)
- [ ] Task cards display in correct columns
- [ ] Task cards show agent assignments
- [ ] Task cards show time estimates
- [ ] Drag and drop works (if implemented)
- [ ] Click task opens detail modal
- [ ] Filter dropdown works
- [ ] "Add Task" button works
- [ ] Real-time status updates work
```

#### Agents Page Tests
```typescript
// tests/e2e/agents.spec.ts
- [ ] Agent pool status displays
- [ ] All 5 agent types shown
- [ ] Active agents highlighted
- [ ] Click agent shows details panel
- [ ] Live output streams in real-time
- [ ] QA status indicators work
- [ ] Iteration counter displays
- [ ] "Pause All" button works
- [ ] Agent status updates in real-time
```

#### Execution Page Tests
```typescript
// tests/e2e/execution.spec.ts
- [ ] Tab navigation works (Build/Lint/Test/Review)
- [ ] Code blocks render with syntax highlighting
- [ ] Success/error status icons display
- [ ] Log output scrolls
- [ ] "Clear Logs" button works
- [ ] Real-time log streaming works
- [ ] Expandable/collapsible sections work
```

#### Settings Page Tests
```typescript
// tests/e2e/settings.spec.ts

// LLM Providers Tab
- [ ] Tab navigation works
- [ ] Claude backend toggle switches
- [ ] Claude model dropdown populated with all models
- [ ] Claude model dropdown selectable
- [ ] API key input masks characters
- [ ] Gemini settings work same as Claude
- [ ] Embeddings backend toggle works
- [ ] Local embedding model dropdown works
- [ ] "Save" button saves settings
- [ ] "Reset Defaults" button works
- [ ] Settings persist after page refresh

// Agents Tab
- [ ] Agent model assignment table displays
- [ ] Provider dropdown works per agent
- [ ] Model dropdown updates based on provider
- [ ] "Use Recommended Defaults" button works
- [ ] Pool limits inputs work
- [ ] Settings save correctly

// All Tabs
- [ ] Form validation works
- [ ] Error messages display
- [ ] Success toast on save
```

### Playwright MCP Commands to Use

When testing with Playwright MCP, use these patterns:

```typescript
// Navigate to page
await mcp.playwright.navigate({ url: 'http://localhost:3000/dashboard' });

// Take screenshot for visual verification
await mcp.playwright.screenshot({ name: 'dashboard-loaded' });

// Click element
await mcp.playwright.click({ selector: '[data-testid="new-project-button"]' });

// Fill input
await mcp.playwright.fill({ 
  selector: '[data-testid="project-name-input"]', 
  value: 'My Test Project' 
});

// Select from dropdown
await mcp.playwright.selectOption({
  selector: '[data-testid="model-select"]',
  value: 'claude-sonnet-4-5-20250929'
});

// Assert element visible
await mcp.playwright.assertVisible({ selector: '[data-testid="success-toast"]' });

// Assert text content
await mcp.playwright.assertText({ 
  selector: '[data-testid="stats-total"]', 
  text: '3 Projects' 
});

// Wait for element
await mcp.playwright.waitForSelector({ 
  selector: '[data-testid="agent-card"]',
  timeout: 5000 
});
```

### Testing Workflow for Each Page

```
FOR EACH PAGE:
==============

1. IMPLEMENT PAGE
   └── Write the component code

2. ADD TEST IDS
   └── Add data-testid attributes to all interactive elements
   └── Example: <Button data-testid="submit-button">Submit</Button>

3. CREATE PLAYWRIGHT TEST FILE
   └── tests/e2e/[page-name].spec.ts
   └── Cover all checklist items

4. RUN TESTS WITH PLAYWRIGHT MCP
   └── Execute each test
   └── Take screenshots at key points
   └── Verify visual appearance

5. FIX ISSUES
   └── Address any failing tests
   └── Fix visual inconsistencies
   └── Handle edge cases

6. RE-TEST
   └── Run full test suite for page
   └── Ensure 100% pass rate

7. MOVE TO NEXT PAGE
   └── Only after current page tests pass
```

### Visual Regression Testing

For each page, capture and verify screenshots:

```typescript
test('visual regression - dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  // Full page screenshot
  await expect(page).toHaveScreenshot('dashboard-full.png');
  
  // Component screenshots
  await expect(page.locator('[data-testid="stats-cards"]'))
    .toHaveScreenshot('dashboard-stats.png');
  
  await expect(page.locator('[data-testid="agent-feed"]'))
    .toHaveScreenshot('dashboard-agent-feed.png');
});
```

### Test Data Setup

Create test fixtures for consistent testing:

```typescript
// tests/e2e/fixtures/test-data.ts
export const testProject = {
  id: 'test-project-1',
  name: 'Test Project',
  mode: 'genesis',
  status: 'in_progress',
  tasks: [
    { id: 't1', name: 'Setup', status: 'complete' },
    { id: 't2', name: 'Auth', status: 'in_progress' },
    { id: 't3', name: 'Database', status: 'planned' },
  ],
};

export const testAgents = [
  { id: 'a1', type: 'planner', status: 'idle' },
  { id: 'a2', type: 'coder', status: 'working', task: 't2' },
  { id: 'a3', type: 'tester', status: 'idle' },
  { id: 'a4', type: 'reviewer', status: 'idle' },
  { id: 'a5', type: 'merger', status: 'idle' },
];
```

### Final Test Summary

After ALL pages are tested, create a test report:

```markdown
# Phase 17 Playwright Test Report

## Test Results Summary

| Page | Tests | Passed | Failed | Screenshots |
|------|-------|--------|--------|-------------|
| Dashboard | 15 | 15 | 0 | ✓ |
| Interview | 12 | 12 | 0 | ✓ |
| Tasks | 14 | 14 | 0 | ✓ |
| Agents | 11 | 11 | 0 | ✓ |
| Execution | 9 | 9 | 0 | ✓ |
| Settings | 18 | 18 | 0 | ✓ |
| **TOTAL** | **79** | **79** | **0** | ✓ |

## Visual Regression
- All screenshots captured and verified
- No visual regressions detected

## Coverage
- All interactive elements tested
- All data display scenarios covered
- All real-time updates verified
- All navigation paths tested

## Conclusion
✅ ALL PLAYWRIGHT TESTS PASS - UI IS PRODUCTION READY
```

---

## Final Note

This UI redesign will transform Nexus from a powerful backend with a basic interface into a **professional, polished product** that matches industry leaders like Cursor while maintaining its own identity.

The goal is simple: **Make users fall in love with using Nexus.**

### Playwright Testing is NON-NEGOTIABLE

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║  The ONLY way to guarantee a perfect UI on the FIRST TRY:                     ║
║                                                                                ║
║  1. Implement page                                                             ║
║  2. Add data-testid to all interactive elements                               ║
║  3. Write Playwright tests                                                     ║
║  4. Run tests with Playwright MCP                                             ║
║  5. Fix ALL issues                                                            ║
║  6. Re-test until 100% pass                                                   ║
║  7. ONLY THEN move to next page                                               ║
║                                                                                ║
║  NO EXCEPTIONS. NO SHORTCUTS.                                                  ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

## Recommended Run Command

```
ralph run PROMPT-PHASE-17-UI-REDESIGN.md --max-iterations 400
```

**Estimated Duration:** 36-72 hours (design-first approach + comprehensive Playwright testing)

**Note:** The iteration limit is increased to 400 to account for:
- Design spec creation (Phase 17A)
- Component implementation (Phase 17B)
- Page implementation with Playwright testing after EACH page (Phase 17C-17D)
- Full integration testing (Phase 17E)

---

## Final Deliverables

```
REQUIRED OUTPUTS:
=================

1. Design System
   - src/renderer/src/styles/design-tokens.css
   - src/renderer/src/components/ui/* (all base components)

2. Pages
   - src/renderer/src/pages/* (all redesigned pages)

3. Tests
   - tests/e2e/*.spec.ts (Playwright tests for ALL pages)
   - tests/e2e/screenshots/* (visual regression baselines)

4. Documentation
   - .agent/workspace/PHASE_17_DESIGN/DESIGN_SPEC.md
   - .agent/workspace/PHASE_17_RESEARCH/*.md
   - PHASE_17_PLAYWRIGHT_TEST_REPORT.md

5. Test Report
   - All Playwright tests passing (100%)
   - Visual regression screenshots captured
   - Test coverage summary
```

---

**[BEGIN PHASE 17]**

---

## PHASE 17 PROGRESS TRACKING

### PHASE 17A: RESEARCH & DESIGN SPECS

#### Task R1: Extract Service Layer Capabilities
- **Status:** COMPLETED
- **Output:** `.agent/workspace/PHASE_17_RESEARCH/SERVICES.md`
- **Summary:** Documented all 8 service layers with public methods and UI use cases
  - Interview Services (4 classes)
  - Planning Services (3 classes)
  - Orchestration Services (3 classes)
  - Execution Services (2 classes)
  - Persistence Services (3 classes)
  - LLM Services (2 classes)
  - Infrastructure Services (2 classes)
  - Main Process Services (1 class)

#### Task R2: Extract Data Models & Types
- **Status:** COMPLETED
- **Output:** `.agent/workspace/PHASE_17_RESEARCH/DATA_MODELS.md`
- **Summary:** Comprehensive documentation of all 50+ interfaces and types:
  - Core Domain Types (8 interfaces): Project, Feature, Requirement, InterviewSession, etc.
  - Task Types (6 interfaces): Task, TaskResult, QAResult, QAStepResult, etc.
  - Agent Types (4 interfaces): Agent, AgentMetrics, AgentModelConfig, etc.
  - Settings Types (12 interfaces): NexusSettings, LLMSettings, AgentSettings, etc.
  - LLM Types (10 interfaces): Message, LLMResponse, TokenUsage, StreamChunk, etc.
  - Orchestration Types (8 interfaces): CoordinatorStatus, ProjectProgress, PoolAgent, etc.
  - Planning Types (6 interfaces): PlanningTask, Wave, DecompositionResult, etc.
  - Interview Types (6 interfaces): InterviewMessage, ExtractedRequirement, etc.
  - UI-Specific Types (5 interfaces): Feature (Kanban), ColumnCounts, etc.
  - Model Configuration: All Claude, Gemini, and embedding models with helper functions

#### Task R3: Extract Event System
- **Status:** COMPLETED
- **Output:** `.agent/workspace/PHASE_17_RESEARCH/EVENTS.md`
- **Summary:** Comprehensive documentation of the complete event system:
  - EventBus Architecture: Singleton pattern, type-safe emission/subscription, wildcard support
  - 52 Event Types across 8 categories:
    - Project Events (8): created, updated, status-changed, completed, failed, paused, resumed, deleted
    - Feature Events (6): created, updated, status-changed, completed, failed, deleted
    - Task Events (10): created, queued, assigned, started, progress, qa-iteration, completed, failed, blocked, escalated
    - Agent Events (8): spawned, assigned, started, progress, idle, error, terminated, metrics-updated
    - QA Events (6): build-started, build-completed, lint-completed, test-completed, review-completed, loop-completed
    - Interview Events (7): started, question-asked, requirement-captured, category-completed, completed, cancelled, saved
    - Human Review Events (3): requested, approved, rejected
    - System Events (4): checkpoint-created, checkpoint-restored, error, warning
  - IPC Event Forwarding: Main→Renderer via timeline:event, agent:metrics, task:updated channels
  - Preload API: emitEvent, onTimelineEvent, onAgentMetrics, onTaskUpdated
  - UI Integration Patterns with React hooks examples

#### Task R4: Extract Configuration Options
- **Status:** COMPLETED
- **Output:** `.agent/workspace/PHASE_17_RESEARCH/CONFIG_OPTIONS.md`
- **Summary:** Comprehensive documentation of all 100+ configurable options across:
  - LLM Configuration (3 providers: Claude, Gemini, Embeddings)
    - Backend selection (CLI vs API, Local vs API)
    - Model selection with 5 Claude and 5 Gemini models
    - Timeout, retries, and advanced options
  - Agent Configuration
    - Pool limits, timeouts, retry settings
    - Per-agent type model assignments (coder, tester, reviewer, merger, architect, debugger, documenter)
  - Checkpoint Configuration
    - Auto-checkpoint settings with intervals
    - Max checkpoints, feature completion triggers
  - UI Settings
    - Theme (light/dark/system), notifications, sidebar width
  - Project Settings
    - Default language, test framework, output directory
  - QA Configuration (config file only)
    - Build/lint/test timeouts, auto-fix lint
  - Iteration Configuration (config file only)
    - Max iterations, commit behavior
  - Model Constants
    - All Claude models (5), Gemini models (5), embedding models (7)
    - Pricing info, agent role assignments
  - Configuration Priority System (config file > settings UI > env vars > defaults)

#### Task R5: Extract Database Schema
- **Status:** COMPLETED
- **Output:** `.agent/workspace/PHASE_17_RESEARCH/DATABASE.md`
- **Summary:** Comprehensive documentation of the complete SQLite/Drizzle ORM database schema:
  - Database Technology: SQLite with better-sqlite3, Drizzle ORM, WAL mode
  - 12 Tables documented with full column definitions:
    1. `projects` - Core project metadata (mode, status, settings)
    2. `features` - High-level features with MoSCoW prioritization
    3. `sub_features` - Sub-components for finer granularity
    4. `tasks` - Individual work items with QA iterations, dependencies, agent assignments
    5. `agents` - AI agent instances with model configs, metrics
    6. `checkpoints` - Project state snapshots for recovery
    7. `requirements` - Extracted requirements from interviews
    8. `metrics` - Performance and usage tracking
    9. `sessions` - Interview and interaction history
    10. `episodes` - Episodic memory for AI learning
    11. `continue_points` - Save points for resuming interrupted work
    12. `code_chunks` - Semantic code search with vector embeddings
  - 6 Migrations documented (0000-0005)
  - Entity Relationship Diagram
  - Type exports for TypeScript
  - Status value enums (Project, Task, Agent, Session)
  - UI integration points for each page

#### Task R6: Extract Existing UI Components
- **Status:** COMPLETED
- **Output:** `.agent/workspace/PHASE_17_RESEARCH/EXISTING_UI.md`
- **Summary:** Complete inventory of the existing Nexus UI structure:
  - **Technology Stack:** React 18, React Router v7, Zustand, Tailwind CSS, Radix UI, Lucide icons
  - **Pages (5):**
    1. ModeSelectorPage (`/`) - Landing with Genesis/Evolution cards
    2. InterviewPage (`/genesis`) - Split-screen chat + requirements
    3. KanbanPage (`/evolution`) - 6-column feature board
    4. DashboardPage (`/dashboard`) - Real-time metrics + timeline
    5. SettingsPage (`/settings`) - 5-tab configuration interface
  - **Component Categories:**
    - Layout: RootLayout, AnimatedPage
    - UI Base: Button, Card, Dialog, ScrollArea, Skeleton, Spinner, EmptyState
    - Dashboard: CostTracker, OverviewCards, ProgressChart, AgentActivity, TaskTimeline
    - Interview: InterviewLayout, ChatPanel, RequirementsSidebar, CategorySection, RequirementCard
    - Kanban: KanbanBoard, KanbanColumn, KanbanHeader, FeatureCard, FeatureDetailModal
    - Checkpoints: CheckpointList, ReviewModal
  - **Stores (8):**
    - settingsStore - Settings with IPC sync
    - projectStore - Project/mode state
    - agentStore - Agent status tracking
    - interviewStore - Interview messages/requirements
    - featureStore - Kanban features (WIP limit: 3)
    - metricsStore - Dashboard metrics/timeline
    - taskStore - Task management
    - uiStore - UI state
  - **Gaps Identified:**
    - Missing Pages: Agents, Execution, Memory
    - Missing in Settings: Model dropdowns, backend toggles, per-agent config
    - Missing Components: AgentBadge, StatusCard, CodeBlock, Toggle, CommandPalette
    - Missing Functionality: Real-time EventBus connection, notifications

#### Task R7: Create Feature-to-UI Mapping
- **Status:** COMPLETED
- **Output:** `.agent/workspace/PHASE_17_RESEARCH/FEATURE_UI_MAP.md`
- **Summary:** Master mapping of ALL 110 backend features to UI elements:
  - Coverage Statistics: Only 34 features (31%) currently exposed in UI
  - Critical Gaps Identified:
    1. No Agents Page - Cannot monitor agent activity or live output
    2. No Execution Page - Cannot view build/lint/test/review results
    3. Settings Incomplete - Missing model dropdowns, backend toggles, per-agent config
    4. No Real-time Updates - UI doesn't subscribe to EventBus
    5. No QA Status Display - Cannot see QA pipeline status
  - Module-by-Module Feature Mapping:
    - Interview & Requirements: 15 features, 8 exposed (53%)
    - Planning & Decomposition: 12 features, 3 exposed (25%)
    - Orchestration: 10 features, 2 exposed (20%)
    - Agent Pool: 8 features, 4 exposed (50%)
    - Execution/QA: 14 features, 0 exposed (0%) - CRITICAL GAP
    - Persistence: 12 features, 3 exposed (25%)
    - LLM Provider: 8 features, 2 exposed (25%)
    - Settings: 25 features, 12 exposed (48%)
    - Infrastructure: 6 features, 0 exposed (0%)
  - Priority Matrix: 20 HIGH, 13 MEDIUM, 10 LOW priority features
  - Implementation Roadmap aligned with Phase 17 tasks

---

### PHASE 17A RESEARCH COMPLETE

All 7 research tasks have been completed. Documentation created:
- `.agent/workspace/PHASE_17_RESEARCH/SERVICES.md` - Service layer capabilities
- `.agent/workspace/PHASE_17_RESEARCH/DATA_MODELS.md` - All 50+ interfaces and types
- `.agent/workspace/PHASE_17_RESEARCH/EVENTS.md` - 52 event types across 8 categories
- `.agent/workspace/PHASE_17_RESEARCH/CONFIG_OPTIONS.md` - 100+ configurable options
- `.agent/workspace/PHASE_17_RESEARCH/DATABASE.md` - 12 database tables with full schema
- `.agent/workspace/PHASE_17_RESEARCH/EXISTING_UI.md` - Current UI inventory and gaps
- `.agent/workspace/PHASE_17_RESEARCH/FEATURE_UI_MAP.md` - Master feature-to-UI mapping

**NEXT:** Proceed to Task 2 - Create complete feature-to-UI mapping (already done as R7)
**ACTUAL NEXT:** Task 3 - Design component library specifications

#### Task 3: Design Component Library Specifications
- **Status:** COMPLETED
- **Output:** `.agent/workspace/PHASE_17_DESIGN/COMPONENT_LIBRARY.md`
- **Summary:** Comprehensive component library specification with 70+ components:
  - **Design Tokens:** Colors (35 tokens), Typography (18 tokens), Spacing (14 tokens), Border Radius (6 tokens), Shadows (7 tokens)
  - **Base Components (5):** Button, IconButton, Badge, Avatar, Tooltip
  - **Form Components (8):** Input, Textarea, Select, Toggle, Checkbox, Radio, Slider, FormField
  - **Feedback Components (7):** Modal, Toast, Alert, Progress, Spinner, Skeleton, EmptyState
  - **Layout Components (6):** Card, Tabs, Accordion, Divider, ScrollArea, Resizable
  - **Navigation Components (4):** Sidebar, Header, Breadcrumbs, CommandPalette
  - **Data Display Components (6):** Table, List, CodeBlock, Terminal, Stat, Timeline
  - **Agent Components (6):** AgentBadge, AgentCard, AgentActivity, AgentPoolStatus, QAStatusPanel, IterationCounter
  - **Page-Specific Components (~25):** Interview, Kanban, Dashboard, Settings, Execution
  - **Utility Components (5):** VisuallyHidden, ErrorBoundary, ThemeProvider, VirtualizedList, Portal
  - All components include TypeScript interfaces, accessibility requirements, and data-testid specs for Playwright testing

#### Task 4: Create Wireframes for Each Page
- **Status:** COMPLETED
- **Output:** `.agent/workspace/PHASE_17_DESIGN/WIREFRAMES.md`
- **Summary:** Comprehensive wireframe document covering all 7+ pages:
  - App Shell & Navigation: Header structure, navigation items, dropdown menus
  - Dashboard Page: Stats row, recent projects, agent feed, activity timeline
  - Interview Page: Split-pane chat + requirements panel, progress bar
  - Tasks/Kanban Page: 4-column board, task cards, task detail modal
  - Agents Page: Agent pool status, active agents list, agent details panel with live output
  - Execution Page: Tab navigation (Build/Lint/Test/Review), code blocks, accordion sections
  - Settings Page: LLM Providers tab, Agents tab with model assignments table
  - Memory Page (Optional): Repository map, learned patterns, semantic context
  - Responsive Breakpoints: Desktop, tablet, mobile layouts for each page
  - Animation Specifications: Page transitions, component animations, loading states
  - Interaction States: Focus, loading, error, and empty states
  - Complete data-testid mapping for Playwright testing

#### Task 5: Define All Component Props and States
- **Status:** COMPLETED
- **Output:** `.agent/workspace/PHASE_17_DESIGN/COMPONENT_PROPS_STATES.md`
- **Summary:** Comprehensive TypeScript interface definitions for all UI components:
  - **Base Components (5):** Button, IconButton, Badge, Avatar, Tooltip - Full props with variants, sizes, states
  - **Form Components (8):** Input, Textarea, Select, Toggle, Checkbox, Radio, Slider, FormField - Complete form handling
  - **Feedback Components (7):** Modal, Toast, Alert, Progress, Spinner, Skeleton, EmptyState - All feedback patterns
  - **Layout Components (6):** Card, Tabs, Accordion, Divider, ScrollArea, Resizable - Layout building blocks
  - **Navigation Components (4):** Sidebar, Header, Breadcrumbs, CommandPalette - Navigation patterns
  - **Data Display Components (6):** Table, List, CodeBlock, Terminal, Stat, Timeline - Data visualization
  - **Agent Components (6):** AgentBadge, AgentCard, AgentActivity, AgentPoolStatus, QAStatusPanel, IterationCounter
  - **Page-Specific Components (18):** Interview (4), Kanban (3), Dashboard (3), Settings (5), Execution (3)
  - **Zustand Stores (5):** Settings, Project, Agent, Interview, Task - Complete state management
  - **Custom Hooks (7):** useEventBus, useAgent, useSettings, useRealTimeUpdates, useLocalStorage, useMediaQuery, useDebounce
  - All interfaces include JSDoc documentation, internal state definitions, ref forwarding patterns, and default values


#### Task 6: Document Data Flow for Each Page
- **Status:** COMPLETED
- **Output:** `.agent/workspace/PHASE_17_DESIGN/DATA_FLOW.md`
- **Summary:** Comprehensive data flow documentation covering all UI pages:
  - **Architecture Overview:** Data layer architecture diagram, communication channels (IPC), update patterns
  - **Data Flow Patterns:** 3 core patterns (Initial Load + Subscription, Form Submission with Optimistic Update, Streaming Data)
  - **Dashboard Page:** Stats queries, recent projects, live agent feed, event subscriptions (project/task/agent events)
  - **Interview Page:** Session management, message flow sequence, requirement extraction pipeline, progress tracking
  - **Tasks/Kanban Page:** Column organization, drag-and-drop flow, real-time task status updates, filter state
  - **Agents Page:** Pool status, agent selection, output streaming strategy with batching, QA status tracking
  - **Execution Page:** Tab-based log viewing, QA event integration, test result parsing
  - **Settings Page:** Form state management, validation rules, secure key handling, tab navigation
  - **Memory Page (Optional):** Repo map, episodes, semantic search
  - **Global Data Flow:** App-wide event subscriptions, navigation-based data loading, cross-page state sync
  - **IPC Channels:** All `window.nexus.invoke()` and `window.nexus.on()` calls documented per page
  - **State Management Strategy:** Zustand stores, local state, event subscriptions, optimistic updates
  - **Performance Considerations:** Batching, virtualization, lazy loading, memoization, debouncing

**NEXT:** Task 7 - Create design spec document (consolidating all research into final spec)

