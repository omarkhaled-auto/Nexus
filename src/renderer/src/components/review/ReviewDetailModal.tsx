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
import { Loader2 } from 'lucide-react';
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

const reasonLabels: Record<string, string> = {
  qa_exhausted: 'QA iterations exhausted',
  merge_conflict: 'Merge conflict detected',
  manual_request: 'Manual review requested',
};

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Review Details</DialogTitle>
          <DialogDescription>
            {review?.reason ? reasonLabels[review.reason] ?? review.reason : 'Pending review'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-accent-error/40 bg-accent-error/10 px-3 py-2 text-sm text-accent-error">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading review details...</span>
            </div>
          )}

          {!isLoading && review && (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-tertiary">Task ID:</span>
                  <span className="font-mono text-text-secondary">{review.taskId}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-tertiary">Project ID:</span>
                  <span className="font-mono text-text-secondary">{review.projectId}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-tertiary">Status:</span>
                  <span className="text-text-secondary capitalize">{review.status}</span>
                </div>
                {typeof context?.qaIterations === 'number' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-text-tertiary">QA Iterations:</span>
                    <span className="text-text-secondary">{context.qaIterations}</span>
                  </div>
                )}
                {context?.escalationReason && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-text-tertiary">Escalation:</span>
                    <span className="text-text-secondary">{context.escalationReason}</span>
                  </div>
                )}
                {context?.suggestedAction && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-text-tertiary">Suggested Action:</span>
                    <span className="text-text-secondary">{context.suggestedAction}</span>
                  </div>
                )}
              </div>

              {conflictFiles.length > 0 && (
                <div className="rounded-md border border-border-default bg-bg-muted/50 p-3">
                  <p className="text-sm font-medium text-text-primary">Conflict Files</p>
                  <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                    {conflictFiles.map((file) => (
                      <li key={file} className="font-mono">{file}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium" htmlFor="review-resolution">
                    Resolution Notes (optional)
                  </label>
                  <textarea
                    id="review-resolution"
                    value={resolution}
                    onChange={handleResolutionChange}
                    placeholder="Add optional notes for approval..."
                    className="mt-2 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium" htmlFor="review-feedback">
                    Rejection Feedback (required to reject)
                  </label>
                  <textarea
                    id="review-feedback"
                    value={feedback}
                    onChange={handleFeedbackChange}
                    placeholder="Explain why the review is rejected..."
                    className="mt-2 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => void handleReject()}
            disabled={isSubmitting || !review}
          >
            Reject
          </Button>
          <Button
            onClick={() => void handleApprove()}
            disabled={isSubmitting || !review}
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
