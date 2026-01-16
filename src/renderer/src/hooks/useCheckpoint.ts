import { useState, useCallback } from 'react';
import type { Checkpoint } from '../../../persistence/database/schema';
import type { HumanReviewRequest } from '../../../orchestration/review/HumanReviewService';

interface UseCheckpointReturn {
  // Checkpoint state
  checkpoints: Checkpoint[];
  isLoading: boolean;
  error: string | null;

  // Checkpoint actions
  loadCheckpoints: (projectId: string) => Promise<void>;
  createCheckpoint: (projectId: string, reason: string) => Promise<void>;
  restoreCheckpoint: (checkpointId: string, restoreGit?: boolean) => Promise<void>;
  deleteCheckpoint: (checkpointId: string) => Promise<void>;

  // Review state
  pendingReviews: HumanReviewRequest[];
  activeReview: HumanReviewRequest | null;

  // Review actions
  loadPendingReviews: () => Promise<void>;
  selectReview: (review: HumanReviewRequest | null) => void;
  approveReview: (reviewId: string, resolution?: string) => Promise<void>;
  rejectReview: (reviewId: string, feedback: string) => Promise<void>;
}

/**
 * useCheckpoint - Hook for managing checkpoints and human reviews
 *
 * Provides state and actions for:
 * - Listing, creating, restoring, and deleting checkpoints
 * - Listing pending reviews and approving/rejecting them
 */
export function useCheckpoint(): UseCheckpointReturn {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [pendingReviews, setPendingReviews] = useState<HumanReviewRequest[]>([]);
  const [activeReview, setActiveReview] = useState<HumanReviewRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCheckpoints = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.nexusAPI.checkpointList(projectId);
      setCheckpoints(result as Checkpoint[]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCheckpoint = useCallback(async (projectId: string, reason: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await window.nexusAPI.checkpointCreate(projectId, reason);
      // Reload checkpoints after creation
      const result = await window.nexusAPI.checkpointList(projectId);
      setCheckpoints(result as Checkpoint[]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restoreCheckpoint = useCallback(async (checkpointId: string, restoreGit?: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      await window.nexusAPI.checkpointRestore(checkpointId, restoreGit);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteCheckpoint = useCallback(async (checkpointId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await window.nexusAPI.checkpointDelete(checkpointId);
      setCheckpoints(prev => prev.filter(cp => cp.id !== checkpointId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPendingReviews = useCallback(async () => {
    setError(null);
    try {
      const reviews = await window.nexusAPI.reviewList();
      const typedReviews = reviews as HumanReviewRequest[];
      setPendingReviews(typedReviews);
      // Set active review to first pending if none is active
      if (typedReviews.length > 0 && !activeReview) {
        setActiveReview(typedReviews[0] ?? null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [activeReview]);

  const selectReview = useCallback((review: HumanReviewRequest | null) => {
    setActiveReview(review);
  }, []);

  const approveReview = useCallback(async (reviewId: string, resolution?: string) => {
    setError(null);
    try {
      await window.nexusAPI.reviewApprove(reviewId, resolution);
      setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
      if (activeReview?.id === reviewId) {
        setActiveReview(null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [activeReview]);

  const rejectReview = useCallback(async (reviewId: string, feedback: string) => {
    setError(null);
    try {
      await window.nexusAPI.reviewReject(reviewId, feedback);
      setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
      if (activeReview?.id === reviewId) {
        setActiveReview(null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [activeReview]);

  return {
    checkpoints,
    isLoading,
    error,
    loadCheckpoints,
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
    pendingReviews,
    activeReview,
    loadPendingReviews,
    selectReview,
    approveReview,
    rejectReview,
  };
}
