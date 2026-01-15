import { useEffect, useCallback, useRef, useState } from 'react';
import { useInterviewStore } from '@renderer/stores/interviewStore';
import type { InterviewStage, InterviewMessage, Requirement } from '@renderer/types/interview';

const STORAGE_KEY = 'nexus:interview:draft';
const DRAFT_EXPIRY_HOURS = 24;
const DEBOUNCE_DELAY_MS = 1000;

interface SavedDraft {
  stage: InterviewStage;
  messages: InterviewMessage[];
  requirements: Requirement[];
  projectName: string | null;
  savedAt: string;
}

/**
 * Simple debounce helper
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout>;

  const debounced = ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T & { cancel: () => void };

  debounced.cancel = () => clearTimeout(timer);

  return debounced;
}

/**
 * useInterviewPersistence - Persists interview state to localStorage.
 *
 * Features:
 * - Auto-saves interview state with debounce (1 second)
 * - Restores from localStorage on mount
 * - 24-hour draft expiry
 * - Draft saved indicator
 *
 * @returns Object with restore function, clearDraft function, and isSaving state
 */
export function useInterviewPersistence() {
  const { stage, messages, requirements, projectName, setStage, addMessage, addRequirement, setProjectName, reset } =
    useInterviewStore();

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Track if we've done initial restore
  const hasRestoredRef = useRef(false);

  // Create debounced save function
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

  // Initialize debounced save
  useEffect(() => {
    debouncedSaveRef.current = debounce(() => {
      const state: SavedDraft = {
        stage,
        messages,
        requirements,
        projectName,
        savedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setLastSaved(new Date());
      } catch (error) {
        console.error('Failed to save interview draft:', error);
      }

      setIsSaving(false);
    }, DEBOUNCE_DELAY_MS);

    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, []);

  // Auto-save on state changes (after initial restore)
  useEffect(() => {
    if (!hasRestoredRef.current) return;

    setIsSaving(true);
    debouncedSaveRef.current?.();
  }, [stage, messages, requirements, projectName]);

  // Restore from localStorage
  const restore = useCallback((): SavedDraft | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const state: SavedDraft = JSON.parse(saved);

      // Check if draft has expired
      const savedAt = new Date(state.savedAt);
      const hoursSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSince >= DRAFT_EXPIRY_HOURS) {
        // Draft expired, clear it
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return state;
    } catch (error) {
      console.error('Failed to restore interview draft:', error);
      return null;
    }
  }, []);

  // Apply restored draft to store
  const applyDraft = useCallback(
    (draft: SavedDraft) => {
      // Reset first to clear any existing state
      reset();

      // Apply saved state
      setStage(draft.stage);
      if (draft.projectName) {
        setProjectName(draft.projectName);
      }

      // Add messages one by one
      draft.messages.forEach((msg) => {
        addMessage(msg);
      });

      // Add requirements one by one
      draft.requirements.forEach((req) => {
        addRequirement(req);
      });

      // Mark as restored
      hasRestoredRef.current = true;
      setLastSaved(new Date(draft.savedAt));
    },
    [reset, setStage, setProjectName, addMessage, addRequirement]
  );

  // Clear draft from storage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
    } catch (error) {
      console.error('Failed to clear interview draft:', error);
    }
  }, []);

  // Mark as restored if no draft exists (so auto-save starts working)
  const markAsInitialized = useCallback(() => {
    hasRestoredRef.current = true;
  }, []);

  return {
    restore,
    applyDraft,
    clearDraft,
    markAsInitialized,
    isSaving,
    lastSaved,
  };
}
