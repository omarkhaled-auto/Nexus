import { useState, type ReactElement, type ChangeEvent } from 'react';
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
import { AlertTriangle, CheckCircle2, XCircle, Loader2, MessageSquare, Lightbulb } from 'lucide-react';
import type { HumanReviewRequest } from '../../../../orchestration/review/HumanReviewService';

interface ReviewModalProps {
  review: HumanReviewRequest | null;
  onApprove: (reviewId: string, resolution?: string) => Promise<void>;
  onReject: (reviewId: string, feedback: string) => Promise<void>;
  onClose?: () => void;
}

/**
 * ReviewModal - Modal for human review with approve/reject actions
 *
 * Features:
 * - Displays review details (task, reason, context)
 * - Textarea for feedback/resolution notes
 * - Approve and reject buttons with glow effects
 * - Feedback required for rejection
 * - Glassmorphism design with status badges
 */
export function ReviewModal({ review, onApprove, onReject, onClose }: ReviewModalProps): ReactElement | null {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!review) return null;

  const handleApprove = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await onApprove(review.id, feedback || undefined);
      setFeedback('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!feedback.trim()) {
      return; // Require feedback for rejection
    }
    setIsSubmitting(true);
    try {
      await onReject(review.id, feedback);
      setFeedback('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setFeedback(e.target.value);
  };

  const handleOpenChange = (open: boolean): void => {
    if (!open && onClose) {
      onClose();
    }
  };

  const getReasonConfig = (reason: string): { icon: typeof AlertTriangle; label: string; color: string; glow: string } => {
    switch (reason) {
      case 'qa_exhausted':
        return {
          icon: AlertTriangle,
          label: `QA loop exhausted after ${String(review.context.qaIterations ?? 'unknown')} iterations`,
          color: 'text-amber-400',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]'
        };
      case 'merge_conflict':
        return {
          icon: XCircle,
          label: 'Merge conflict detected',
          color: 'text-red-400',
          glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]'
        };
      case 'manual_request':
        return {
          icon: MessageSquare,
          label: 'Manual review requested',
          color: 'text-[#7C3AED]',
          glow: 'shadow-[0_0_15px_rgba(124,58,237,0.3)]'
        };
      default:
        return {
          icon: AlertTriangle,
          label: 'Review required',
          color: 'text-[#8B949E]',
          glow: ''
        };
    }
  };

  const reasonConfig = getReasonConfig(review.reason);
  const ReasonIcon = reasonConfig.icon;

  return (
    <Dialog open={!!review} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[520px] p-0 overflow-hidden",
        "bg-[#161B22]/95 backdrop-blur-xl",
        "border border-[#30363D]",
        "shadow-[0_24px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(124,58,237,0.1)]",
        "rounded-2xl"
      )}>
        {/* Header */}
        <DialogHeader className="relative px-6 pt-6 pb-4 border-b border-[#30363D]/50">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />

          <div className="flex items-start gap-4">
            {/* Status icon with glow */}
            <div className={cn(
              "relative p-3 rounded-xl",
              "bg-amber-500/10 border border-amber-500/20",
              reasonConfig.glow
            )}>
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>

            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-[#F0F6FC]">
                Human Review Required
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2">
                <ReasonIcon className={cn("h-4 w-4", reasonConfig.color)} />
                <span className={reasonConfig.color}>{reasonConfig.label}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Task ID badge */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0D1117]/50 border border-[#30363D]/50">
            <span className="text-xs uppercase tracking-wider text-[#8B949E]">Task ID</span>
            <code className="text-sm font-mono text-[#F0F6FC] bg-[#21262D] px-2 py-0.5 rounded">
              {review.taskId}
            </code>
          </div>

          {/* Escalation reason */}
          {review.context.escalationReason && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#F0F6FC] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Reason
              </p>
              <p className="text-sm text-[#8B949E] pl-6">{review.context.escalationReason}</p>
            </div>
          )}

          {/* Suggested action */}
          {review.context.suggestedAction && (
            <div className="p-3 rounded-lg bg-[#7C3AED]/5 border border-[#7C3AED]/20">
              <p className="text-sm font-medium text-[#F0F6FC] flex items-center gap-2 mb-1">
                <Lightbulb className="h-4 w-4 text-[#7C3AED]" />
                Suggested Action
              </p>
              <p className="text-sm text-[#8B949E] pl-6">{review.context.suggestedAction}</p>
            </div>
          )}

          {/* Feedback textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#F0F6FC]" htmlFor="review-feedback">
              Feedback <span className="text-[#8B949E] font-normal">(required for rejection)</span>
            </label>
            <textarea
              id="review-feedback"
              value={feedback}
              onChange={handleFeedbackChange}
              placeholder="Enter feedback or resolution notes..."
              className={cn(
                "w-full resize-none rounded-lg px-4 py-3 text-sm",
                "bg-[#0D1117] border border-[#30363D]",
                "text-[#F0F6FC] placeholder:text-[#8B949E]",
                "focus:outline-none focus:border-[#7C3AED]",
                "focus:ring-2 focus:ring-[#7C3AED]/20",
                "focus:shadow-[0_0_15px_rgba(124,58,237,0.15)]",
                "transition-all duration-200"
              )}
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-[#30363D]/50 bg-[#0D1117]/30 gap-3">
          <Button
            variant="outline"
            onClick={() => void handleReject()}
            disabled={isSubmitting || !feedback.trim()}
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
            disabled={isSubmitting}
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
