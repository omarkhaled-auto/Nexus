# Phase 9: Interview Engine - Research

**Researched:** 2026-01-16
**Domain:** LLM-based conversational requirement extraction
**Confidence:** HIGH

<research_summary>
## Summary

Researched patterns for building an AI-powered interview engine that extracts structured requirements from natural conversation. The domain is well-established with Claude's structured output capabilities, XML tag extraction, and chain-of-thought prompting.

**Key finding:** The codebase already has strong foundations:
- `ClaudeClient` (Phase 3) with streaming, tools, retry logic
- `RequirementsDB` (Phase 2) with 6 categories, MoSCoW priorities, confidence scores
- `interviewStore` (Phase 6) with Zustand state, event emission
- `AgentRunner` pattern for tool loops

**Primary recommendation:** Build InterviewEngine following AgentRunner patterns but adapted for conversational flow. Use XML tags for structured extraction (`<requirement>`, `<category>`, `<confidence>`), chain-of-thought for reasoning, and JSON output for machine parsing.

</research_summary>

<standard_stack>
## Standard Stack

### Core (Already Exists)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| @anthropic-ai/sdk | latest | Claude API client | ✅ ClaudeClient exists |
| better-sqlite3 | 11.x | Database persistence | ✅ RequirementsDB exists |
| zustand | 5.x | Frontend state | ✅ interviewStore exists |
| nanoid | 5.x | ID generation | ✅ Already used |
| drizzle-orm | 0.39.x | Database ORM | ✅ Already used |

### Supporting (Already Exists)
| Library | Purpose | Status |
|---------|---------|--------|
| EventBus | Cross-layer events | ✅ Phase 4 |
| zod | Schema validation | ✅ Already used in RequirementsDB |

### No New Dependencies Required
Phase 9 builds on existing infrastructure. No new npm packages needed.

**Installation:** None required - leverage existing stack.

</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/interview/
├── InterviewEngine.ts       # Main orchestrator (300-400 LOC)
├── InterviewEngine.test.ts  # ~15 tests
├── QuestionGenerator.ts     # Contextual follow-ups (200-300 LOC)
├── QuestionGenerator.test.ts # ~10 tests
├── RequirementExtractor.ts  # THE HERO - extraction (200-300 LOC)
├── RequirementExtractor.test.ts # ~10 tests
├── InterviewSessionManager.ts # Persistence (150-200 LOC)
├── InterviewSessionManager.test.ts # ~8 tests
├── prompts/
│   ├── interviewer.ts       # System prompt for interview
│   └── extractor.ts         # Extraction prompt
├── types.ts                 # Interview-specific types
└── index.ts                 # Barrel export
```

### Pattern 1: XML Tags for Structured Extraction
**What:** Use XML tags in prompts to get structured, parseable output
**When to use:** Extracting multiple fields from free-form conversation
**Source:** [Anthropic Courses](https://github.com/anthropics/courses)

```typescript
// Extraction prompt pattern from Anthropic Cookbook
const EXTRACTION_PROMPT = `
Analyze the conversation and extract requirements.

For each requirement found, output in this format:
<requirement>
  <text>The requirement description</text>
  <category>functional|non_functional|technical|constraint|assumption</category>
  <priority>must|should|could|wont</priority>
  <confidence>0.0-1.0</confidence>
  <area>authentication|payments|ui|etc</area>
</requirement>

Before extracting, analyze in <thinking> tags.
Then provide requirements in <requirements> tags.
`;
```

### Pattern 2: Chain-of-Thought for Interview Flow
**What:** Let Claude reason about what questions to ask next
**When to use:** Determining conversation flow and gap detection
**Source:** [Anthropic Cookbook - Classification](https://github.com/anthropics/anthropic-cookbook)

```typescript
const QUESTION_GENERATION_PROMPT = `
Given the conversation so far and extracted requirements, determine:

<thinking>
1. What areas have been explored?
2. What areas are missing?
3. What needs clarification?
4. What depth is appropriate next?
</thinking>

<next_question>
  <question>Your question here</question>
  <area>The area this explores</area>
  <depth>broad|detailed|clarifying</depth>
</next_question>
`;
```

### Pattern 3: Conversational State Machine
**What:** Track interview stage and explored areas
**When to use:** Managing hybrid interview flow (free-form → guided)
**Matches existing:** `InterviewStage` type already defines 7 stages

```typescript
interface InterviewState {
  stage: InterviewStage;
  exploredAreas: Set<string>;
  suggestedAreas: string[];
  requirementCount: number;
}

