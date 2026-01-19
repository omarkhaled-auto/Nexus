# Nexus Component Library Specification

This document defines the complete component library for the Nexus UI redesign, including all base components, composite components, and page-specific components.

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Base Components](#base-components)
3. [Form Components](#form-components)
4. [Feedback Components](#feedback-components)
5. [Layout Components](#layout-components)
6. [Navigation Components](#navigation-components)
7. [Data Display Components](#data-display-components)
8. [Agent-Specific Components](#agent-specific-components)
9. [Page-Specific Components](#page-specific-components)
10. [Utility Components](#utility-components)

---

## Design Tokens

### Color Tokens

```typescript
// src/renderer/src/styles/tokens.ts

export const colors = {
  // Backgrounds
  bgDark: '#0D1117',           // Main background
  bgCard: '#161B22',           // Card/elevated surfaces
  bgHover: '#21262D',          // Interactive hover states
  bgMuted: '#1C2128',          // Muted backgrounds

  // Accent Colors
  accentPrimary: '#7C3AED',    // Nexus Purple - AI/Intelligence
  accentSecondary: '#06B6D4',  // Cyan - Technology/Speed
  accentSuccess: '#10B981',    // Green - Success/Complete
  accentWarning: '#F59E0B',    // Amber - Attention
  accentError: '#EF4444',      // Red - Error/Failed
  accentInfo: '#3B82F6',       // Blue - Information

  // Text Colors
  textPrimary: '#F0F6FC',      // High contrast text
  textSecondary: '#8B949E',    // Muted/descriptions
  textTertiary: '#6E7681',     // Disabled/hints
  textInverse: '#0D1117',      // On light backgrounds

  // Border Colors
  borderDefault: '#30363D',    // Subtle separation
  borderFocus: '#7C3AED',      // Focus states
  borderError: '#EF4444',      // Error states
  borderSuccess: '#10B981',    // Success states

  // Agent Type Colors
  agentPlanner: '#A78BFA',     // Purple-400
  agentCoder: '#60A5FA',       // Blue-400
  agentTester: '#34D399',      // Green-400
  agentReviewer: '#FBBF24',    // Yellow-400
  agentMerger: '#F472B6',      // Pink-400

  // Status Colors
  statusIdle: '#6E7681',
  statusWorking: '#3B82F6',
  statusSuccess: '#10B981',
  statusError: '#EF4444',
  statusWarning: '#F59E0B',
  statusPending: '#8B949E',
} as const;

export type ColorToken = keyof typeof colors;
```

### Typography Tokens

```typescript
export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  },

  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.75rem',  // 28px
    '4xl': '2rem',     // 32px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
  },

  letterSpacing: {
    tighter: '-0.02em',
    tight: '-0.01em',
    normal: '0',
  },
} as const;
```

### Spacing Tokens

```typescript
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  2: '0.5rem',      // 8px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
} as const;
```

### Border Radius Tokens

```typescript
export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  full: '9999px',
} as const;
```

### Shadow Tokens

```typescript
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 8px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
  xl: '0 12px 24px rgba(0, 0, 0, 0.6)',
  glow: '0 0 20px rgba(124, 58, 237, 0.3)',
  glowSuccess: '0 0 20px rgba(16, 185, 129, 0.3)',
  glowError: '0 0 20px rgba(239, 68, 68, 0.3)',
} as const;
```

---

## Base Components

### Button

```typescript
// src/renderer/src/components/ui/Button.tsx

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

// Variants:
// - primary: bg-accent-primary, text-white, hover:bg-accent-primary/90
// - secondary: bg-transparent, border-border-default, hover:bg-bg-hover
// - ghost: bg-transparent, hover:bg-bg-hover
// - danger: bg-accent-error, text-white, hover:bg-accent-error/90
// - success: bg-accent-success, text-white, hover:bg-accent-success/90

// Sizes:
// - xs: h-7, px-2, text-xs
// - sm: h-8, px-3, text-sm
// - md: h-10, px-4, text-sm
// - lg: h-12, px-6, text-base

// States:
// - hover: Background lightens, slight scale (1.02)
// - active: Background darkens, scale (0.98)
// - disabled: opacity-50, cursor-not-allowed
// - loading: Shows spinner, text hidden but maintains width
// - focus: ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-dark
```

### IconButton

```typescript
// src/renderer/src/components/ui/IconButton.tsx

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  label: string; // Accessibility label
  loading?: boolean;
}

// Sizes:
// - sm: 32x32px, icon 16px
// - md: 40x40px, icon 20px
// - lg: 48x48px, icon 24px
```

### Badge

```typescript
// src/renderer/src/components/ui/Badge.tsx

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;       // Show status dot
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

// Variants map to accent colors
// Sizes:
// - sm: px-2, py-0.5, text-xs
// - md: px-2.5, py-1, text-sm
```

### Avatar

```typescript
// src/renderer/src/components/ui/Avatar.tsx

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;  // Initials when no image
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'busy' | 'away' | 'offline';
  shape?: 'circle' | 'square';
}

// Sizes:
// - xs: 24x24px
// - sm: 32x32px
// - md: 40x40px
// - lg: 48x48px
// - xl: 64x64px

// Status indicator: Small dot at bottom-right
```

### Tooltip

```typescript
// src/renderer/src/components/ui/Tooltip.tsx

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  sideOffset?: number;
}

// Built on Radix UI Tooltip primitive
// Dark background (bg-card), light text
// Small arrow pointing to trigger
// Animation: fade in/out, slight scale
```

---

## Form Components

### Input

```typescript
// src/renderer/src/components/ui/Input.tsx

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Styles:
// - Background: bg-bg-dark or bg-bg-card
// - Border: border-border-default, focus:border-accent-primary
// - Text: text-text-primary
// - Placeholder: text-text-tertiary
// - Error state: border-accent-error, error message below
// - Label: text-sm text-text-secondary mb-1.5
// - Hint: text-xs text-text-tertiary mt-1
```

### Textarea

```typescript
// src/renderer/src/components/ui/Textarea.tsx

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  minRows?: number;
  maxRows?: number;
  autoGrow?: boolean;
}
```

### Select

```typescript
// src/renderer/src/components/ui/Select.tsx

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Built on Radix UI Select
// Dropdown with options, keyboard navigation
// Supports grouped options
// Search/filter when searchable=true
```

### Toggle (Switch)

```typescript
// src/renderer/src/components/ui/Toggle.tsx

interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Visual: Pill shape toggle
// Colors: Off = bg-bg-hover, On = bg-accent-primary
// Sizes:
// - sm: 36x20px, thumb 16px
// - md: 44x24px, thumb 20px
// - lg: 52x28px, thumb 24px

// Animation: Smooth thumb slide (150ms)
```

### Checkbox

```typescript
// src/renderer/src/components/ui/Checkbox.tsx

interface CheckboxProps {
  checked?: boolean | 'indeterminate';
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  error?: string;
}

// Built on Radix UI Checkbox
// Checkmark icon when checked
// Minus icon when indeterminate
```

### Radio

```typescript
// src/renderer/src/components/ui/Radio.tsx

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  name: string;
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  error?: string;
}
```

### Slider

```typescript
// src/renderer/src/components/ui/Slider.tsx

interface SliderProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  marks?: { value: number; label: string }[];
}

// Track: bg-bg-hover
// Filled track: bg-accent-primary
// Thumb: bg-white, shadow-md
```

### FormField

```typescript
// src/renderer/src/components/ui/FormField.tsx

interface FormFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}

// Wrapper component for consistent form field styling
// Handles label, hint, error message layout
```

---

## Feedback Components

### Modal (Dialog)

```typescript
// src/renderer/src/components/ui/Modal.tsx

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

// Sizes:
// - sm: max-w-sm (384px)
// - md: max-w-md (448px)
// - lg: max-w-lg (512px)
// - xl: max-w-xl (576px)
// - full: max-w-4xl (896px)

// Animations:
// - Overlay: fade in (opacity 0 → 0.8)
// - Content: scale + fade (0.95 → 1, opacity 0 → 1)
```

### Toast

```typescript
// src/renderer/src/components/ui/Toast.tsx

interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

// Uses Sonner library
// Position: bottom-right
// Stacking: Up to 3 visible, others queued
// Auto-dismiss after duration (default 5000ms)
```

### Alert

```typescript
// src/renderer/src/components/ui/Alert.tsx

interface AlertProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

// Inline alert banner
// Icon on left, content, optional dismiss button
// Variant determines border-left color and icon
```

### Progress

```typescript
// src/renderer/src/components/ui/Progress.tsx

interface ProgressProps {
  value: number;        // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showValue?: boolean;
  animated?: boolean;
  indeterminate?: boolean;
}

// Sizes:
// - sm: h-1
// - md: h-2
// - lg: h-3

// Animation: Shimmer effect when animated=true
// Indeterminate: Moving gradient animation
```

### Spinner

```typescript
// src/renderer/src/components/ui/Spinner.tsx

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'inherit';
  label?: string;  // Screen reader text
}

// Sizes:
// - xs: 12x12px
// - sm: 16x16px
// - md: 24x24px
// - lg: 32x32px

// Animation: Rotate 360deg, 0.75s linear infinite
```

### Skeleton

```typescript
// src/renderer/src/components/ui/Skeleton.tsx

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

// Background: bg-bg-hover
// Animation: Shimmer wave from left to right
```

### EmptyState

```typescript
// src/renderer/src/components/ui/EmptyState.tsx

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// Centered content
// Large icon (48px, text-text-tertiary)
// Title (text-lg, text-text-primary)
// Description (text-sm, text-text-secondary)
// Optional action button below
```

---

## Layout Components

### Card

```typescript
// src/renderer/src/components/ui/Card.tsx

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

interface CardHeaderProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

// Variants:
// - default: bg-bg-card, border-border-default
// - elevated: bg-bg-card, shadow-md
// - outlined: bg-transparent, border-border-default
// - interactive: hover:bg-bg-hover, cursor-pointer

// Export Card, CardHeader, CardContent, CardFooter
```

### Tabs

```typescript
// src/renderer/src/components/ui/Tabs.tsx

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underlined';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

// Variants:
// - default: Background highlight on active tab
// - pills: Rounded pill buttons
// - underlined: Bottom border on active

// Keyboard navigation: Arrow keys to switch
```

### Accordion

```typescript
// src/renderer/src/components/ui/Accordion.tsx

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  collapsible?: boolean;
}

// Built on Radix UI Accordion
// Smooth height animation on expand/collapse
// Chevron rotates on open
```

### Divider

```typescript
// src/renderer/src/components/ui/Divider.tsx

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed';
  label?: string;
}

// Border color: border-border-default
// With label: Line - Label - Line
```

### ScrollArea

```typescript
// src/renderer/src/components/ui/ScrollArea.tsx

interface ScrollAreaProps {
  children: React.ReactNode;
  type?: 'auto' | 'always' | 'scroll' | 'hover';
  orientation?: 'vertical' | 'horizontal' | 'both';
  className?: string;
}

// Built on Radix UI ScrollArea
// Custom scrollbar styling (thin, semi-transparent)
// Scrollbar visible on hover
```

### Resizable

```typescript
// src/renderer/src/components/ui/Resizable.tsx

interface ResizableProps {
  children: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  onResize?: (size: number) => void;
}

// For split pane layouts
// Drag handle in middle
// Snap to min/max on drag beyond bounds
```

---

## Navigation Components

### Sidebar

```typescript
// src/renderer/src/components/layout/Sidebar.tsx

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  active?: boolean;
  children?: SidebarItem[];
}

interface SidebarNavProps {
  items: SidebarItem[];
  activeId?: string;
}

// Widths:
// - Expanded: 240px
// - Collapsed: 64px

// Animation: Width transition 200ms ease
// Icons remain visible when collapsed
// Tooltips show labels when collapsed
```

### Header

```typescript
// src/renderer/src/components/layout/Header.tsx

interface HeaderProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  leftContent?: React.ReactNode;
}

// Fixed height: 64px
// Background: bg-bg-dark or bg-bg-card
// Border-bottom: border-border-default
```

### Breadcrumbs

```typescript
// src/renderer/src/components/ui/Breadcrumbs.tsx

interface Breadcrumb {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: Breadcrumb[];
  separator?: React.ReactNode;
  maxItems?: number;
}

// Separator: ChevronRight icon
// Last item: text-text-primary (not a link)
// Other items: text-text-secondary, hover underline
```

### CommandPalette

```typescript
// src/renderer/src/components/ui/CommandPalette.tsx

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  category?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  commands: Command[];
  placeholder?: string;
  hotkey?: string;  // Default: 'mod+k'
}

// Opens with Cmd+K
// Search/filter commands
// Keyboard navigation
// Grouped by category
// Recent commands at top
```

---

## Data Display Components

### Table

```typescript
// src/renderer/src/components/ui/Table.tsx

interface Column<T> {
  id: string;
  header: string | React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
}

// Sticky header
// Alternating row backgrounds (subtle)
// Hover highlight
// Selected row highlight (accent-primary/10)
```

### List

```typescript
// src/renderer/src/components/ui/List.tsx

interface ListItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

interface ListProps {
  children: React.ReactNode;
  dividers?: boolean;
}

// Vertical list with optional dividers
// Items have consistent padding
// Hover and selected states
```

### CodeBlock

```typescript
// src/renderer/src/components/ui/CodeBlock.tsx

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  collapsible?: boolean;
  maxHeight?: number | string;
  copyButton?: boolean;
}

// Syntax highlighting: Shiki or Prism
// Font: JetBrains Mono
// Background: Slightly darker than card
// Line numbers: text-text-tertiary
// Copy button: Top-right corner
// Collapsible: Show first N lines, expand to full
```

### Terminal

```typescript
// src/renderer/src/components/ui/Terminal.tsx

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success' | 'info';
  content: string;
  timestamp?: Date;
}

interface TerminalProps {
  lines: TerminalLine[];
  showTimestamps?: boolean;
  autoScroll?: boolean;
  maxLines?: number;
  onClear?: () => void;
}

// Monospace font
// Different colors per line type
// Auto-scroll to bottom on new content
// Clear button
```

### Stat

```typescript
// src/renderer/src/components/ui/Stat.tsx

interface StatProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

// Large value display
// Label above or below
// Change indicator with arrow and percentage
// Icon on left or top
```

### Timeline

```typescript
// src/renderer/src/components/ui/Timeline.tsx

interface TimelineEvent {
  id: string;
  timestamp: Date;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  metadata?: Record<string, string>;
}

interface TimelineProps {
  events: TimelineEvent[];
  orientation?: 'vertical' | 'horizontal';
  showConnector?: boolean;
  loading?: boolean;
}

// Vertical line connecting events
// Dot for each event (colored by variant)
// Timestamp + Title + Description
```

---

## Agent-Specific Components

### AgentBadge

```typescript
// src/renderer/src/components/agents/AgentBadge.tsx

interface AgentBadgeProps {
  type: 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger' | 'architect' | 'debugger' | 'documenter';
  status?: 'idle' | 'working' | 'success' | 'error' | 'paused';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// Color based on agent type (from tokens)
// Icon per type:
// - planner: Brain
// - coder: Code
// - tester: TestTube
// - reviewer: Eye
// - merger: GitMerge
// - architect: Building
// - debugger: Bug
// - documenter: FileText

// Status indicator: Small dot overlay
```

### AgentCard

```typescript
// src/renderer/src/components/agents/AgentCard.tsx

interface AgentCardProps {
  agent: {
    id: string;
    type: AgentType;
    status: AgentStatus;
    currentTask?: {
      id: string;
      name: string;
      progress?: number;
    };
    model?: string;
    iteration?: {
      current: number;
      max: number;
    };
    metrics?: {
      tokensUsed: number;
      duration: number;
    };
  };
  selected?: boolean;
  onClick?: () => void;
  showDetails?: boolean;
}

// Card with AgentBadge
// Current task display
// Progress bar if working
// Iteration counter
// Click to select
// Animated border when active
```

### AgentActivity

```typescript
// src/renderer/src/components/agents/AgentActivity.tsx

interface AgentActivityProps {
  agentId: string;
  output: string[];
  status: AgentStatus;
  autoScroll?: boolean;
}

// Terminal-like output display
// Real-time streaming
// Color-coded output
// Clear button
```

### AgentPoolStatus

```typescript
// src/renderer/src/components/agents/AgentPoolStatus.tsx

interface AgentPoolStatusProps {
  agents: Agent[];
  maxAgents: number;
}

// Grid of agent badges
// Shows active/idle/error counts
// Click to view agent details
// Pagination if many agents
```

### QAStatusPanel

```typescript
// src/renderer/src/components/agents/QAStatusPanel.tsx

interface QAStep {
  type: 'build' | 'lint' | 'test' | 'review';
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  duration?: number;
  output?: string;
}

interface QAStatusPanelProps {
  steps: QAStep[];
  iteration: number;
  maxIterations: number;
  onViewLogs?: (type: QAStep['type']) => void;
}

// Horizontal steps: Build → Lint → Test → Review
// Icon for each step (colored by status)
// Connecting lines between steps
// Click step to view logs
// Iteration counter below
```

### IterationCounter

```typescript
// src/renderer/src/components/agents/IterationCounter.tsx

interface IterationCounterProps {
  current: number;
  max: number;
  size?: 'sm' | 'md';
  showProgress?: boolean;
}

// Display: "Iteration 3/50"
// Optional circular progress indicator
// Warning color when near max
// Error color at max
```

---

## Page-Specific Components

### Interview Components

```typescript
// ChatMessage
interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    status?: 'sending' | 'sent' | 'error';
  };
  showTimestamp?: boolean;
}

// RequirementCard
interface RequirementCardProps {
  requirement: {
    id: string;
    title: string;
    description: string;
    category: string;
    priority: 'must' | 'should' | 'could' | 'wont';
    status: 'extracted' | 'confirmed' | 'rejected';
  };
  editable?: boolean;
  onEdit?: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
}

// CategorySection (for grouping requirements)
interface CategorySectionProps {
  category: string;
  requirements: Requirement[];
  collapsed?: boolean;
  onToggle?: () => void;
  completeness?: number; // 0-100
}
```

### Kanban Components

```typescript
// KanbanColumn
interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  wipLimit?: number;
  children: React.ReactNode;
  onDrop?: (itemId: string) => void;
}

// TaskCard (for kanban board)
interface TaskCardProps {
  task: {
    id: string;
    name: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    assignedAgent?: AgentType;
    estimatedTime?: number;
    qaIteration?: number;
    progress?: number;
  };
  onClick?: () => void;
  draggable?: boolean;
}

// FeatureDetailModal
interface FeatureDetailModalProps {
  feature: Feature;
  open: boolean;
  onClose: () => void;
  onUpdate?: (updates: Partial<Feature>) => void;
}
```

### Dashboard Components

```typescript
// StatCard
interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; direction: 'up' | 'down' };
  icon: React.ReactNode;
  trend?: number[];  // Sparkline data
  loading?: boolean;
}

// ProjectCard
interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    mode: 'genesis' | 'evolution';
    status: ProjectStatus;
    progress: number;
    activeAgents: number;
    lastActivity: Date;
  };
  onClick?: () => void;
}

// LiveAgentFeed
interface LiveAgentFeedProps {
  events: AgentEvent[];
  maxItems?: number;
  showFilters?: boolean;
}
```

### Settings Components

```typescript
// SettingsSection
interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

// ModelSelector
interface ModelSelectorProps {
  provider: 'claude' | 'gemini';
  value: string;
  onChange: (model: string) => void;
  showDescription?: boolean;
  showPricing?: boolean;
}

// BackendToggle
interface BackendToggleProps {
  provider: 'claude' | 'gemini' | 'embeddings';
  value: 'cli' | 'api' | 'local';
  onChange: (backend: string) => void;
  cliAvailable?: boolean;
}

// AgentModelTable
interface AgentModelTableProps {
  config: Record<AgentType, { provider: string; model: string }>;
  onChange: (agentType: AgentType, provider: string, model: string) => void;
}

// ApiKeyInput
interface ApiKeyInputProps {
  provider: string;
  hasKey: boolean;
  onSave: (key: string) => void;
  onClear: () => void;
}
```

### Execution Components

```typescript
// ExecutionTab
interface ExecutionTabProps {
  type: 'build' | 'lint' | 'test' | 'review';
  status: 'idle' | 'running' | 'success' | 'error';
  output: string;
  duration?: number;
  timestamp?: Date;
}

// LogViewer
interface LogViewerProps {
  logs: LogEntry[];
  autoScroll?: boolean;
  showTimestamps?: boolean;
  showLevels?: boolean;
  filter?: 'all' | 'info' | 'warn' | 'error';
}

// TestResults
interface TestResultsProps {
  results: {
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    suites: TestSuite[];
  };
  expanded?: boolean;
}
```

---

## Utility Components

### VisuallyHidden

```typescript
// For screen reader only content
interface VisuallyHiddenProps {
  children: React.ReactNode;
}
```

### ErrorBoundary

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
```

### ThemeProvider

```typescript
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
}
```

### Virtualized List

```typescript
interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  overscan?: number;
}

// For rendering large lists efficiently
// Uses react-window or similar
```

### Portal

```typescript
interface PortalProps {
  children: React.ReactNode;
  container?: Element | null;
}
```

---

## Component Implementation Priority

### Phase 17B: Foundation (Tasks 8-12)

**Task 8: Design System Setup**
- [ ] Create `tokens.ts` with all design tokens
- [ ] Configure Tailwind with custom colors/spacing
- [ ] Create `globals.css` with CSS variables
- [ ] Set up font loading (Inter, JetBrains Mono)

**Task 9: Base Components**
- [ ] Button (all variants and sizes)
- [ ] IconButton
- [ ] Badge
- [ ] Avatar
- [ ] Tooltip

**Task 10: Form Components**
- [ ] Input
- [ ] Textarea
- [ ] Select
- [ ] Toggle
- [ ] Checkbox
- [ ] Radio
- [ ] Slider
- [ ] FormField

**Task 11: Layout Components**
- [ ] Card (with Header, Content, Footer)
- [ ] Tabs
- [ ] Accordion
- [ ] Divider
- [ ] ScrollArea
- [ ] Resizable

**Task 12: Feedback Components**
- [ ] Modal
- [ ] Toast (setup Sonner)
- [ ] Alert
- [ ] Progress
- [ ] Spinner
- [ ] Skeleton
- [ ] EmptyState

### Phase 17C: Agent & Page Components (Tasks 13-23)

**Task 13: Navigation Components**
- [ ] Sidebar
- [ ] Header
- [ ] Breadcrumbs
- [ ] CommandPalette

**Tasks 14-23: Page-specific components built as needed**

---

## Testing Requirements

Each component must have:
1. **TypeScript types** - Strict typing for all props
2. **Storybook stories** - Visual documentation (optional but recommended)
3. **Accessibility** - ARIA labels, keyboard navigation, focus management
4. **Data-testid attributes** - For Playwright testing

Example:
```tsx
<Button
  data-testid="save-settings-button"
  aria-label="Save settings"
  // ...
>
  Save
</Button>
```

---

## File Structure

```
src/renderer/src/
├── components/
│   ├── ui/                    # Base components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Toggle.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Progress.tsx
│   │   ├── Tabs.tsx
│   │   ├── CodeBlock.tsx
│   │   └── ...
│   ├── layout/                # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── PageLayout.tsx
│   │   └── ...
│   ├── agents/                # Agent components
│   │   ├── AgentBadge.tsx
│   │   ├── AgentCard.tsx
│   │   ├── AgentActivity.tsx
│   │   ├── AgentPoolStatus.tsx
│   │   ├── QAStatusPanel.tsx
│   │   └── IterationCounter.tsx
│   ├── interview/             # Interview page components
│   ├── kanban/                # Kanban page components
│   ├── dashboard/             # Dashboard components
│   ├── settings/              # Settings components
│   └── execution/             # Execution page components
├── styles/
│   ├── tokens.ts              # Design tokens
│   └── globals.css            # Global styles
└── lib/
    └── utils.ts               # Utility functions (cn, etc.)
```

---

## Summary

This component library specification defines **70+ components** across 10 categories:

1. **Base Components** (5): Button, IconButton, Badge, Avatar, Tooltip
2. **Form Components** (8): Input, Textarea, Select, Toggle, Checkbox, Radio, Slider, FormField
3. **Feedback Components** (7): Modal, Toast, Alert, Progress, Spinner, Skeleton, EmptyState
4. **Layout Components** (6): Card, Tabs, Accordion, Divider, ScrollArea, Resizable
5. **Navigation Components** (4): Sidebar, Header, Breadcrumbs, CommandPalette
6. **Data Display Components** (6): Table, List, CodeBlock, Terminal, Stat, Timeline
7. **Agent Components** (6): AgentBadge, AgentCard, AgentActivity, AgentPoolStatus, QAStatusPanel, IterationCounter
8. **Interview Components** (3): ChatMessage, RequirementCard, CategorySection
9. **Kanban Components** (3): KanbanColumn, TaskCard, FeatureDetailModal
10. **Page-Specific Components** (~25): Dashboard, Settings, Execution components

All components follow consistent design tokens and accessibility standards, with data-testid attributes for Playwright testing.
