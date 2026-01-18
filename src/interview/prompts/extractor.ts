/**
 * Extraction Prompt
 *
 * Standalone prompt for post-hoc extraction from conversation history.
 * Used when re-processing a conversation or extracting from saved transcripts.
 *
 * Reference: Phase 9 RESEARCH.md - XML Tag Extraction Pattern
 */

/**
 * Standalone extraction prompt for analyzing conversation history
 * Returns only requirements, no conversational response
 */
export const EXTRACTION_SYSTEM_PROMPT = `You are a requirements extraction specialist. Your task is to analyze a conversation between a user and an AI interviewer and extract all software requirements mentioned.

For each requirement found, output in this format:

<requirement>
  <text>Clear description of the requirement</text>
  <category>functional|non_functional|technical|constraint|assumption</category>
  <priority>must|should|could|wont</priority>
  <confidence>0.0-1.0 (how certain you are this is a real requirement)</confidence>
  <area>domain area like "authentication", "payments", "ui"</area>
</requirement>

Category definitions:
- functional: What the system does (features, behaviors)
- non_functional: How well the system does it (performance, scalability, reliability)
- technical: Technology choices, architecture decisions
- constraint: Limitations, boundaries, rules
- assumption: Things taken as given but should be validated

Priority definitions (MoSCoW):
- must: Critical for MVP, cannot ship without
- should: Important but not critical
- could: Nice to have
- wont: Explicitly out of scope for now

Extraction rules:
- Only extract requirements the user explicitly stated or clearly implied
- Do NOT invent requirements or assume features not mentioned
- Set confidence based on how explicit the user was
- Deduplicate - if the same requirement appears multiple times, extract it once with highest confidence
- Include the area/domain for each requirement when identifiable

Output format:
<requirements>
[All requirement blocks here]
</requirements>

If no requirements are found, output:
<requirements>
</requirements>`;

/**
 * Build extraction prompt with conversation history
 */
export function buildExtractionPrompt(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  const formattedHistory = conversationHistory
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');

  return `Analyze the following conversation and extract all software requirements:

<conversation>
${formattedHistory}
</conversation>

Extract all requirements mentioned in the conversation above.`;
}

/**
 * Prompt for extracting requirements from a single message
 * More focused than full conversation extraction
 */
export const SINGLE_MESSAGE_EXTRACTION_PROMPT = `Analyze the following user message and extract any software requirements mentioned.

Rules:
- Only extract requirements explicitly stated or clearly implied
- Skip vague statements that don't represent concrete requirements
- Output empty <requirements></requirements> if no requirements found

Output format: Use <requirement> blocks as specified in system prompt.`;

/**
 * Prompt for requirement deduplication and merging
 * Used when combining requirements from multiple extraction passes
 */
export const DEDUPLICATION_PROMPT = `You are given a list of extracted requirements that may contain duplicates or overlapping items.

Your task:
1. Identify duplicate or highly similar requirements
2. Merge duplicates into a single, comprehensive requirement
3. Keep the highest confidence score from duplicates
4. Preserve unique requirements unchanged

Output format:
<requirements>
[Deduplicated requirement blocks]
</requirements>

<duplicates_resolved>
[List of requirement IDs that were merged, one per line]
</duplicates_resolved>`;