// Transition logic
function shouldTransitionToGuided(state: InterviewState): boolean {
  // Transition when enough context gathered
  return state.requirementCount >= 3 && state.exploredAreas.size >= 2;
}
```

### Pattern 4: AgentRunner-Style Tool Loop (Adapted)
**What:** Iterative conversation loop similar to AgentRunner
**When to use:** Processing messages until interview complete
**Source:** Existing `AgentRunner.ts` pattern

```typescript
// Similar to AgentRunner but for conversation
async processMessage(userMessage: string): Promise<InterviewResponse> {
  // 1. Add to session
  this.session.messages.push({ role: 'user', content: userMessage });

  // 2. Build messages for LLM
  const messages = this.buildMessages();

  // 3. Call Claude
  const response = await this.llmClient.chat(messages, this.chatOptions);

  // 4. Extract requirements from response
  const extracted = await this.extractor.extract(response.content);

  // 5. Store extracted requirements
  for (const req of extracted) {
    await this.requirementsDB.addRequirement(this.projectId, req);
  }

  // 6. Update explored areas
  this.updateExploredAreas(extracted);

  // 7. Emit events
  this.eventBus.emit('interview:message', { ... });

  return { content: response.content, extracted };
}
```

### Anti-Patterns to Avoid
- **Over-prompting:** Don't include every possible category in system prompt - let Claude infer
- **Strict state machine:** Don't force rigid stage transitions - let conversation flow naturally
- **Blocking extraction:** Don't wait for extraction before responding - can run in parallel
- **Manual JSON parsing:** Use XML tags with clear delimiters, parse with regex or simple string ops

</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Requirement categorization | Custom NLP classifier | Claude with XML tags | Claude understands context better than rules |
| Confidence scoring | Heuristic-based scoring | Claude's self-assessment | Model knows its own uncertainty |
| Similarity detection | Custom string matching | Existing `calculateSimilarity` in RequirementsDB | Already handles Jaccard similarity |
| Session persistence | Custom file format | Existing SQLite + Drizzle | Schema already supports requirements |
| Event emission | Custom pub/sub | Existing EventBus | Already integrated across codebase |
| ID generation | Custom UUID | `nanoid` | Already used throughout codebase |

**Key insight:** Phase 9 is about orchestration, not infrastructure. The building blocks exist — focus on wiring them together correctly.

</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Hallucinated Requirements
**What goes wrong:** Claude invents requirements not mentioned by user
**Why it happens:** LLM tries to be helpful by inferring unstated needs
**How to avoid:**
- Include "Only extract requirements explicitly stated" in prompt
- Add confidence score threshold (0.7+) for storage
- Source traceability - link to exact message
**Warning signs:** Requirements that seem generic or don't map to user messages

### Pitfall 2: Category Mismatch
**What goes wrong:** Extraction uses different categories than storage
**Why it happens:** Two separate category systems (interview.ts vs RequirementsDB)
**How to avoid:**
- Map interview categories to RequirementsDB categories on extraction
- Use single source of truth for category enum
- Current mapping needed:
  - `functional` → `functional`
  - `non_functional` → `non-functional`
  - `technical` → `technical`
  - `constraint` → matches existing `constraint` concept
  - `user_story` → `functional` with userStories field
  - `assumption` → needs explicit handling
**Warning signs:** Requirements with invalid categories rejected by DB

### Pitfall 3: Context Window Overflow
**What goes wrong:** Long interviews exceed Claude's context
**Why it happens:** Full conversation history sent every message
**How to avoid:**
- Summarize older messages instead of sending full history
- Keep recent N messages verbatim + summary of earlier
- Track token count, compress when approaching limit
**Warning signs:** API errors about context length, degraded extraction quality

### Pitfall 4: Extraction Blocking Response
**What goes wrong:** User waits for extraction before seeing AI response
**Why it happens:** Sequential: respond → extract → return
**How to avoid:**
- Stream response to user immediately
- Run extraction in parallel or after streaming
- Use streaming events to update UI progressively
**Warning signs:** Slow perceived response time despite fast API

### Pitfall 5: Lost Session State
**What goes wrong:** Interview lost on app restart
**Why it happens:** State only in memory (Zustand), not persisted
**How to avoid:**
- InterviewSessionManager auto-saves to DB every 30s
- Resume from checkpoint on restart
- Track `lastActivityAt` for recovery
**Warning signs:** Users losing progress, frustrated re-starts

</common_pitfalls>

<code_examples>
## Code Examples

### XML Tag Extraction Pattern
```typescript
// Source: Anthropic Courses - real_world_prompting
function extractRequirements(response: string): ExtractedRequirement[] {
  const requirements: ExtractedRequirement[] = [];

  // Match all <requirement> blocks
  const reqRegex = /<requirement>([\s\S]*?)<\/requirement>/g;
  let match;

  while ((match = reqRegex.exec(response)) !== null) {
    const block = match[1];

    // Extract individual fields
    const text = extractTag(block, 'text');
    const category = extractTag(block, 'category') as RequirementCategory;
    const priority = extractTag(block, 'priority') as RequirementPriority;
    const confidence = parseFloat(extractTag(block, 'confidence') || '0.5');
    const area = extractTag(block, 'area');

    if (text && category) {
      requirements.push({
        id: nanoid(),
        text,
        category,
        priority: priority || 'should',
        confidence,
        area,
        source: 'current_message_id', // Set by caller
      });
    }
  }

  return requirements;
}

