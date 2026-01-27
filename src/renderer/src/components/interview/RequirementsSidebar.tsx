import { useState, useEffect, useRef, type ReactElement } from 'react';
import { FileText, Download, ChevronDown, CheckCircle2, Layers, Target, Zap, Lock } from 'lucide-react';
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

// Category icons and colors
const CATEGORY_CONFIG: Record<RequirementCategory, { icon: typeof Layers; color: string; bgColor: string }> = {
  functional: { icon: Zap, color: 'text-[#7C3AED]', bgColor: 'bg-[#7C3AED]/10' },
  user_story: { icon: Target, color: 'text-[#6366F1]', bgColor: 'bg-[#6366F1]/10' },
  technical: { icon: Layers, color: 'text-[#10B981]', bgColor: 'bg-[#10B981]/10' },
  non_functional: { icon: Zap, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  constraint: { icon: Lock, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  ui: { icon: Layers, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  performance: { icon: Zap, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  security: { icon: Lock, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  integration: { icon: Layers, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  testing: { icon: Target, color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
};

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
 * ProgressBar - Modern visual progress indicator for interview stages.
 */
function ProgressBar({ currentStage }: { currentStage: InterviewStage }): ReactElement {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / STAGE_ORDER.length) * 100 : 0;

  return (
    <div className="space-y-3" data-testid="interview-progress">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#F0F6FC] font-medium">
          {STAGE_LABELS[currentStage] || 'Getting Started'}
        </span>
        <span className="text-[#6E7681] tabular-nums">{Math.round(progress)}%</span>
      </div>

      {/* Progress bar with gradient */}
      <div className="h-2 bg-[#21262D] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#7C3AED] to-[#6366F1] transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage dots */}
      <div className="flex items-center justify-between mt-2">
        {STAGE_ORDER.slice(0, -1).map((stage, index) => (
          <div
            key={stage}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-all duration-300',
              index <= currentIndex
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] shadow-lg shadow-[#7C3AED]/30'
                : 'bg-[#30363D]'
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
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
          'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed'
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
          <div className={cn(
            'absolute right-0 top-full mt-2 z-50 w-36 py-1.5',
            'bg-[#161B22] border border-[#30363D] rounded-xl',
            'shadow-xl shadow-black/30',
            'animate-fade-in-up'
          )}>
            {(['json', 'markdown', 'csv'] as const).map((format) => (
              <button
                key={format}
                onClick={() => { handleExport(format); }}
                className={cn(
                  'w-full px-3 py-2 text-left text-xs font-medium',
                  'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]',
                  'transition-colors'
                )}
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
 * Modern design with priority-colored borders and smooth animations.
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

  // Priority counts
  const priorityCounts = {
    must: requirements.filter(r => r.priority === 'must').length,
    should: requirements.filter(r => r.priority === 'should').length,
    could: requirements.filter(r => r.priority === 'could').length,
  };

  return (
    <div
      className="flex h-full flex-col bg-[#0D1117] border-l border-[#30363D]/50"
      data-testid="requirements-panel"
    >
      {/* Header - Glassmorphism style */}
      <div className="sticky top-0 z-10 border-b border-[#30363D]/50 bg-[#161B22]/80 backdrop-blur-xl px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#6366F1]">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-[#F0F6FC]">Requirements</h2>
            <span
              className={cn(
                'inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-2 text-xs font-medium',
                requirements.length > 0
                  ? 'bg-gradient-to-r from-[#7C3AED]/20 to-[#6366F1]/20 text-[#7C3AED]'
                  : 'bg-[#21262D] text-[#6E7681]'
              )}
            >
              {requirements.length}
            </span>
          </div>
          <ExportDropdown requirements={requirements} />
        </div>

        {/* Progress Bar */}
        <ProgressBar currentStage={currentStage} />

        {/* Priority stats */}
        {requirements.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#30363D]/50">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[#8B949E]">Must: <span className="text-[#F0F6FC] font-medium">{priorityCounts.must}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[#8B949E]">Should: <span className="text-[#F0F6FC] font-medium">{priorityCounts.should}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[#8B949E]">Could: <span className="text-[#F0F6FC] font-medium">{priorityCounts.could}</span></span>
            </div>
          </div>
        )}

        {/* Confirmed count */}
        {requirements.length > 0 && (
          <div className="flex items-center gap-2 mt-3 text-xs text-[#8B949E]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span>
              <span className="text-[#10B981] font-medium">{confirmedCount}</span> of {requirements.length} confirmed
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {requirements.length > 0 ? (
          <div className="divide-y divide-[#30363D]/30">
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
            <div className="w-16 h-16 rounded-2xl bg-[#21262D] flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-[#6E7681]" />
            </div>
            <p className="text-sm font-medium text-[#8B949E] mb-1">
              No requirements yet
            </p>
            <p className="text-xs text-[#6E7681] max-w-[200px]">
              Requirements will appear here as you describe your project in the chat
            </p>
          </div>
        )}
      </div>

      {/* Footer with tips */}
      {requirements.length > 0 && (
        <div className="border-t border-[#30363D]/50 bg-[#161B22]/80 backdrop-blur-xl px-5 py-3">
          <p className="text-xs text-[#6E7681]">
            <span className="text-[#7C3AED] font-medium">Tip:</span> Click on a requirement to edit or confirm it
          </p>
        </div>
      )}
    </div>
  );
}
