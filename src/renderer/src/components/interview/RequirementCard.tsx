import { useState, type ReactElement } from 'react';
import { Pencil, Trash2, Layers, Shield, Cpu, Lock, User, Palette, Zap, TestTube, Plug } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import type { Requirement, RequirementCategory } from '@renderer/types/interview';
import { useInterviewStore } from '@renderer/stores/interviewStore';

interface RequirementCardProps {
  requirement: Requirement;
  isNew?: boolean;
}

const PRIORITY_STYLES = {
  must: 'bg-red-500/20 text-red-400',
  should: 'bg-amber-500/20 text-amber-400',
  could: 'bg-blue-500/20 text-blue-400',
  wont: 'bg-gray-500/20 text-gray-400'
} as const;

const PRIORITY_LABELS = {
  must: 'Must',
  should: 'Should',
  could: 'Could',
  wont: "Won't"
} as const;

const CATEGORY_ICONS: Record<RequirementCategory, typeof Layers> = {
  functional: Layers,
  non_functional: Shield,
  technical: Cpu,
  constraint: Lock,
  user_story: User,
  ui: Palette,
  performance: Zap,
  security: Shield,
  integration: Plug,
  testing: TestTube
};

/**
 * RequirementCard - Compact requirement display with priority badge.
 *
 * Shows requirement text, priority badge, and category icon.
 * Highlights with violet glow when newly added.
 * Edit/delete actions appear on hover.
 */
export function RequirementCard({ requirement, isNew = false }: RequirementCardProps): ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  const removeRequirement = useInterviewStore((s) => s.removeRequirement);

  const Icon = CATEGORY_ICONS[requirement.category];

  const handleDelete = () => {
    removeRequirement(requirement.id);
  };

  const handleEdit = () => {
    // TODO: Implement edit modal in future phase
    console.log('Edit requirement:', requirement.id);
  };

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-3 transition-all duration-300',
        'hover:border-violet-500/30 hover:bg-card/80',
        isNew && 'animate-in fade-in slide-in-from-right-2 duration-500',
        isNew && 'ring-2 ring-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
      )}
      onMouseEnter={() => { setIsHovered(true); }}
      onMouseLeave={() => { setIsHovered(false); }}
    >
      {/* Category icon */}
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

        {/* Requirement text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-relaxed">{requirement.text}</p>

          {/* Priority badge */}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                PRIORITY_STYLES[requirement.priority]
              )}
            >
              {PRIORITY_LABELS[requirement.priority]}
            </span>
          </div>
        </div>

        {/* Action buttons - visible on hover */}
        <div
          className={cn(
            'flex items-center gap-1 transition-opacity duration-200',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <button
            onClick={handleEdit}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Edit requirement"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
            aria-label="Delete requirement"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
