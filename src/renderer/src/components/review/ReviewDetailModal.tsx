import { useCallback, useEffect, useState, type ChangeEvent, type ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import {
  Loader2,
  AlertTriangle,
  GitMerge,
  MessageSquare,
  FileCode,
  CheckCircle2,
  XCircle,
  Hash,
  Folder,
  Clock,
  Zap
} from 'lucide-react';
import type { HumanReviewRequest } from '../../../../orchestration/review/HumanReviewService';
import type { ReviewContext } from '../../../../types/events';

export interface ReviewDetailModalProps {
  reviewId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (reviewId: string, resolution?: string) => Promise<void>;
  onReject: (reviewId: string, feedback: string) => Promise<void>;
}

function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof window.nexusAPI !== 'undefined';
}

const reasonConfig: Record<string, { icon: typeof AlertTriangle; label: string; color: string; bgColor: string }> = {
  qa_exhausted: {
    icon: Clock,
    label: 'QA iterations exhausted',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20'
  },
  merge_conflict: {
    icon: GitMerge,
    label: 'Merge conflict detected',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20'
  },
  manual_request: {
    icon: MessageSquare,
    label: 'Manual review requested',
    color: 'text-[#7C3AED]',
    bgColor: 'bg-[#7C3AED]/10 border-[#7C3AED]/20'
  },
};

type TabId = 'details' | 'resolution' | 'feedback';

