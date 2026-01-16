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
 * - Approve and reject buttons
 * - Feedback required for rejection
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

  const getReasonDescription = (reason: string): string => {
    switch (reason) {
      case 'qa_exhausted':
        return `QA loop exhausted after ${String(review.context.qaIterations ?? 'unknown')} iterations`;
      case 'merge_conflict':
        return 'Merge conflict detected';
      case 'manual_request':
        return 'Manual review requested';
      default:
        return 'Review required';
    }
  };

  return (
    <Dialog open={!!review} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Human Review Required</DialogTitle>
          <DialogDescription>
            {getReasonDescription(review.reason)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm font-medium">Task ID</p>
            <p className="text-sm text-muted-foreground font-mono">{review.taskId}</p>
          </div>

          {review.context.escalationReason && (
            <div>
              <p className="text-sm font-medium">Reason</p>
              <p className="text-sm text-muted-foreground">{review.context.escalationReason}</p>
            </div>
          )}

          {review.context.suggestedAction && (
            <div>
              <p className="text-sm font-medium">Suggested Action</p>
              <p className="text-sm text-muted-foreground">{review.context.suggestedAction}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium" htmlFor="review-feedback">
              Feedback (required for rejection)
            </label>
            <textarea
              id="review-feedback"
              value={feedback}
              onChange={handleFeedbackChange}
              placeholder="Enter feedback or resolution notes..."
              className="mt-2 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => void handleReject()}
            disabled={isSubmitting || !feedback.trim()}
          >
            Reject
          </Button>
          <Button onClick={() => void handleApprove()} disabled={isSubmitting}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
