/**
 * Nexus Design System - Design Tokens
 *
 * This file exports all design tokens as TypeScript constants for use in components.
 * These values mirror the CSS custom properties defined in index.css.
 *
 * Usage:
 *   import { colors, typography, spacing } from '@renderer/styles/tokens';
 */

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Background Colors
  bg: {
    dark: '#0D1117',
    card: '#161B22',
    hover: '#21262D',
    muted: '#1C2128',
    elevated: '#1F2937',
  },

  // Accent Colors
  accent: {
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    secondary: '#06B6D4',
    secondaryHover: '#0891B2',
    success: '#10B981',
    successHover: '#059669',
    warning: '#F59E0B',
    warningHover: '#D97706',
    error: '#EF4444',
    errorHover: '#DC2626',
    info: '#3B82F6',
    infoHover: '#2563EB',
  },

  // Text Colors
  text: {
    primary: '#F0F6FC',
    secondary: '#8B949E',
    tertiary: '#6E7681',
    inverse: '#0D1117',
    muted: '#484F58',
  },

  // Border Colors
  border: {
    default: '#30363D',
    focus: '#7C3AED',
    error: '#EF4444',
    success: '#10B981',
    subtle: '#21262D',
  },

  // Agent Type Colors
  agent: {
    planner: '#A78BFA',
    coder: '#60A5FA',
    tester: '#34D399',
    reviewer: '#FBBF24',
    merger: '#F472B6',
    architect: '#818CF8',
    debugger: '#FB923C',
    documenter: '#94A3B8',
  },

  // Status Colors
  status: {
    idle: '#6E7681',
    working: '#3B82F6',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    pending: '#8B949E',
  },

  // Priority Colors (MoSCoW)
  priority: {
    must: '#EF4444',
    should: '#F59E0B',
    could: '#3B82F6',
    wont: '#6E7681',
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Font Families
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace",
  },

  // Font Sizes (in rem)
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.75rem', // 28px
    '4xl': '2rem', // 32px
    '5xl': '2.5rem', // 40px
  },

  // Line Heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
  },

  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  md: '0.5rem', // 8px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 8px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
  xl: '0 12px 24px rgba(0, 0, 0, 0.6)',
  '2xl': '0 24px 48px rgba(0, 0, 0, 0.7)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
  glow: {
    primary: '0 0 20px rgba(124, 58, 237, 0.3)',
    secondary: '0 0 20px rgba(6, 182, 212, 0.3)',
    success: '0 0 20px rgba(16, 185, 129, 0.3)',
    error: '0 0 20px rgba(239, 68, 68, 0.3)',
    warning: '0 0 20px rgba(245, 158, 11, 0.3)',
  },
  // Layered elevation shadows for realistic depth (Linear-inspired)
  elevation: {
    1: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.15)',
    2: '0 2px 4px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.15)',
    3: '0 4px 8px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.2), 0 16px 32px rgba(0, 0, 0, 0.15)',
  },
  // Enhanced glow shadows with layered effects
  glowEnhanced: {
    primary: '0 4px 15px rgba(124, 58, 237, 0.35), 0 0 30px rgba(124, 58, 237, 0.15)',
    success: '0 4px 15px rgba(16, 185, 129, 0.35), 0 0 30px rgba(16, 185, 129, 0.15)',
    error: '0 4px 15px rgba(239, 68, 68, 0.35), 0 0 30px rgba(239, 68, 68, 0.15)',
    warning: '0 4px 15px rgba(245, 158, 11, 0.35), 0 0 30px rgba(245, 158, 11, 0.15)',
    info: '0 4px 15px rgba(59, 130, 246, 0.35), 0 0 30px rgba(59, 130, 246, 0.15)',
  },
} as const;

// =============================================================================
// ANIMATION
// =============================================================================

export const animation = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

// =============================================================================
// LAYOUT
// =============================================================================

export const layout = {
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1440px',
  },
  header: {
    height: '56px',
  },
  sidebar: {
    width: '240px',
    collapsedWidth: '64px',
  },
} as const;

// =============================================================================
// GRADIENTS - Premium gradient definitions for backgrounds and accents
// =============================================================================

export const gradients = {
  // Primary accent gradients
  primary: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
  primarySubtle: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',

  // Surface gradients for backgrounds
  surface: 'linear-gradient(180deg, #161B22 0%, #0D1117 100%)',
  card: 'linear-gradient(145deg, rgba(30, 35, 44, 0.9) 0%, rgba(22, 27, 34, 0.95) 100%)',

  // Mesh gradient for hero sections
  mesh: 'radial-gradient(ellipse 80% 50% at 10% 0%, rgba(124, 58, 237, 0.08) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(6, 182, 212, 0.06) 0%, transparent 50%)',

  // Status gradients
  success: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  error: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
  warning: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
  info: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
} as const;

// =============================================================================
// GLASSMORPHISM - Glass effect configurations
// =============================================================================

export const glassmorphism = {
  light: {
    background: 'rgba(22, 27, 34, 0.4)',
    blur: '8px',
  },
  medium: {
    background: 'rgba(22, 27, 34, 0.7)',
    blur: '12px',
  },
  heavy: {
    background: 'rgba(22, 27, 34, 0.85)',
    blur: '16px',
  },
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
} as const;

// =============================================================================
// AGENT TYPES
// =============================================================================

export type AgentType =
  | 'planner'
  | 'coder'
  | 'tester'
  | 'reviewer'
  | 'merger'
  | 'architect'
  | 'debugger'
  | 'documenter';

export type AgentStatus = 'idle' | 'working' | 'success' | 'error' | 'pending';

export type Priority = 'must' | 'should' | 'could' | 'wont';

export type TaskStatus = 'planned' | 'in_progress' | 'review' | 'complete' | 'failed';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the color for an agent type
 */
export function getAgentColor(type: AgentType): string {
  return colors.agent[type];
}

/**
 * Get the color for a status
 */
export function getStatusColor(status: AgentStatus): string {
  return colors.status[status];
}

/**
 * Get the color for a priority level
 */
export function getPriorityColor(priority: Priority): string {
  return colors.priority[priority];
}

/**
 * Get the agent label for display
 */
export function getAgentLabel(type: AgentType): string {
  const labels: Record<AgentType, string> = {
    planner: 'Planner',
    coder: 'Coder',
    tester: 'Tester',
    reviewer: 'Reviewer',
    merger: 'Merger',
    architect: 'Architect',
    debugger: 'Debugger',
    documenter: 'Documenter',
  };
  return labels[type];
}

/**
 * Get the agent icon name for Lucide
 */
export function getAgentIcon(type: AgentType): string {
  const icons: Record<AgentType, string> = {
    planner: 'Brain',
    coder: 'Code2',
    tester: 'TestTube2',
    reviewer: 'Eye',
    merger: 'GitMerge',
    architect: 'Building2',
    debugger: 'Bug',
    documenter: 'FileText',
  };
  return icons[type];
}

// =============================================================================
// CSS VARIABLE HELPERS
// =============================================================================

/**
 * Get a CSS custom property reference
 * @example cssVar('color-bg-dark') => 'var(--color-bg-dark)'
 */
export function cssVar(name: string): string {
  return `var(--${name})`;
}

/**
 * Get a CSS custom property reference with fallback
 * @example cssVarWithFallback('color-bg-dark', '#0D1117') => 'var(--color-bg-dark, #0D1117)'
 */
export function cssVarWithFallback(name: string, fallback: string): string {
  return `var(--${name}, ${fallback})`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  zIndex,
  layout,
  breakpoints,
  gradients,
  glassmorphism,
} as const;

export default tokens;
