/**
 * AnimatedList Component
 *
 * A wrapper component that provides staggered entrance animations for list items.
 * Uses framer-motion for smooth, performant animations.
 *
 * @example
 * ```tsx
 * <AnimatedList>
 *   {items.map((item) => (
 *     <AnimatedListItem key={item.id}>
 *       <Card>{item.name}</Card>
 *     </AnimatedListItem>
 *   ))}
 * </AnimatedList>
 * ```
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@renderer/lib/utils';
import { usePrefersReducedMotion } from '@renderer/hooks';
import {
  listContainerVariants,
  listItemVariants,
  DURATIONS,
  EASINGS,
} from '@renderer/lib/animations';

// =============================================================================
// AnimatedList Container
// =============================================================================

export interface AnimatedListProps {
  children: React.ReactNode;
  /** Delay between each item animation */
  staggerDelay?: number;
  /** Custom className */
  className?: string;
  /** Render as a different element */
  as?: 'ul' | 'ol' | 'div';
  /** data-testid for testing */
  'data-testid'?: string;
}

export const AnimatedList = React.forwardRef<HTMLElement, AnimatedListProps>(
  (
    {
      children,
      staggerDelay = 0.05,
      className,
      as = 'div',
      'data-testid': testId,
    },
    ref
  ) => {
    const prefersReducedMotion = usePrefersReducedMotion();
    const Component = motion[as];

    const containerVariants = {
      hidden: { opacity: prefersReducedMotion ? 1 : 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
        },
      },
    };

    return (
      <Component
        ref={ref as React.Ref<HTMLDivElement & HTMLUListElement & HTMLOListElement>}
        data-testid={testId}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={className}
      >
        {children}
      </Component>
    );
  }
);

AnimatedList.displayName = 'AnimatedList';

// =============================================================================
// AnimatedListItem
// =============================================================================

export interface AnimatedListItemProps {
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Animation direction */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Render as a different element */
  as?: 'li' | 'div';
  /** data-testid for testing */
  'data-testid'?: string;
}

export const AnimatedListItem = React.forwardRef<HTMLElement, AnimatedListItemProps>(
  (
    {
      children,
      className,
      direction = 'up',
      as = 'div',
      'data-testid': testId,
    },
    ref
  ) => {
    const prefersReducedMotion = usePrefersReducedMotion();
    const Component = motion[as];

    const offsets = {
      up: { y: 10 },
      down: { y: -10 },
      left: { x: 10 },
      right: { x: -10 },
    };

    const itemVariants = {
      hidden: prefersReducedMotion
        ? { opacity: 1, x: 0, y: 0 }
        : { opacity: 0, ...offsets[direction] },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          duration: DURATIONS.normal,
          ease: EASINGS.out,
        },
      },
    };

    return (
      <Component
        ref={ref as React.Ref<HTMLDivElement & HTMLLIElement>}
        data-testid={testId}
        variants={itemVariants}
        className={className}
      >
        {children}
      </Component>
    );
  }
);

AnimatedListItem.displayName = 'AnimatedListItem';

// =============================================================================
// AnimatedPresenceList (for dynamic lists with enter/exit)
// =============================================================================

export interface AnimatedPresenceListProps {
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Render as a different element */
  as?: 'ul' | 'ol' | 'div';
  /** data-testid for testing */
  'data-testid'?: string;
}

export const AnimatedPresenceList: React.FC<AnimatedPresenceListProps> = ({
  children,
  className,
  as: Tag = 'div',
  'data-testid': testId,
}) => {
  return (
    <Tag data-testid={testId} className={className}>
      <AnimatePresence mode="popLayout">{children}</AnimatePresence>
    </Tag>
  );
};

// =============================================================================
// AnimatedPresenceItem (for items that can be added/removed)
// =============================================================================

export interface AnimatedPresenceItemProps {
  children: React.ReactNode;
  /** Unique key for AnimatePresence */
  layoutId?: string;
  /** Custom className */
  className?: string;
  /** data-testid for testing */
  'data-testid'?: string;
}

export const AnimatedPresenceItem = React.forwardRef<HTMLDivElement, AnimatedPresenceItemProps>(
  ({ children, layoutId, className, 'data-testid': testId }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();

    const variants = {
      initial: prefersReducedMotion
        ? { opacity: 1, scale: 1 }
        : { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: prefersReducedMotion
        ? { opacity: 1, scale: 1 }
        : { opacity: 0, scale: 0.95 },
    };

    return (
      <motion.div
        ref={ref}
        data-testid={testId}
        layout={!prefersReducedMotion}
        layoutId={layoutId}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: prefersReducedMotion ? 0 : DURATIONS.normal,
          ease: EASINGS.out,
        }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedPresenceItem.displayName = 'AnimatedPresenceItem';

export default AnimatedList;
