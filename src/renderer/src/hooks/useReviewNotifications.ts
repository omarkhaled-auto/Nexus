import { useCallback, useEffect, useState } from 'react';
import { toast } from '@renderer/lib/toast';

interface ReviewRequestedPayload {
  reviewId: string;
  taskId: string;
  reason: string;
  context: unknown;
}

interface ReviewApprovedPayload {
  reviewId: string;
  resolution?: string;
}

interface ReviewRejectedPayload {
  reviewId: string;
  feedback: string;
}

function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof window.nexusAPI !== 'undefined';
}

export function useReviewNotifications(): {
  pendingCount: number;
  activeReviewId: string | null;
  openReview: (reviewId: string) => void;
  closeReview: () => void;
  refreshPending: () => Promise<void>;
} {
  const [pendingCount, setPendingCount] = useState(0);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    if (!isElectronEnvironment()) {
      setPendingCount(0);
      return;
    }

    try {
      const reviews = await window.nexusAPI.reviewList();
      setPendingCount(Array.isArray(reviews) ? reviews.length : 0);
    } catch (err) {
      console.error('Failed to load pending reviews:', err);
    }
  }, []);

  const openReview = useCallback((reviewId: string) => {
    setActiveReviewId(reviewId);
  }, []);

  const closeReview = useCallback(() => {
    setActiveReviewId(null);
  }, []);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    if (!isElectronEnvironment()) return;

    const unsubscribeRequested = window.nexusAPI.onReviewRequested((payload: ReviewRequestedPayload) => {
      void refreshPending();
      toast.warning('Human review requested', {
        description: `Task ${payload.taskId} requires attention.`,
        action: {
          label: 'Open',
          onClick: () => {
            openReview(payload.reviewId);
          },
        },
      });
    });

    const unsubscribeApproved = window.nexusAPI.onReviewApproved((payload: ReviewApprovedPayload) => {
      void refreshPending();
      toast.success('Review approved', {
        description: payload.resolution ? payload.resolution : 'Execution can continue.',
      });
    });

    const unsubscribeRejected = window.nexusAPI.onReviewRejected((payload: ReviewRejectedPayload) => {
      void refreshPending();
      toast.error('Review rejected', {
        description: payload.feedback || 'Please check the review details.',
      });
    });

    return () => {
      unsubscribeRequested();
      unsubscribeApproved();
      unsubscribeRejected();
    };
  }, [openReview, refreshPending]);

  return {
    pendingCount,
    activeReviewId,
    openReview,
    closeReview,
    refreshPending,
  };
}
