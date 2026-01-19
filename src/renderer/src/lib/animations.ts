/**
 * Nexus Animation Utilities
 *
 * Provides reusable animation configurations, custom hooks for motion preferences,
 * and framer-motion variants for consistent micro-interactions across the UI.
 */

import type { Variants, Transition } from 'framer-motion';

// =============================================================================
// ANIMATION CONSTANTS
// =============================================================================

/**
 * Standard animation durations (in seconds)
 */
export const DURATIONS = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  slower: 0.5,
} as const;

/**
 * Standard easing functions
 */
export const EASINGS = {
  default: [0.4, 0, 0.2, 1] as const,
  in: [0.4, 0, 1, 1] as const,
  out: [0, 0, 0.2, 1] as const,
  inOut: [0.4, 0, 0.2, 1] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
  spring: { type: 'spring', stiffness: 400, damping: 30 },
  springBouncy: { type: 'spring', stiffness: 500, damping: 25 },
  springSmooth: { type: 'spring', stiffness: 300, damping: 30 },
} as const;

// =============================================================================
// FRAMER-MOTION VARIANTS
// =============================================================================

/**
 * Page transition variants
 */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const pageTransition: Transition = {
  duration: DURATIONS.normal,
  ease: EASINGS.out,
};

/**
 * Modal/Dialog variants
 */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const modalTransition: Transition = {
  duration: DURATIONS.normal,
  ease: EASINGS.out,
};

/**
 * Overlay/Backdrop variants
 */
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const overlayTransition: Transition = {
  duration: DURATIONS.fast,
};

/**
 * Toast notification variants
 */
export const toastVariants: Variants = {
  hidden: { opacity: 0, x: 100, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 100, scale: 0.95 },
};

export const toastTransition: Transition = {
  duration: DURATIONS.slow,
  ease: EASINGS.bounce,
};

/**
 * Dropdown/Popover variants
 */
export const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: -5, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -5, scale: 0.95 },
};

export const dropdownTransition: Transition = {
  duration: DURATIONS.fast,
  ease: EASINGS.out,
};

/**
 * Slide-in variants (configurable direction)
 */
export const slideInVariants = (direction: 'up' | 'down' | 'left' | 'right' = 'up'): Variants => {
  const offset = 10;
  const transforms = {
    up: { y: offset },
    down: { y: -offset },
    left: { x: offset },
    right: { x: -offset },
  };

  return {
    hidden: { opacity: 0, ...transforms[direction] },
    visible: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, ...transforms[direction] },
  };
};

/**
 * Scale variants for buttons, cards, etc.
 */
export const scaleVariants: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

/**
 * Card hover variants
 */
export const cardHoverVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    borderColor: '#30363D',
  },
  hover: {
    scale: 1.01,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
    borderColor: '#7C3AED',
  },
};

/**
 * List item stagger variants for container
 */
export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

/**
 * List item variants for children
 */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.out,
    },
  },
};

/**
 * Fade variants
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Expand/Collapse variants (for accordions)
 */
export const expandVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    overflow: 'visible',
  },
};

export const expandTransition: Transition = {
  duration: DURATIONS.slow,
  ease: EASINGS.inOut,
};

/**
 * Progress bar variants
 */
export const progressVariants: Variants = {
  initial: { width: 0 },
  animate: (width: number) => ({
    width: `${width}%`,
    transition: {
      duration: DURATIONS.slow,
      ease: EASINGS.out,
    },
  }),
};

/**
 * Status indicator pulse
 */
export const pulseVariants: Variants = {
  idle: { scale: 1, opacity: 1 },
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Typing cursor blink
 */
export const cursorBlinkVariants: Variants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

/**
 * Skeleton shimmer (for CSS animation trigger)
 */
export const skeletonVariants: Variants = {
  loading: {
    opacity: 1,
    transition: {
      duration: 0,
    },
  },
};

// =============================================================================
// SPRING CONFIGURATIONS
// =============================================================================

export const springs = {
  /** Snappy, responsive spring */
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as const,
  /** Bouncy, playful spring */
  bouncy: { type: 'spring', stiffness: 500, damping: 25 } as const,
  /** Smooth, gentle spring */
  smooth: { type: 'spring', stiffness: 300, damping: 30 } as const,
  /** Very gentle, slow spring */
  gentle: { type: 'spring', stiffness: 200, damping: 25 } as const,
  /** Quick and crisp */
  quick: { type: 'spring', stiffness: 600, damping: 35 } as const,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a delayed transition
 */
export function withDelay(transition: Transition, delay: number): Transition {
  return { ...transition, delay };
}

/**
 * Create a staggered children transition
 */
export function withStagger(staggerDelay: number = 0.05): Transition {
  return {
    staggerChildren: staggerDelay,
  };
}

/**
 * Create custom spring transition
 */
export function createSpring(stiffness: number, damping: number): Transition {
  return { type: 'spring', stiffness, damping };
}

/**
 * Combine multiple variants
 */
export function mergeVariants(...variants: Variants[]): Variants {
  return variants.reduce((acc, variant) => ({ ...acc, ...variant }), {});
}

// =============================================================================
// CSS CLASS UTILITIES
// =============================================================================

/**
 * Animation class names for CSS-based animations
 */
export const animationClasses = {
  // Fade animations
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',

  // Slide animations
  slideInUp: 'animate-slide-in-up',
  slideInDown: 'animate-slide-in-down',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',

  // Scale animations
  scaleIn: 'animate-scale-in',
  scaleOut: 'animate-scale-out',

  // Status animations
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  statusPulse: 'animate-status-pulse',

  // Special animations
  shimmer: 'animate-shimmer',
  cursorBlink: 'animate-cursor-blink',
  progressIndeterminate: 'animate-progress-indeterminate',
};

/**
 * Get animation delay class
 */
export function getDelayClass(delayMs: number): string {
  const delays: Record<number, string> = {
    75: 'delay-75',
    100: 'delay-100',
    150: 'delay-150',
    200: 'delay-200',
    300: 'delay-300',
    500: 'delay-500',
    700: 'delay-700',
    1000: 'delay-1000',
  };
  return delays[delayMs] || '';
}

/**
 * Get animation duration class
 */
export function getDurationClass(durationMs: number): string {
  const durations: Record<number, string> = {
    75: 'duration-75',
    100: 'duration-100',
    150: 'duration-150',
    200: 'duration-200',
    300: 'duration-300',
    500: 'duration-500',
    700: 'duration-700',
    1000: 'duration-1000',
  };
  return durations[durationMs] || 'duration-200';
}

export default {
  DURATIONS,
  EASINGS,
  pageVariants,
  pageTransition,
  modalVariants,
  modalTransition,
  overlayVariants,
  overlayTransition,
  toastVariants,
  toastTransition,
  dropdownVariants,
  dropdownTransition,
  slideInVariants,
  scaleVariants,
  cardHoverVariants,
  listContainerVariants,
  listItemVariants,
  fadeVariants,
  expandVariants,
  expandTransition,
  progressVariants,
  pulseVariants,
  springs,
  animationClasses,
};
