import { c as createLucideIcon, r as reactExports } from "./index-BAupzAA3.js";
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M21.801 10A10 10 0 1 1 17 3.335", key: "yps3ct" }],
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }]
];
const CircleCheckBig = createLucideIcon("circle-check-big", __iconNode);
function useCheckpoint() {
  const [checkpoints, setCheckpoints] = reactExports.useState([]);
  const [pendingReviews, setPendingReviews] = reactExports.useState([]);
  const [activeReview, setActiveReview] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const loadCheckpoints = reactExports.useCallback(async (projectId) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.nexusAPI.checkpointList(projectId);
      setCheckpoints(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);
  const createCheckpoint = reactExports.useCallback(async (projectId, reason) => {
    setIsLoading(true);
    setError(null);
    try {
      await window.nexusAPI.checkpointCreate(projectId, reason);
      const result = await window.nexusAPI.checkpointList(projectId);
      setCheckpoints(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);
  const restoreCheckpoint = reactExports.useCallback(async (checkpointId, restoreGit) => {
    setIsLoading(true);
    setError(null);
    try {
      await window.nexusAPI.checkpointRestore(checkpointId, restoreGit);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);
  const deleteCheckpoint = reactExports.useCallback(async (checkpointId) => {
    setIsLoading(true);
    setError(null);
    try {
      await window.nexusAPI.checkpointDelete(checkpointId);
      setCheckpoints((prev) => prev.filter((cp) => cp.id !== checkpointId));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);
  const loadPendingReviews = reactExports.useCallback(async () => {
    setError(null);
    try {
      const reviews = await window.nexusAPI.reviewList();
      const typedReviews = reviews;
      setPendingReviews(typedReviews);
      if (typedReviews.length > 0 && !activeReview) {
        setActiveReview(typedReviews[0] ?? null);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [activeReview]);
  const selectReview = reactExports.useCallback((review) => {
    setActiveReview(review);
  }, []);
  const approveReview = reactExports.useCallback(async (reviewId, resolution) => {
    setError(null);
    try {
      await window.nexusAPI.reviewApprove(reviewId, resolution);
      setPendingReviews((prev) => prev.filter((r) => r.id !== reviewId));
      if (activeReview?.id === reviewId) {
        setActiveReview(null);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [activeReview]);
  const rejectReview = reactExports.useCallback(async (reviewId, feedback) => {
    setError(null);
    try {
      await window.nexusAPI.reviewReject(reviewId, feedback);
      setPendingReviews((prev) => prev.filter((r) => r.id !== reviewId));
      if (activeReview?.id === reviewId) {
        setActiveReview(null);
      }
    } catch (err) {
      setError(err.message);
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
    rejectReview
  };
}
export {
  CircleCheckBig as C,
  useCheckpoint as u
};