function extractTag(content: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}
```

### Interviewer System Prompt
```typescript
// Source: Pattern from Anthropic Cookbook classification guide
const INTERVIEWER_SYSTEM_PROMPT = `You are an expert requirements analyst conducting a discovery interview.

Your role:
- Ask clarifying questions to understand the user's vision
- Extract clear, actionable requirements from their descriptions
- Identify gaps and suggest areas to explore
- Maintain a conversational, non-interrogative tone

Behavior:
- Start broad, go detailed per area
- Summarize periodically to confirm understanding
- Suggest missing areas ("You haven't mentioned authentication...")
- Be adaptive - follow the user's thread

For each message, you may extract requirements. Use this format:
<requirements>
<requirement>
  <text>Clear description of the requirement</text>
  <category>functional|non_functional|technical|constraint|assumption</category>
  <priority>must|should|could|wont</priority>
  <confidence>0.0-1.0 (how certain you are this is a real requirement)</confidence>
  <area>domain area like "authentication", "payments", "ui"</area>
</requirement>
</requirements>

Only extract requirements the user explicitly stated or clearly implied.
Do NOT invent requirements or assume features not mentioned.

After requirements (if any), continue the natural conversation.`;
```

### Session Auto-Save Pattern
```typescript
// Source: Common persistence pattern
class InterviewSessionManager {
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private readonly SAVE_INTERVAL = 30000; // 30 seconds

