# Phase 6: Interview UI - Context

**Gathered:** 2026-01-15
**Status:** Ready for planning

<vision>
## How This Should Work

When users enter Genesis mode, they land in a split-screen experience. The left side is a natural conversation with the AI — they describe what they want to build. The right side is a requirements sidebar that evolves in real-time as they talk.

The magic moment is watching requirements appear as you describe your vision. You say "I need user authentication" and it crystallizes into a structured requirement right there. Brief visual highlight draws your eye to what was just captured, but doesn't interrupt the flow.

This should feel like having a conversation with a smart collaborator who's taking notes for you — not like filling out a form or answering an interrogation.

</vision>

<essential>
## What Must Be Nailed

- **Real-time extraction** — This is the "wow" moment. Requirements appearing as you talk is what makes Genesis mode feel intelligent. Users should see their vision materializing into structured requirements.
- **Split-screen balance** — Equal emphasis on chat and sidebar. Both evolve together, creating an immediate feedback loop.
- **Visual highlight on capture** — Brief animation or glow when a new requirement lands. Draws attention without stopping the conversation flow.

</essential>

<boundaries>
## What's Out of Scope

- Scope estimation display — Show requirements, but complexity/time estimates come later
- Backend interview engine — This phase is UI only; the actual AI extraction logic comes in Phase 9
- Advanced requirement editing — Basic add/edit/delete is fine, but rich editing features are deferred

</boundaries>

<specifics>
## Specific Ideas

- Continue the existing Nexus style from Genesis/Evolution mode selector cards
- 7-stage progression: welcome → project_overview → technical_requirements → features → constraints → review → complete
- Group requirements by category in sidebar (functional, non_functional, technical, constraint, user_story)
- Chat should support streaming responses for real-time feedback
- Auto-save interview state; support resume from checkpoint

Reference: BUILD-014 from Master Book provides the complete technical specification.

</specifics>

<notes>
## Additional Context

The emphasis is on the emotional experience: users should feel like their ideas are being understood and organized in real-time. This is Genesis mode — the beginning of something new. The UI should feel like a collaborative thinking session, not enterprise software.

Priority is the real-time extraction feedback loop. If that feels magical, the phase succeeds.

</notes>

---

*Phase: 06-interview-ui*
*Context gathered: 2026-01-15*
