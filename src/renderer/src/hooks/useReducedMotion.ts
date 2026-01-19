/**
 * useReducedMotion Hook
 *
 * Detects if the user prefers reduced motion and provides
 * utilities for conditional animations.
 *
 * @example
 * ```tsx
 * const { prefersReducedMotion, getTransition, getAnimationProps } = useReducedMotion();
 *
 * // Use conditional transition
 * <motion.div transition={getTransition({ duration: 0.3 })} />
 *
 * // Skip animations entirely when reduced motion is preferred
 * <motion.div {...getAnimationProps(pageVariants, { key: 'page' })} />
 * ```
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Variants, Transition, MotionProps } from 'framer-motion';

export interface UseReducedMotionReturn {
  /** Whether the user prefers reduced motion */
  prefersReducedMotion: boolean;

  /** Get a transition that respects reduced motion preference */
  getTransition: (transition: Transition) => Transition;

  /** Get animation props that respect reduced motion preference */
  getAnimationProps: (
    variants: Variants,
    additionalProps?: Partial<MotionProps>
  ) => Partial<MotionProps>;

  /** Get a duration that respects reduced motion (returns 0 if reduced motion) */
  getDuration: (duration: number) => number;

  /** Check if animations should be enabled */
  shouldAnimate: boolean;
}

/**
 * Instant transition for reduced motion users
 */
const instantTransition: Transition = {
  duration: 0,
};

/**
 * Hook to detect and respond to reduced motion preferences
 */
export function useReducedMotion(): UseReducedMotionReturn {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Update state when preference changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    mediaQuery.addEventListener?.('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener?.('change', handleChange);
    };
  }, []);

  /**
   * Get a transition that respects reduced motion preference
   */
  const getTransition = useCallback(
    (transition: Transition): Transition => {
      if (prefersReducedMotion) {
        return instantTransition;
      }
      return transition;
    },
    [prefersReducedMotion]
  );

  /**
   * Get animation props that respect reduced motion preference
   */
  const getAnimationProps = useCallback(
    (variants: Variants, additionalProps: Partial<MotionProps> = {}): Partial<MotionProps> => {
      if (prefersReducedMotion) {
        // Return minimal props without animations
        return {
          initial: false,
          animate: 'visible',
          ...additionalProps,
        };
      }

      return {
        variants,
        initial: 'hidden',
        animate: 'visible',
        exit: 'exit',
        ...additionalProps,
      };
    },
    [prefersReducedMotion]
  );

  /**
   * Get a duration that respects reduced motion
   */
  const getDuration = useCallback(
    (duration: number): number => {
      return prefersReducedMotion ? 0 : duration;
    },
    [prefersReducedMotion]
  );

  /**
   * Whether animations should be enabled
   */
  const shouldAnimate = useMemo(() => !prefersReducedMotion, [prefersReducedMotion]);

  return {
    prefersReducedMotion,
    getTransition,
    getAnimationProps,
    getDuration,
    shouldAnimate,
  };
}

/**
 * Simplified hook that just returns the preference boolean
 */
export function usePrefersReducedMotion(): boolean {
  const { prefersReducedMotion } = useReducedMotion();
  return prefersReducedMotion;
}

export default useReducedMotion;
