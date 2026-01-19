/**
 * TypingIndicator Component
 *
 * A visual indicator showing that someone is typing, commonly used in chat interfaces.
 * Features animated bouncing dots.
 *
 * @example
 * ```tsx
 * // Basic usage
 * {isTyping && <TypingIndicator />}
 *
 * // With label
 * <TypingIndicator label="AI is thinking..." />
 *
 * // Different sizes
 * <TypingIndicator size="lg" />
 * ```
 */

import React from 'react';
import { cn } from '@renderer/lib/utils';

export interface TypingIndicatorProps {
  /** Optional label to display alongside the dots */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom className */
  className?: string;
  /** Color variant */
  variant?: 'default' | 'primary' | 'muted';
  /** data-testid for testing */
  'data-testid'?: string;
}

const sizeClasses = {
  sm: {
    container: 'gap-1 px-2 py-1',
    dot: 'w-1.5 h-1.5',
    label: 'text-xs',
  },
  md: {
    container: 'gap-1.5 px-3 py-2',
    dot: 'w-2 h-2',
    label: 'text-sm',
  },
  lg: {
    container: 'gap-2 px-4 py-3',
    dot: 'w-2.5 h-2.5',
    label: 'text-base',
  },
};

const variantClasses = {
  default: {
    container: 'bg-[#161B22]',
    dot: 'bg-[#8B949E]',
    label: 'text-[#8B949E]',
  },
  primary: {
    container: 'bg-[#7C3AED]/10',
    dot: 'bg-[#7C3AED]',
    label: 'text-[#7C3AED]',
  },
  muted: {
    container: 'bg-transparent',
    dot: 'bg-[#6E7681]',
    label: 'text-[#6E7681]',
  },
};

export const TypingIndicator = React.forwardRef<HTMLDivElement, TypingIndicatorProps>(
  (
    {
      label,
      size = 'md',
      variant = 'default',
      className,
      'data-testid': testId = 'typing-indicator',
    },
    ref
  ) => {
    const sizes = sizeClasses[size];
    const variants = variantClasses[variant];

    return (
      <div
        ref={ref}
        data-testid={testId}
        className={cn(
          'inline-flex items-center rounded-full',
          sizes.container,
          variants.container,
          className
        )}
        role="status"
        aria-label={label || 'Typing...'}
      >
        {/* Animated dots */}
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={cn(
                'rounded-full typing-dot',
                sizes.dot,
                variants.dot
              )}
              style={{ animationDelay: `${index * 0.2}s` }}
            />
          ))}
        </span>

        {/* Optional label */}
        {label && (
          <span className={cn('ml-2', sizes.label, variants.label)}>
            {label}
          </span>
        )}
      </div>
    );
  }
);

TypingIndicator.displayName = 'TypingIndicator';

export default TypingIndicator;