export function ReviewDetailModal({
  reviewId,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: ReviewDetailModalProps): ReactElement {
  const [review, setReview] = useState<HumanReviewRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('details');

  const loadReview = useCallback(async () => {
    if (!reviewId) return;
    if (!isElectronEnvironment()) {
      setError('Review details are only available in the desktop app.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await window.nexusAPI.reviewGet(reviewId);
      setReview(response as HumanReviewRequest | null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load review details.';
      setError(message);
      setReview(null);
    } finally {
      setIsLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    if (!isOpen) {
      setReview(null);
      setError(null);
      setResolution('');
      setFeedback('');
      setActiveTab('details');
      return;
    }

    void loadReview();
  }, [isOpen, loadReview]);

  const handleResolutionChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setResolution(event.target.value);
  };

  const handleFeedbackChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setFeedback(event.target.value);
  };

  const handleApprove = async (): Promise<void> => {
    if (!reviewId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onApprove(reviewId, resolution.trim() || undefined);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve review.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!reviewId) return;
    if (!feedback.trim()) {
      setError('Feedback is required to reject this review.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onReject(reviewId, feedback.trim());
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject review.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const context = review?.context as (ReviewContext & { conflictFiles?: unknown }) | undefined;
  const conflictFiles = context && Array.isArray(context.conflictFiles)
    ? context.conflictFiles.filter((item): item is string => typeof item === 'string')
    : [];

  const config = review?.reason ? reasonConfig[review.reason] : null;
  const ReasonIcon = config?.icon ?? AlertTriangle;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'resolution', label: 'Resolution' },
    { id: 'feedback', label: 'Feedback' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(
        "sm:max-w-[680px] p-0 overflow-hidden",
        "bg-[#161B22]/95 backdrop-blur-xl",
        "border border-[#30363D]",
        "shadow-[0_24px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(124,58,237,0.1)]",
        "rounded-2xl"
      )}>
        {/* Header */}
        <DialogHeader className="relative px-6 pt-6 pb-4 border-b border-[#30363D]/50">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />

          <div className="flex items-start gap-4">
            {config && (
              <div className={cn(
                "relative p-3 rounded-xl border",
                config.bgColor
              )}>
                <ReasonIcon className={cn("h-6 w-6", config.color)} />
              </div>
            )}

            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-[#F0F6FC]">
                Review Details
              </DialogTitle>
              <DialogDescription className={cn("mt-1", config?.color ?? 'text-[#8B949E]')}>
                {config?.label ?? 'Pending review'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-[#30363D]/30">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200",
                  activeTab === tab.id
                    ? "text-[#F0F6FC] bg-[#21262D]/50"
                    : "text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]/30"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[300px] max-h-[50vh] overflow-y-auto">
          {error && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-lg mb-4",
              "bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            )}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-[#8B949E]">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading review details...</span>
              </div>
            </div>
          )}

          {!isLoading && review && activeTab === 'details' && (
            <div className="space-y-4">
              {/* Info grid */}
              <div className="grid gap-3 p-4 rounded-xl bg-[#0D1117]/50 border border-[#30363D]/50">
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-[#8B949E]" />
                  <span className="text-sm text-[#8B949E]">Task ID</span>
                  <code className="ml-auto text-sm font-mono text-[#F0F6FC] bg-[#21262D] px-2 py-0.5 rounded">
                    {review.taskId}
                  </code>
                </div>
                <div className="flex items-center gap-3">
                  <Folder className="h-4 w-4 text-[#8B949E]" />
                  <span className="text-sm text-[#8B949E]">Project ID</span>
                  <code className="ml-auto text-sm font-mono text-[#F0F6FC] bg-[#21262D] px-2 py-0.5 rounded">
                    {review.projectId}
                  </code>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-[#8B949E]" />
                  <span className="text-sm text-[#8B949E]">Status</span>
                  <span className="ml-auto text-sm text-[#F0F6FC] capitalize bg-[#7C3AED]/10 px-2 py-0.5 rounded border border-[#7C3AED]/20">
                    {review.status}
                  </span>
                </div>
                {typeof context?.qaIterations === 'number' && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-[#8B949E]" />
                    <span className="text-sm text-[#8B949E]">QA Iterations</span>
                    <span className="ml-auto text-sm text-amber-400 font-medium">
                      {context.qaIterations}
                    </span>
                  </div>
                )}
              </div>

              {/* Escalation reason */}
              {context?.escalationReason && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Escalation Reason
                  </p>
                  <p className="text-sm text-[#8B949E]">{context.escalationReason}</p>
                </div>
              )}

              {/* Suggested action */}
              {context?.suggestedAction && (
                <div className="p-4 rounded-xl bg-[#7C3AED]/5 border border-[#7C3AED]/20">
                  <p className="text-sm font-medium text-[#7C3AED] flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4" />
                    Suggested Action
                  </p>
                  <p className="text-sm text-[#8B949E]">{context.suggestedAction}</p>
                </div>
              )}

              {/* Conflict files */}
              {conflictFiles.length > 0 && (
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-sm font-medium text-red-400 flex items-center gap-2 mb-3">
                    <FileCode className="h-4 w-4" />
                    Conflict Files ({conflictFiles.length})
                  </p>
                  <ul className="space-y-1.5">
                    {conflictFiles.map((file) => (
                      <li
                        key={file}
                        className="flex items-center gap-2 text-xs font-mono text-[#8B949E] p-2 rounded bg-[#0D1117]/50"
                      >
                        <FileCode className="h-3.5 w-3.5 text-red-400" />
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!isLoading && review && activeTab === 'resolution' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-[#F0F6FC]" htmlFor="review-resolution">
                Resolution Notes <span className="text-[#8B949E] font-normal">(optional for approval)</span>
              </label>
              <textarea
                id="review-resolution"
                value={resolution}
                onChange={handleResolutionChange}
                placeholder="Add optional notes for approval..."
                className={cn(
                  "w-full resize-none rounded-xl px-4 py-3 text-sm",
                  "bg-[#0D1117] border border-[#30363D]",
                  "text-[#F0F6FC] placeholder:text-[#8B949E]",
                  "focus:outline-none focus:border-[#7C3AED]",
                  "focus:ring-2 focus:ring-[#7C3AED]/20",
                  "focus:shadow-[0_0_15px_rgba(124,58,237,0.15)]",
                  "transition-all duration-200"
                )}
                rows={8}
              />
            </div>
          )}

          {!isLoading && review && activeTab === 'feedback' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-[#F0F6FC]" htmlFor="review-feedback">
                Rejection Feedback <span className="text-red-400 font-normal">(required to reject)</span>
              </label>
              <textarea
                id="review-feedback"
                value={feedback}
                onChange={handleFeedbackChange}
                placeholder="Explain why the review is rejected..."
                className={cn(
                  "w-full resize-none rounded-xl px-4 py-3 text-sm",
                  "bg-[#0D1117] border border-[#30363D]",
                  "text-[#F0F6FC] placeholder:text-[#8B949E]",
                  "focus:outline-none focus:border-red-500/50",
                  "focus:ring-2 focus:ring-red-500/20",
                  "focus:shadow-[0_0_15px_rgba(239,68,68,0.15)]",
                  "transition-all duration-200"
                )}
                rows={8}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-[#30363D]/50 bg-[#0D1117]/30 gap-3">
          <Button
            variant="outline"
            onClick={() => void handleReject()}
            disabled={isSubmitting || !review}
            className={cn(
              "bg-red-500/10 border-red-500/30 text-red-400",
              "hover:bg-red-500/20 hover:border-red-500/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Reject
          </Button>
          <Button
            onClick={() => void handleApprove()}
            disabled={isSubmitting || !review}
            className={cn(
              "bg-gradient-to-r from-emerald-600 to-emerald-500",
              "hover:from-emerald-500 hover:to-emerald-400",
              "border-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
              "hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]",
              "transition-all duration-200"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
