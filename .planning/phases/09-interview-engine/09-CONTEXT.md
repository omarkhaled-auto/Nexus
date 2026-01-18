# Phase 9: Interview Engine - Context

**Gathered:** 2026-01-16
**Status:** Ready for planning

<vision>
## How This Should Work

The Interview Engine is the AI brain that powers Genesis mode. It's the backend counterpart to the UI already built in Phase 6.

**The experience:** A hybrid conversation that starts free-form to understand the big picture, then seamlessly transitions to guided questions to fill gaps. The AI naturally pivots when it senses enough context — "I understand the vision — let me ask a few specific questions about X". The user shouldn't feel like they're moving through a checklist.

**The flow:**
```
User: "I want to build a todo app"
         │
         ▼
┌─────────────────────────────────────────────────┐
│  InterviewEngine.processMessage()               │
│  ┌─────────────────────────────────────────────┐│
│  │ 1. Add message to session                   ││
│  │ 2. Call QuestionGenerator.generate()        ││
│  │ 3. Stream Claude response                   ││
│  │ 4. Call RequirementExtractor.extract()      ││
│  │ 5. Store requirements in DB                 ││
│  │ 6. Update exploredAreas                     ││
│  │ 7. Check if should suggest gaps             ││
│  │ 8. Emit interview:message event             ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
         │
         ▼
AI: "Great! Let me understand better:
     1. Personal or team todo app?
     2. Do you need due dates and reminders?
     3. Categories or tags for tasks?
     [Requirements extracted: R001, R002]"
```

**Mental model:**
- Phase 6 (Done): UI shell — how it LOOKS
- Phase 9 (Now): Engine — how it THINKS
- Phase 10 (Next): Planning — what to BUILD

</vision>

<essential>
## What Must Be Nailed

**Requirement extraction quality** — the AI's ability to turn vague descriptions into clear, actionable requirements. This is THE HERO of Phase 9. Everything else supports it.

Extraction must include:
- **Category-based tagging**: functional, non-functional, constraint, assumption
- **Priority assignment**: high, medium, low based on context
- **Confidence scoring**: 0-1 scale indicating how vague vs. clear each requirement is
- **Source traceability**: link each requirement to the message it came from
- **Area tagging**: group by domain (authentication, payments, etc.)

</essential>

<boundaries>
## What's Out of Scope

| Exclusion | Rationale |
|-----------|-----------|
| UI/frontend | Already built in Phase 6 (InterviewPage, InterviewChat, RequirementsList) |
| Scope estimation | That's Planning Engine (Phase 10) — after requirements are captured |
| Research automation | Gemini research is a "nice to have" — can add as future enhancement |
| Task decomposition | That's Phase 10 — Planning layer |
| Competitor analysis | Future enhancement, not core to extraction |

**Phase 9 = Interview Engine Backend Only**

</boundaries>

<specifics>
## Specific Ideas

### Core Components

**1. InterviewEngine (300-400 LOC)**
- Main orchestrator for interview flow
- Manages conversation state
- Coordinates between AI and storage
- Handles interview lifecycle (start, message, complete)

**2. QuestionGenerator (200-300 LOC)**
- Uses Claude to generate contextual follow-up questions
- Tracks which areas have been explored
- Suggests gaps ("You haven't mentioned authentication...")
- Progressive depth: broad → granular

**3. RequirementExtractor (200-300 LOC)**
- Parses AI responses to extract requirements
- Categorizes: functional, non-functional, constraint, assumption
- Assigns priority: high, medium, low
- Tracks confidence score per requirement
- Links to source message for traceability

**4. InterviewSessionManager (150-200 LOC)**
- Persists interview state to database
- Supports resume from checkpoint
- Auto-save every 30 seconds
- Export to RequirementsDB format

### TypeScript Interfaces

```typescript
interface InterviewSession {
  id: string;
  projectId: string;
  status: 'active' | 'paused' | 'completed';
  messages: InterviewMessage[];
  extractedRequirements: ExtractedRequirement[];
  exploredAreas: string[];
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
}

interface InterviewMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  requirementsExtracted?: string[]; // IDs of requirements from this message
}

interface ExtractedRequirement {
  id: string;
  text: string;
  category: 'functional' | 'non-functional' | 'constraint' | 'assumption';
  priority: 'high' | 'medium' | 'low';
  source: string;  // Which message it came from
  confidence: number;  // 0-1, AI confidence
  area?: string;  // e.g., "authentication", "payments"
}

interface InterviewContext {
  systemPrompt: string;
  conversationHistory: InterviewMessage[];
  extractedRequirements: ExtractedRequirement[];
  exploredAreas: string[];
  suggestedAreas: string[];
}

interface GeneratedQuestion {
  question: string;
  area: string;
  depth: 'broad' | 'detailed' | 'clarifying';
  followsUp?: string; // ID of previous message
}
```

### Events

```typescript
'interview:started'       // New session created
'interview:message'       // User or AI message added
'interview:requirement'   // New requirement extracted
'interview:area_explored' // New area marked as explored
'interview:gap_suggested' // AI suggests missing area
'interview:completed'     // User ends interview
```

### AI Prompts

**Interviewer System Prompt (config/prompts/interviewer.md):**
- Role: Expert requirements analyst
- Behavior: Ask clarifying questions, suggest gaps, summarize periodically
- Output format: Natural conversation + structured requirement tags
- Progressive depth: Start broad, go detailed per area

**Requirement Extraction Prompt:**
- Extract requirements from conversation
- Categorize each requirement
- Assign priority based on context
- Include confidence score

### Integration Points

**Dependencies (already exist):**
- ClaudeClient (from Phase 3)
- RequirementsDB (from Phase 2)
- EventBus (from Phase 1/4)
- interviewStore (from Phase 6)

**IPC Integration:**
Same pattern as Phase 6/7/8:
- preload exposes: startInterview, sendMessage, endInterview, getSession
- main handlers coordinate with InterviewEngine
- Events forwarded to renderer via IPC

### Test Expectations

~40-50 tests total:
- InterviewEngine: ~15 (lifecycle, message handling, state)
- QuestionGenerator: ~10 (context-aware generation, gaps)
- RequirementExtractor: ~10 (parsing, categorization, confidence)
- InterviewSessionManager: ~8 (persistence, resume, export)

</specifics>

<notes>
## Additional Context

**ResearchEngine** is a known future enhancement — deliberately excluded from Phase 9 to keep the phase laser-focused on extraction quality. Can be added as Phase 10.5 or a later enhancement once the core interview engine is solid.

**The user has designed most of the technical spec** — Phase 9 planning should respect this vision rather than redesign. The interfaces and flow are well thought out.

</notes>

---

*Phase: 09-interview-engine*
*Context gathered: 2026-01-16*
