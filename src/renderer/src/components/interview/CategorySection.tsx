import { useState, type ReactElement } from 'react';
import { ChevronDown, ChevronRight, Layers, Shield, Cpu, Lock, User } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import type { Requirement, RequirementCategory } from '@renderer/types/interview';
import { RequirementCard } from './RequirementCard';

interface CategorySectionProps {
  category: RequirementCategory;
  requirements: Requirement[];
  newRequirementIds: Set<string>;
}

const CATEGORY_CONFIG: Record<
  RequirementCategory,
  { label: string; icon: typeof Layers }
> = {
  functional: { label: 'Functional', icon: Layers },
  non_functional: { label: 'Non-Functional', icon: Shield },
  technical: { label: 'Technical', icon: Cpu },
  constraint: { label: 'Constraints', icon: Lock },
  user_story: { label: 'User Stories', icon: User }
};

/**
 * CategorySection - Collapsible section for grouped requirements.
 *
 * Shows category header with icon, count badge, and collapse toggle.
 * Displays RequirementCard for each requirement in the category.
 * Empty state when no requirements in category.
 */
export function CategorySection({
  category,
  requirements,
  newRequirementIds
}: CategorySectionProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);

  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  const count = requirements.length;

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center gap-2 px-4 py-3 text-left transition-colors',
          'hover:bg-muted/50'
        )}
        aria-expanded={isExpanded}
        aria-controls={`category-${category}`}
      >
        {/* Expand/collapse icon */}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}

        {/* Category icon */}
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* Category label */}
        <span className="text-sm font-medium text-foreground">{config.label}</span>

        {/* Count badge */}
        <span
          className={cn(
            'ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-medium',
            count > 0
              ? 'bg-violet-500/20 text-violet-400'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {count}
        </span>
      </button>

      {/* Content - requirements list or empty state */}
      <div
        id={`category-${category}`}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-3 space-y-2">
          {count > 0 ? (
            requirements.map((requirement) => (
              <RequirementCard
                key={requirement.id}
                requirement={requirement}
                isNew={newRequirementIds.has(requirement.id)}
              />
            ))
          ) : (
            <p className="py-2 text-sm text-muted-foreground/60 italic">
              No requirements yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
