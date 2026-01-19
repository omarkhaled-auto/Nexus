/**
 * useMediaQuery - Custom hook for responsive design
 *
 * Provides media query matching for responsive UI components.
 * Includes convenience hooks for common breakpoints.
 *
 * Breakpoints (matching Tailwind defaults):
 * - sm: 640px (mobile landscape)
 * - md: 768px (tablet)
 * - lg: 1024px (desktop)
 * - xl: 1280px (large desktop)
 * - 2xl: 1536px (extra large)
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Nexus breakpoint definitions
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Main useMediaQuery hook
 *
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if the media query matches
 *
 * @example
 * const isLargeScreen = useMediaQuery('(min-width: 1024px)');
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with a function to avoid SSR issues
  const getMatches = useCallback((): boolean => {
    // Check if window is available (for SSR compatibility)
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  }, [query]);

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener handler
    const handleChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    // Add event listener (use modern API with fallback)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Check if viewport is mobile (< 768px)
 *
 * @example
 * const isMobile = useIsMobile();
 * if (isMobile) {
 *   return <MobileLayout />;
 * }
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
}

/**
 * Check if viewport is tablet (768px - 1023px)
 *
 * @example
 * const isTablet = useIsTablet();
 */
export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
  );
}

/**
 * Check if viewport is desktop (>= 1024px)
 *
 * @example
 * const isDesktop = useIsDesktop();
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
}

/**
 * Check if viewport is large desktop (>= 1280px)
 */
export function useIsLargeDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);
}

/**
 * Check if viewport matches a minimum breakpoint
 *
 * @param breakpoint - Breakpoint name (sm, md, lg, xl, 2xl)
 * @returns boolean indicating if viewport >= breakpoint
 *
 * @example
 * const isAtLeastMd = useBreakpoint('md');
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]}px)`);
}

/**
 * Check if viewport is between two breakpoints (inclusive of min, exclusive of max)
 *
 * @param min - Minimum breakpoint
 * @param max - Maximum breakpoint
 *
 * @example
 * const isBetweenMdAndLg = useBreakpointRange('md', 'lg');
 */
export function useBreakpointRange(min: Breakpoint, max: Breakpoint): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS[min]}px) and (max-width: ${BREAKPOINTS[max] - 1}px)`
  );
}

/**
 * Get current breakpoint name
 *
 * @returns Current breakpoint name or 'xs' for smallest screens
 *
 * @example
 * const breakpoint = useCurrentBreakpoint();
 * // Returns: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 */
export function useCurrentBreakpoint(): Breakpoint | 'xs' {
  const is2xl = useMediaQuery(`(min-width: ${BREAKPOINTS['2xl']}px)`);
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
  const isSm = useMediaQuery(`(min-width: ${BREAKPOINTS.sm}px)`);

  if (is2xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
}

/**
 * Hook to get responsive value based on current breakpoint
 *
 * @param values - Object mapping breakpoints to values
 * @returns Value for current breakpoint (falls back to smaller breakpoints)
 *
 * @example
 * const columns = useResponsiveValue({
 *   xs: 1,
 *   sm: 2,
 *   md: 3,
 *   lg: 4,
 *   xl: 5
 * });
 */
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint | 'xs', T>>
): T | undefined {
  const breakpoint = useCurrentBreakpoint();

  // Define breakpoint order for fallback
  const order: (Breakpoint | 'xs')[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = order.indexOf(breakpoint);

  // Find the value for current breakpoint or fall back to smaller ones
  for (let i = currentIndex; i < order.length; i++) {
    const bp = order[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return undefined;
}

/**
 * Check if device supports touch
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

/**
 * Check if user prefers dark color scheme
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Check viewport orientation
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  return isPortrait ? 'portrait' : 'landscape';
}

/**
 * Combined responsive utilities hook
 *
 * @returns Object with all responsive utility values
 *
 * @example
 * const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();
 */
export function useResponsive() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const isLargeDesktop = useIsLargeDesktop();
  const breakpoint = useCurrentBreakpoint();
  const isTouchDevice = useIsTouchDevice();
  const orientation = useOrientation();

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    breakpoint,
    isTouchDevice,
    orientation,
    // Convenience booleans
    isMobileOrTablet: isMobile || isTablet,
    isTabletOrDesktop: isTablet || isDesktop,
  };
}
