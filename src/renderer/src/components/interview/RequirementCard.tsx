import { useState, type ReactElement } from 'react';
import {
  Pencil,
  Trash2,
  Layers,
  Shield,
  Cpu,
  Lock,
  User,
  Palette,
  Zap,
  TestTube,
  Plug,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import type { Requirement, RequirementCategory, RequirementPriority } from '@renderer/types/interview';
import { useInterviewStore } from '@renderer/stores/interviewStore';

interface RequirementCardProps {
  requirement: Requirement;
  isNew?: boolean;
}

const PRIORITY_STYLES: Record<RequirementPriority, { bg: string; text: string; label: string }> = {
  must: { bg: 'bg-priority-must/20', text: 'text-priority-must', label: 'Must Have' },
  should: { bg: 'bg-priority-should/20', text: 'text-priority-should', label: 'Should Have' },
  could: { bg: 'bg-priority-could/20', text: 'text-priority-could', label: 'Could Have' },
  wont: { bg: 'bg-priority-wont/20', text: 'text-priority-wont', label: "Won't Have" },
};

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
  testing: TestTube,
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
  const updateRequirement = useInterviewStore((s) => s.updateRequirement);

  const Icon = CATEGORY_ICONS[requirement.category];
  const priorityStyle = PRIORITY_STYLES[requirement.priority];

  const handleDelete = () => {
    removeRequirement(requirement.id);
  };

  const handleEdit = () => {
    // TODO: Implement edit modal in future phase
    console.log('Edit requirement:', requirement.id);
  };

  const handleToggleConfirm = () => {
    updateRequirement(requirement.id, { confirmed: !requirement.confirmed });
  };

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-bg-card p-3 transition-all duration-300',
        'hover:border-accent-primary/30 hover:bg-bg-elevated',
        // New requirement animation
        isNew && 'animate-in fade-in slide-in-from-right-2 duration-500',
        isNew && 'ring-2 ring-accent-primary/50 shadow-glow-primary',
        // Confirmed state
        requirement.confirmed && 'border-accent-success/30 bg-accent-success/5'
      )}
      onMouseEnter={() => { setIsHovered(true); }}
      onMouseLeave={() => { setIsHovered(false); }}
      data-testid="requirement-card"
    >
      {/* Category icon */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
            'bg-bg-muted'
          )}
        >
          <Icon className="w-4 h-4 text-text-secondary" />
        </div>

        {/* Requirement text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary leading-relaxed">{requirement.text}</p>

          {/* Meta row: Priority badge + Confirmed status */}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                priorityStyle.bg,
                priorityStyle.text
              )}
            >
              {priorityStyle.label}
            </span>

            {/* Confirmed indicator */}
            <button
              onClick={handleToggleConfirm}
              className={cn(
                'flex items-center gap-1 text-xs transition-colors',
                requirement.confirmed
                  ? 'text-accent-success'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
              title={requirement.confirmed ? 'Click to unconfirm' : 'Click to confirm'}
            >
              {requirement.confirmed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmed</span>
                </>
              ) : (
                <>
                  <Circle className="w-3.5 h-3.5" />
                  <span>Unconfirmed</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action buttons - visible on hover */}
        <div
          className={cn(
            'flex flex-col items-center gap-1 transition-opacity duration-200',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <button
            onClick={handleEdit}
            className={cn(
              'rounded-lg p-1.5 transition-colors',
              'text-text-tertiary hover:text-text-primary hover:bg-bg-hover'
            )}
            aria-label="Edit requirement"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className={cn(
              'rounded-lg p-1.5 transition-colors',
              'text-text-tertiary hover:text-accent-error hover:bg-accent-error/10'
            )}
            aria-label="Delete requirement"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
