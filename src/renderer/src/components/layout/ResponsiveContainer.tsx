/**
 * ResponsiveContainer - Responsive layout wrapper component
 *
 * Provides responsive padding, max-width constraints, and centering
 * based on viewport size. Use as a wrapper for page content.
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Container size variant
   * - 'default': Standard responsive container with max-width
   * - 'full': Full width with responsive padding only
   * - 'narrow': Narrower max-width for focused content
   * - 'wide': Wider max-width for dashboards/data-heavy pages
   */
  size?: 'default' | 'full' | 'narrow' | 'wide';
  /**
   * Whether to add vertical padding
   */
  paddingY?: boolean;
  /**
   * Additional class names
   */
  className?: string;
  /**
   * Content to render
   */
  children: React.ReactNode;
}

/**
 * ResponsiveContainer component for consistent page layouts
 *
 * @example
 * <ResponsiveContainer>
 *   <h1>Page Title</h1>
 *   <p>Page content...</p>
 * </ResponsiveContainer>
 *
 * @example
 * <ResponsiveContainer size="narrow" paddingY>
 *   <article>Focused content...</article>
 * </ResponsiveContainer>
 */
export function ResponsiveContainer({
  size = 'default',
  paddingY = false,
  className,
  children,
  ...props
}: ResponsiveContainerProps): React.ReactElement {
  const sizeClasses = {
    default: 'responsive-container',
    full: 'w-full px-4 sm:px-6 lg:px-8',
    narrow: 'responsive-container max-w-3xl',
    wide: 'responsive-container max-w-7xl',
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        paddingY && 'py-responsive',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ResponsiveGrid - Responsive grid layout component
 *
 * Automatically adjusts column count based on viewport size.
 */
interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of columns at each breakpoint
   * @default { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }
   */
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /**
   * Gap size
   * @default 'md'
   */
  gap?: 'sm' | 'md' | 'lg';
  /**
   * Additional class names
   */
  className?: string;
  /**
   * Content to render
   */
  children: React.ReactNode;
}

export function ResponsiveGrid({
  cols = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  className,
  children,
  ...props
}: ResponsiveGridProps): React.ReactElement {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  // Generate responsive grid column classes
  const colClasses = [
    cols.xs && `grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cn('grid', gapClasses[gap], colClasses, className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ResponsiveStack - Responsive flex stack component
 *
 * Stacks children vertically on mobile, horizontally on larger screens.
 */
interface ResponsiveStackProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Breakpoint at which to switch from vertical to horizontal
   * @default 'md'
   */
  breakAt?: 'sm' | 'md' | 'lg';
  /**
   * Gap size
   * @default 'md'
   */
  gap?: 'sm' | 'md' | 'lg';
  /**
   * Alignment of items
   * @default 'stretch'
   */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /**
   * Whether to reverse the stack direction
   */
  reverse?: boolean;
  /**
   * Additional class names
   */
  className?: string;
  /**
   * Content to render
   */
  children: React.ReactNode;
}

export function ResponsiveStack({
  breakAt = 'md',
  gap = 'md',
  align = 'stretch',
  reverse = false,
  className,
  children,
  ...props
}: ResponsiveStackProps): React.ReactElement {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const breakClasses = {
    sm: reverse ? 'sm:flex-row-reverse' : 'sm:flex-row',
    md: reverse ? 'md:flex-row-reverse' : 'md:flex-row',
    lg: reverse ? 'lg:flex-row-reverse' : 'lg:flex-row',
  };

  return (
    <div
      className={cn(
        'flex',
        reverse ? 'flex-col-reverse' : 'flex-col',
        breakClasses[breakAt],
        gapClasses[gap],
        alignClasses[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ResponsiveSplit - Two-pane responsive layout
 *
 * Shows side-by-side on desktop, stacked on mobile.
 */
interface ResponsiveSplitProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Ratio of main to aside (e.g., '2:1' means main is twice the width of aside)
   * @default '3:2'
   */
  ratio?: '1:1' | '2:1' | '3:2' | '3:1' | '4:1';
  /**
   * Which pane appears first on mobile
   * @default 'main'
   */
  mobileFirst?: 'main' | 'aside';
  /**
   * Gap size
   * @default 'md'
   */
  gap?: 'sm' | 'md' | 'lg';
  /**
   * Breakpoint at which to switch to side-by-side
   * @default 'lg'
   */
  breakAt?: 'md' | 'lg' | 'xl';
  /**
   * Main content
   */
  main: React.ReactNode;
  /**
   * Aside content
   */
  aside: React.ReactNode;
  /**
   * Additional class names
   */
  className?: string;
}

export function ResponsiveSplit({
  ratio = '3:2',
  mobileFirst = 'main',
  gap = 'md',
  breakAt = 'lg',
  main,
  aside,
  className,
  ...props
}: ResponsiveSplitProps): React.ReactElement {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const ratioClasses: Record<string, { main: string; aside: string }> = {
    '1:1': { main: 'flex-1', aside: 'flex-1' },
    '2:1': { main: 'flex-[2]', aside: 'flex-1' },
    '3:2': { main: 'flex-[3]', aside: 'flex-[2]' },
    '3:1': { main: 'flex-[3]', aside: 'flex-1' },
    '4:1': { main: 'flex-[4]', aside: 'flex-1' },
  };

  const breakClasses = {
    md: 'md:flex-row',
    lg: 'lg:flex-row',
    xl: 'xl:flex-row',
  };

  const { main: mainFlex, aside: asideFlex } = ratioClasses[ratio];

  // Determine order based on mobileFirst
  const mainOrder = mobileFirst === 'main' ? 'order-1' : 'order-2';
  const asideOrder = mobileFirst === 'main' ? 'order-2' : 'order-1';

  return (
    <div
      className={cn('flex flex-col', breakClasses[breakAt], gapClasses[gap], className)}
      {...props}
    >
      <div className={cn(mainFlex, mainOrder, `${breakAt}:order-1`, 'min-w-0')}>
        {main}
      </div>
      <div className={cn(asideFlex, asideOrder, `${breakAt}:order-2`, 'min-w-0')}>
        {aside}
      </div>
    </div>
  );
}

/**
 * ShowOnMobile - Only shows content on mobile devices
 */
export function ShowOnMobile({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <div className={cn('md:hidden', className)}>{children}</div>;
}

/**
 * HideOnMobile - Hides content on mobile devices
 */
export function HideOnMobile({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <div className={cn('hidden md:block', className)}>{children}</div>;
}

/**
 * ShowOnDesktop - Only shows content on desktop devices
 */
export function ShowOnDesktop({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <div className={cn('hidden lg:block', className)}>{children}</div>;
}

/**
 * HideOnDesktop - Hides content on desktop devices
 */
export function HideOnDesktop({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <div className={cn('lg:hidden', className)}>{children}</div>;
}
