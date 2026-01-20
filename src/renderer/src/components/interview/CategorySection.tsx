import { useState, type ReactElement } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Shield,
  Cpu,
  Lock,
  User,
  Palette,
  Zap,
  TestTube,
  Plug,
} from 'lucide-react';
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
  { label: string; icon: typeof Layers; description: string }
> = {
  functional: {
    label: 'Functional',
    icon: Layers,
    description: 'Core features and capabilities',
  },
  non_functional: {
    label: 'Non-Functional',
    icon: Shield,
    description: 'Quality attributes and constraints',
  },
  technical: {
    label: 'Technical',
    icon: Cpu,
    description: 'Implementation specifications',
  },
  constraint: {
    label: 'Constraints',
    icon: Lock,
    description: 'Limitations and boundaries',
  },
  user_story: {
    label: 'User Stories',
    icon: User,
    description: 'User-centric requirements',
  },
  ui: {
    label: 'UI/UX',
    icon: Palette,
    description: 'Interface and experience',
  },
  performance: {
    label: 'Performance',
    icon: Zap,
    description: 'Speed and efficiency targets',
  },
  security: {
    label: 'Security',
    icon: Shield,
    description: 'Protection requirements',
  },
  integration: {
    label: 'Integration',
    icon: Plug,
    description: 'External system connections',
  },
  testing: {
    label: 'Testing',
    icon: TestTube,
    description: 'Quality assurance needs',
  },
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
  newRequirementIds,
}: CategorySectionProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);

  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  const count = requirements.length;

  // Don't render empty categories
  if (count === 0) {
    return <></>;
  }

  return (
    <div className="border-b border-border-default/30 last:border-b-0">
      {/* Header - clickable to toggle */}
      <button
        onClick={() => { setIsExpanded(!isExpanded); }}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
          'hover:bg-bg-hover'
        )}
        aria-expanded={isExpanded}
        aria-controls={`category-${category}`}
      >
        {/* Expand/collapse icon */}
        <div
          className={cn(
            'flex-shrink-0 w-5 h-5 flex items-center justify-center',
            'text-text-tertiary transition-transform duration-200',
            isExpanded && 'rotate-0',
            !isExpanded && '-rotate-90'
          )}
        >
          <ChevronDown className="w-4 h-4" />
        </div>

        {/* Category icon */}
        <div
          className={cn(
            'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
            'bg-bg-muted'
          )}
        >
          <Icon className="w-3.5 h-3.5 text-text-secondary" />
        </div>

        {/* Category label and description */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-text-primary">{config.label}</span>
          <span className="text-xs text-text-tertiary ml-2 hidden sm:inline">
            {config.description}
          </span>
        </div>

        {/* Count badge */}
        <span
          className={cn(
            'flex-shrink-0 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-medium',
            count > 0 ? 'bg-accent-primary/20 text-accent-primary' : 'bg-bg-muted text-text-tertiary'
          )}
        >
          {count}
        </span>
      </button>

      {/* Content - requirements list */}
      <div
        id={`category-${category}`}
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-3 space-y-2">
          {requirements.map((requirement) => (
            <RequirementCard
              key={requirement.id}
              requirement={requirement}
              isNew={newRequirementIds.has(requirement.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
