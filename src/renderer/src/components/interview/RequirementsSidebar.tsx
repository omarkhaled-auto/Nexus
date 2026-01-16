import { useState, useEffect, useRef, type ReactElement } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { useRequirements, useInterviewStage } from '@renderer/stores/interviewStore';
import type { Requirement, RequirementCategory, InterviewStage } from '@renderer/types/interview';
import { CategorySection } from './CategorySection';

// Category display order
const CATEGORY_ORDER: RequirementCategory[] = [
  'functional',
  'user_story',
  'technical',
  'non_functional',
  'constraint'
];

// Stage progression for dots indicator
const STAGE_ORDER: InterviewStage[] = [
  'welcome',
  'project_overview',
  'technical_requirements',
  'features',
  'constraints',
  'review',
  'complete'
];

/**
 * RequirementsSidebar - Real-time requirements display panel.
 *
 * Shows extracted requirements grouped by category.
 * New requirements get a highlight animation that fades after 2s.
 * Progress indicator shows interview stage completion.
 */
export function RequirementsSidebar(): ReactElement {
  const requirements = useRequirements();
  const currentStage = useInterviewStage();
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevRequirements = useRef<Requirement[]>([]);

  // Track newly added requirements for highlight animation
  useEffect(() => {
    const current = requirements;
    const prev = prevRequirements.current;
    const added = current.filter((r) => !prev.find((p) => p.id === r.id));

    if (added.length > 0) {
      setNewIds((prevIds) => new Set([...prevIds, ...added.map((r) => r.id)]));

      // Clear highlight after animation
      const timeout = setTimeout(() => {
        setNewIds((prevIds) => {
          const next = new Set(prevIds);
          added.forEach((r) => next.delete(r.id));
          return next;
        });
      }, 2000);

      return () => { clearTimeout(timeout); };
    }

    prevRequirements.current = current;
  }, [requirements]);

  // Group requirements by category
  const requirementsByCategory = CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = requirements.filter((r) => r.category === category);
      return acc;
    },
    {} as Record<RequirementCategory, Requirement[]>
  );

  // Calculate stage progress
  const currentStageIndex = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-background to-background/95">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Requirements</h2>
          <span
            className={cn(
              'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-medium',
              requirements.length > 0
                ? 'bg-violet-500/20 text-violet-400'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {requirements.length}
          </span>
        </div>

        {/* Stage progress dots */}
        <div className="mt-2 flex items-center gap-1.5">
          {STAGE_ORDER.slice(0, -1).map((stage, index) => (
            <div
              key={stage}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors',
                index <= currentStageIndex ? 'bg-violet-500' : 'bg-muted-foreground/30'
              )}
              title={stage.replace(/_/g, ' ')}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {requirements.length > 0 ? (
          // Category sections
          <div className="divide-y divide-border/30">
            {CATEGORY_ORDER.map((category) => (
              <CategorySection
                key={category}
                category={category}
                requirements={requirementsByCategory[category]}
                newRequirementIds={newIds}
              />
            ))}
          </div>
        ) : (
          // Empty state
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">
              Requirements will appear here
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              as you describe your project
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