  startAutoSave(session: InterviewSession): void {
    this.autoSaveInterval = setInterval(() => {
      void this.save(session);
    }, this.SAVE_INTERVAL);
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  async save(session: InterviewSession): Promise<void> {
    session.lastActivityAt = new Date();
    await this.db.upsertSession(session);
    this.eventBus.emit('interview:saved', { sessionId: session.id });
  }

  async resume(sessionId: string): Promise<InterviewSession | null> {
    return this.db.getSession(sessionId);
  }
}
```

### Gap Detection Pattern
```typescript
// Source: Pattern derived from CONTEXT.md vision
const STANDARD_AREAS = [
  'authentication',
  'authorization',
  'data_model',
  'api',
  'ui_ux',
  'performance',
  'security',
  'integrations',
  'deployment'
];

function detectGaps(exploredAreas: string[]): string[] {
  const explored = new Set(exploredAreas.map(a => a.toLowerCase()));
  return STANDARD_AREAS.filter(area => !explored.has(area));
}

function generateGapPrompt(gaps: string[]): string {
  if (gaps.length === 0) return '';

  const topGaps = gaps.slice(0, 3);
  return `\n\nNote: Areas not yet discussed: ${topGaps.join(', ')}. Consider asking about these if relevant.`;
}
```

</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON-only output | XML tags + JSON | 2024 | More reliable extraction, easier parsing |
| Rigid interview stages | Hybrid free-form→guided | 2024 | Better user experience, more natural |
| Separate extraction call | Inline extraction | 2024 | Reduced latency, single API call |
| Manual confidence | Self-assessed confidence | 2025 | Better calibration from Claude |

**New tools/patterns to consider:**
- **Prompt Caching:** Cache system prompt for ~90% cost reduction on repeat calls
- **Streaming + Extraction:** Stream response while extracting in parallel
- **Extended Thinking:** For complex requirement analysis (already supported in ClaudeClient)

**Research findings:**
- [LLMs for Requirements Engineering Survey](https://arxiv.org/html/2509.11446v1): Zero-shot (44%) and Few-shot (29%) prompting dominate. GPT-based models lead (90%), but alternatives growing.
- [Requirement-Driven Prompt Engineering](https://dl.acm.org/doi/full/10.1145/3731756): Quality of extraction depends heavily on prompt structure.

**Deprecated/outdated:**
- **Function calling for extraction:** XML tags more reliable for multi-field extraction
- **Separate NLP classifier:** LLMs handle categorization better with context

</sota_updates>

<open_questions>
## Open Questions

1. **Category Mapping**
   - What we know: Two category systems exist (interview.ts has 5, RequirementsDB has 6)
   - What's unclear: Best mapping strategy, especially for "assumption"
   - Recommendation: Define explicit mapping in RequirementExtractor, add `assumption` to RequirementsDB if needed

2. **Session Storage Schema**
   - What we know: RequirementsDB exists, but no interview session table
   - What's unclear: Should sessions use existing tables or new schema?
   - Recommendation: Create `interview_sessions` table or store in project `settings` JSON field

3. **Streaming vs Complete**
   - What we know: ClaudeClient supports both streaming and complete
   - What's unclear: Best UX pattern for interview (stream response, extract after?)
   - Recommendation: Stream response to UI, extract asynchronously, update sidebar progressively

</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `/anthropics/anthropic-cookbook` - Prompt engineering patterns, XML extraction, classification
- `/anthropics/courses` - JSON output, thinking tags, structured prompts
- `/websites/platform_claude_en_api` - Messages API, tool use, streaming
- Existing codebase: `ClaudeClient.ts`, `RequirementsDB.ts`, `AgentRunner.ts`, `interviewStore.ts`

### Secondary (MEDIUM confidence)
- [LLMs for Requirements Engineering - arXiv](https://arxiv.org/html/2509.11446v1) - Survey of prompting techniques
- [Prompt Engineering Guide](https://www.promptingguide.ai/papers) - General prompting research

### Tertiary (LOW confidence - needs validation)
- Interview stage transition heuristics - pattern inferred from CONTEXT.md, needs testing

</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Claude API for conversational extraction
- Ecosystem: Existing Nexus infrastructure (ClaudeClient, RequirementsDB, EventBus)
- Patterns: XML extraction, chain-of-thought, conversational state
- Pitfalls: Hallucination, category mismatch, context overflow

**Confidence breakdown:**
- Standard stack: HIGH - all components already exist
- Architecture: HIGH - follows established AgentRunner pattern
- Pitfalls: HIGH - documented in LLM4RE research
- Code examples: HIGH - from Anthropic official sources

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - Claude API stable)

</metadata>

---

*Phase: 09-interview-engine*
*Research completed: 2026-01-16*
*Ready for planning: yes*
