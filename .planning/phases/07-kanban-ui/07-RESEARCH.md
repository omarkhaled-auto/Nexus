# Phase 7: Kanban UI - Research

**Researched:** 2026-01-15
**Domain:** React drag-and-drop with @dnd-kit for Kanban board
**Confidence:** HIGH

<research_summary>
## Summary

Researched the @dnd-kit ecosystem for building an accessible, performant Kanban board in React. The library is lightweight (~10kb), modular, and the current standard for React drag-and-drop after react-beautiful-dnd became unmaintained.

Key findings: @dnd-kit provides excellent accessibility out of the box (keyboard nav, screen reader announcements). For Kanban boards, use the sortable preset with multiple containers pattern. The main performance pitfall is unnecessary rerenders — solve with proper memoization by separating hook logic from presentation components.

**Primary recommendation:** Use @dnd-kit/core + @dnd-kit/sortable. Structure columns as droppable containers with sortable items. Use DragOverlay for smooth visual feedback. Memoize card components aggressively to avoid rerender storms.

</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | ^6.1.0 | Core DnD primitives | Foundation: DndContext, sensors, collision detection |
| @dnd-kit/sortable | ^8.0.0 | Sortable preset | Handles sorting within/between containers |
| @dnd-kit/utilities | ^3.2.2 | CSS helpers | Transform utilities for smooth animations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/modifiers | ^7.0.0 | Drag modifiers | Constrain movement (snap to grid, restrict axis) |
| @dnd-kit/accessibility | ^3.1.0 | A11y utilities | Custom announcements if defaults insufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-beautiful-dnd | Unmaintained since 2022, don't use |
| @dnd-kit | react-dnd | More complex API, heavier, less accessible |
| @dnd-kit | dnd-kit next (v2) | Bleeding edge, not production-ready yet |

**Installation:**
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/renderer/src/components/kanban/
├── KanbanBoard.tsx      # DndContext + column layout
├── KanbanColumn.tsx     # Droppable + SortableContext
├── FeatureCard.tsx      # useSortable + presentation
├── FeatureCardPresentation.tsx  # Memoized UI (no hooks)
├── DragOverlayCard.tsx  # Card clone for overlay
└── hooks/
    └── useKanbanDnd.ts  # Centralized DnD state logic
```

### Pattern 1: Multiple Sortable Containers (Kanban Columns)
**What:** Each column is a droppable container with sortable items
**When to use:** Multi-column boards like Kanban
**Example:**
```typescript
// Source: Context7 /websites/next_dndkit
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';

