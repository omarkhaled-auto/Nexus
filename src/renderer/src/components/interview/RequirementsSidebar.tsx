import { useState, useEffect, useRef, type ReactElement } from 'react';
import { FileText, Download, ChevronDown, CheckCircle2 } from 'lucide-react';
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
  'constraint',
];

// Stage progression for progress indicator
const STAGE_ORDER: InterviewStage[] = [
  'welcome',
  'project_overview',
  'technical_requirements',
  'features',
  'constraints',
  'review',
  'complete',
];

const STAGE_LABELS: Record<InterviewStage, string> = {
  welcome: 'Welcome',
  project_name: 'Project Name',
  project_overview: 'Project Overview',
  overview: 'Overview',
  functional: 'Functional Requirements',
  technical: 'Technical',
  technical_requirements: 'Technical Requirements',
  features: 'Features',
  ui: 'UI/UX',
  performance: 'Performance',
  security: 'Security',
  integration: 'Integration',
  constraints: 'Constraints',
  testing: 'Testing',
  summary: 'Summary',
  review: 'Review',
  complete: 'Complete',
};

/**
 * ProgressBar - Visual progress indicator for interview stages.
 */
function ProgressBar({ currentStage }: { currentStage: InterviewStage }): ReactElement {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / STAGE_ORDER.length) * 100 : 0;

  return (
    <div className="space-y-2" data-testid="interview-progress">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">
          {STAGE_LABELS[currentStage] || 'Getting Started'}
        </span>
        <span className="text-text-tertiary">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 bg-bg-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-primary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* Stage dots */}
      <div className="flex items-center justify-between mt-1">
        {STAGE_ORDER.slice(0, -1).map((stage, index) => (
          <div
            key={stage}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              index <= currentIndex
                ? 'bg-accent-primary shadow-glow-primary'
                : 'bg-border-default'
            )}
            title={STAGE_LABELS[stage]}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ExportDropdown - Export requirements in different formats.
 */
function ExportDropdown({ requirements }: { requirements: Requirement[] }): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: 'json' | 'markdown' | 'csv') => {
    let content = '';
    const filename = `requirements.${format}`;

    switch (format) {
      case 'json':
        content = JSON.stringify(requirements, null, 2);
        break;
      case 'markdown':
        content = requirements
          .map(
            (r) =>
              `## ${r.text}\n- **Category:** ${r.category}\n- **Priority:** ${r.priority}\n`
          )
          .join('\n');
        break;
      case 'csv':
        content = 'ID,Text,Category,Priority\n' +
          requirements
            .map((r) => `"${r.id}","${r.text}","${r.category}","${r.priority}"`)
            .join('\n');
        break;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setIsOpen(!isOpen); }}
        disabled={requirements.length === 0}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
          'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
          'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        data-testid="export-button"
      >
        <Download className="w-3.5 h-3.5" />
        Export
        <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); }} />
          <div className="absolute right-0 top-full mt-1 z-50 w-32 py-1 bg-bg-card border border-border-default rounded-lg shadow-lg">
            {(['json', 'markdown', 'csv'] as const).map((format) => (
              <button
                key={format}
                onClick={() => { handleExport(format); }}
                className="w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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

      prevRequirements.current = current;
      return () => {
        clearTimeout(timeout);
      };
    }

    prevRequirements.current = current;
    return undefined;
  }, [requirements]);

  // Group requirements by category
  const requirementsByCategory = CATEGORY_ORDER.reduce<Record<RequirementCategory, Requirement[]>>(
    (acc, category) => {
      acc[category] = requirements.filter((r) => r.category === category);
      return acc;
    },
    {} as Record<RequirementCategory, Requirement[]>
  );

  // Count confirmed requirements
  const confirmedCount = requirements.filter((r) => r.confirmed).length;

  return (
    <div
      className="flex h-full flex-col bg-bg-dark border-l border-border-default"
      data-testid="requirements-panel"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border-default bg-bg-card px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">Requirements</h2>
            <span
              className={cn(
                'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-medium',
                requirements.length > 0
                  ? 'bg-accent-primary/20 text-accent-primary'
                  : 'bg-bg-muted text-text-tertiary'
              )}
            >
              {requirements.length}
            </span>
          </div>
          <ExportDropdown requirements={requirements} />
        </div>

        {/* Progress Bar */}
        <ProgressBar currentStage={currentStage} />

        {/* Confirmed count */}
        {requirements.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-text-secondary">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
            <span>
              {confirmedCount} of {requirements.length} confirmed
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {requirements.length > 0 ? (
          // Category sections
          <div className="divide-y divide-border-default/30">
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
            <div className="rounded-full bg-bg-card p-4 mb-4">
              <FileText className="h-8 w-8 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-secondary mb-1">
              No requirements yet
            </p>
            <p className="text-xs text-text-tertiary max-w-[200px]">
              Requirements will appear here as you describe your project in the chat
            </p>
          </div>
        )}
      </div>

      {/* Footer with tips */}
      {requirements.length > 0 && (
        <div className="border-t border-border-default bg-bg-card px-4 py-3">
          <p className="text-xs text-text-tertiary">
            <span className="text-accent-primary">Tip:</span> Click on a requirement to edit or confirm it
          </p>
        </div>
      )}
    </div>
  );
}