function KanbanBoard({ columns, features, onMove }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // Prevent accidental drags
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {columns.map(column => (
        <KanbanColumn key={column.id} column={column}>
          <SortableContext
            items={features.filter(f => f.status === column.id)}
            strategy={verticalListSortingStrategy}
          >
            {features.filter(f => f.status === column.id).map(feature => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </SortableContext>
        </KanbanColumn>
      ))}
      <DragOverlay>
        {activeId ? <DragOverlayCard featureId={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### Pattern 2: Sortable Item with Memoized Presentation
**What:** Separate hook logic from presentation to prevent rerenders
**When to use:** Any draggable item
**Example:**
```typescript
// Source: GitHub issue #389 solution
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Memoized presentation - no hooks, just UI
const FeatureCardPresentation = React.memo(({
  feature,
  isDragging
}: {
  feature: Feature;
  isDragging: boolean;
}) => (
  <div className={cn(
    "p-3 bg-card rounded-lg border",
    isDragging && "opacity-50"
  )}>
    <h3>{feature.title}</h3>
    <ComplexityBadge complexity={feature.complexity} />
    <ProgressIndicator progress={feature.progress} />
  </div>
));

// Hook wrapper - handles DnD, passes props to presentation
function FeatureCard({ feature }: { feature: Feature }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <FeatureCardPresentation feature={feature} isDragging={isDragging} />
    </div>
  );
}
```

### Pattern 3: Optimistic Updates with Revert
**What:** Update UI immediately, revert if backend fails
**When to use:** Any async operation triggered by drag
**Example:**
```typescript
async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  setActiveId(null);

  if (!over || active.id === over.id) return;

  const featureId = active.id as string;
  const newStatus = over.data.current?.columnId as FeatureStatus;
  const oldStatus = features.find(f => f.id === featureId)?.status;

  // Optimistic update
  setFeatures(prev => prev.map(f =>
    f.id === featureId ? { ...f, status: newStatus } : f
  ));

  try {
    await onFeatureMove(featureId, newStatus);
    // Backend will emit events for actual state sync
  } catch (error) {
    // Revert on failure
    setFeatures(prev => prev.map(f =>
      f.id === featureId ? { ...f, status: oldStatus } : f
    ));
    toast.error('Failed to move feature');
  }
}
```

### Pattern 4: Custom Screen Reader Announcements
**What:** Provide context-aware accessibility announcements
**When to use:** When default announcements aren't descriptive enough
**Example:**
```typescript
// Source: Context7 /websites/next_dndkit accessibility docs
const announcements = {
  onDragStart({ active }) {
    const feature = features.find(f => f.id === active.id);
    return `Picked up feature "${feature?.title}". Current column: ${feature?.status}.`;
  },
  onDragOver({ active, over }) {
    if (over) {
      const column = columns.find(c => c.id === over.id);
      return `Feature moved over ${column?.title} column.`;
    }
    return `Feature is no longer over a column.`;
  },
  onDragEnd({ active, over }) {
    if (over) {
      const column = columns.find(c => c.id === over.id);
      return `Feature dropped in ${column?.title} column.`;
    }
    return `Feature was dropped.`;
  },
  onDragCancel({ active }) {
    return `Dragging cancelled. Feature returned to original position.`;
  },
};

<DndContext accessibility={{ announcements }} ... />
```

### Anti-Patterns to Avoid
- **Hooks in memoized components:** Never call useSortable inside React.memo — it defeats memoization
- **Inline object creation in sensors:** Define sensors outside component or with useMemo
- **Missing DragOverlay:** Without DragOverlay, the original item follows cursor, causing layout shifts
- **No activation constraint:** Set `distance: 5` to prevent accidental drags when clicking

</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collision detection | Custom hit-testing | closestCenter/rectIntersection | Edge cases with overlapping items, performance |
| Keyboard navigation | Custom arrow key handlers | KeyboardSensor + coordinateGetter | ARIA compliance, focus management |
| Drag preview | Cloned DOM element | DragOverlay component | Handles transforms, portals, z-index properly |
| Touch support | touchstart/touchmove handlers | PointerSensor with delay constraint | Distinguishes tap from drag, prevents scroll issues |
| Reorder animations | Manual CSS transitions | CSS.Transform.toString() utility | Handles hardware acceleration, easing |
| Screen reader | Custom aria-live regions | Built-in announcements | Tested with real screen readers |

**Key insight:** @dnd-kit has solved accessibility, touch, and keyboard support properly. Rolling your own will create a11y bugs that are hard to detect and expensive to fix.

</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Rerender Storms with Many Items
**What goes wrong:** Board becomes laggy when dragging with 50+ cards
**Why it happens:** DndContext uses React Context, which rerenders all consumers on any change
**How to avoid:**
- Memoize card presentation components (not the hook wrapper)
- Use stable IDs (not array indices)
- Consider grouping by column in Zustand selectors
**Warning signs:** DevTools shows all cards rerendering on drag start

### Pitfall 2: Flickering on Re-drag
**What goes wrong:** Items flicker when starting a new drag shortly after the previous one ended
**Why it happens:** Race condition between state update and new drag start when using distance constraint
**How to avoid:**
- Use small distance constraint (5px, not 10px)
- Ensure DragOverlay is always mounted (conditional content, not component)
- Reset activeId synchronously in onDragEnd, not in async handler
**Warning signs:** Visual glitch when rapidly moving cards

### Pitfall 3: Missing DragOverlay Causes Layout Shift
**What goes wrong:** Other cards jump around when dragging starts
**Why it happens:** Without DragOverlay, the original item is repositioned, causing siblings to reflow
**How to avoid:** Always use DragOverlay with a clone of the dragged item
**Warning signs:** Cards below the dragged item shift up/down on drag start

### Pitfall 4: Touch Drag Conflicts with Scroll
**What goes wrong:** Can't scroll on mobile; every touch starts a drag
**Why it happens:** No activation delay for touch input
**How to avoid:**
```typescript
useSensor(PointerSensor, {
  activationConstraint: {
    delay: 200,      // Hold 200ms before drag starts
    tolerance: 5,    // Allow 5px movement during delay
  },
})
```
**Warning signs:** Mobile users can't scroll the board

### Pitfall 5: Drag End Not Firing in Scroll Containers
**What goes wrong:** Dropping at bottom of scrolled container doesn't register
**Why it happens:** Collision detection doesn't account for scroll position properly
**How to avoid:**
- Use `closestCenter` collision detection (more reliable than `rectIntersection`)
- Ensure droppable refs include the full container, not just visible area
**Warning signs:** Drops work at top of column but fail at bottom after scrolling

</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official sources:

### Basic Sensor Configuration
```typescript
// Source: Context7 /websites/next_dndkit
import { useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5, // 5px movement before drag starts
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

### Handle Cross-Column Movement
```typescript
// Source: Context7 + LogRocket blog pattern
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;

  if (!over) return;

  const activeFeature = features.find(f => f.id === active.id);
  const overColumnId = over.data.current?.columnId ?? over.id;

  if (!activeFeature) return;

  // Same column reorder
  if (activeFeature.status === overColumnId) {
    const columnFeatures = features.filter(f => f.status === overColumnId);
    const oldIndex = columnFeatures.findIndex(f => f.id === active.id);
    const newIndex = columnFeatures.findIndex(f => f.id === over.id);

    if (oldIndex !== newIndex) {
      const reordered = arrayMove(columnFeatures, oldIndex, newIndex);
      // Update order in state
    }
  }
  // Cross-column move
  else {
    // Trigger backend action (TaskDecomposer, agent execution, etc.)
    onFeatureMove(activeFeature.id, overColumnId as FeatureStatus);
  }
}
```

### Droppable Column Component
```typescript
// Source: Context7 /websites/next_dndkit
import { useDroppable } from '@dnd-kit/core';

function KanbanColumn({
  column,
  children
}: {
  column: Column;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { columnId: column.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[280px] bg-muted/30 rounded-lg p-3",
        isOver && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{column.title}</h2>
        <span className="text-sm text-muted-foreground">
          {column.count}{column.limit && `/${column.limit}`}
        </span>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}
```

</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2022 (rbd unmaintained) | Must use @dnd-kit for new projects |
| useDraggable/useDroppable only | useSortable preset | N/A | Use sortable for Kanban, simpler API |
| Manual collision detection | Built-in strategies | N/A | closestCenter works for most cases |
| CSS-in-JS for transforms | CSS.Transform utility | N/A | Better performance, hardware accelerated |

**New tools/patterns to consider:**
- **@dnd-kit/react (v2)**: Next-gen API with DragDropProvider, but not stable yet
- **Virtualized sortable**: For 500+ items, consider react-window integration (complex)

**Deprecated/outdated:**
- **react-beautiful-dnd**: Unmaintained since 2022, don't use for new projects
- **react-dnd**: Still works but more complex, less accessible than @dnd-kit

</sota_updates>

<open_questions>
## Open Questions

Things that couldn't be fully resolved:

1. **WIP Limit Enforcement UI**
   - What we know: Column can display limit indicator
   - What's unclear: Should drag be blocked at DnD level, or just show warning?
   - Recommendation: Show visual warning, allow drop, let backend enforce limits

2. **Drag Between Tabs (Future)**
   - What we know: Current scope is single board
   - What's unclear: If features span multiple boards later
   - Recommendation: Design column IDs to be globally unique now

</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `/websites/next_dndkit` (Context7) - DndContext, sensors, sortable, accessibility
- [LogRocket: Build Kanban with dnd-kit](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/) - Architecture patterns

### Secondary (MEDIUM confidence)
- [GitHub: react-dnd-kit-tailwind-shadcn-ui](https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui) - Shadcn integration patterns
- [GitHub Issue #389](https://github.com/clauderic/dnd-kit/issues/389) - Memoization fix for rerenders
- [GitHub Issue #943](https://github.com/clauderic/dnd-kit/issues/943) - Large-scale performance limits

### Tertiary (LOW confidence - needs validation)
- None - all findings verified against Context7 or official sources

</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: @dnd-kit (core, sortable, utilities)
- Ecosystem: React 19, Zustand, Tailwind, shadcn/ui
- Patterns: Multiple containers, memoization, optimistic updates
- Pitfalls: Rerenders, flickering, touch conflicts, scroll issues

**Confidence breakdown:**
- Standard stack: HIGH - verified with Context7, widely used
- Architecture: HIGH - from official examples and community patterns
- Pitfalls: HIGH - documented in GitHub issues, verified solutions
- Code examples: HIGH - from Context7 official docs

**Research date:** 2026-01-15
**Valid until:** 2026-02-15 (30 days - @dnd-kit ecosystem stable)

</metadata>

---

*Phase: 07-kanban-ui*
*Research completed: 2026-01-15*
*Ready for planning: yes*
