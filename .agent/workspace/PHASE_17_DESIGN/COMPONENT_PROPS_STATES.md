# Nexus Component Props & States Specification

This document provides complete TypeScript interface definitions for all UI components, including props, internal states, event handlers, and ref forwarding patterns.

---

## Table of Contents

1. [Base Components](#base-components)
2. [Form Components](#form-components)
3. [Feedback Components](#feedback-components)
4. [Layout Components](#layout-components)
5. [Navigation Components](#navigation-components)
6. [Data Display Components](#data-display-components)
7. [Agent Components](#agent-components)
8. [Page-Specific Components](#page-specific-components)
9. [State Management (Zustand)](#state-management)
10. [Custom Hooks](#custom-hooks)

---

## Base Components

### Button

```typescript
// src/renderer/src/components/ui/Button.tsx

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Shows loading spinner and disables interaction */
  loading?: boolean;
  /** Icon element to display */
  icon?: React.ReactNode;
  /** Position of icon relative to text */
  iconPosition?: 'left' | 'right';
  /** Stretch to full container width */
  fullWidth?: boolean;
  /** Accessible label for screen readers (required if children is icon-only) */
  'aria-label'?: string;
}

// Internal state managed by component
interface ButtonInternalState {
  isPressed: boolean;    // For active/press animation
  isFocused: boolean;    // For focus ring
}

// Ref forwarding
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => { /* implementation */ }
);
```

**Usage Example:**
```tsx
<Button
  variant="primary"
  size="md"
  loading={isSubmitting}
  icon={<SaveIcon />}
  iconPosition="left"
  onClick={handleSave}
  data-testid="save-button"
>
  Save Changes
</Button>
```

---

### IconButton

```typescript
// src/renderer/src/components/ui/IconButton.tsx

export type IconButtonVariant = 'default' | 'ghost' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Icon element (required) */
  icon: React.ReactNode;
  /** Visual variant */
  variant?: IconButtonVariant;
  /** Size preset */
  size?: IconButtonSize;
  /** Accessible label (required for icon-only buttons) */
  label: string;
  /** Shows loading spinner */
  loading?: boolean;
  /** Shows tooltip on hover */
  tooltip?: boolean;
}

// Size mappings
const sizeMap = {
  sm: { button: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { button: 'h-10 w-10', icon: 'h-5 w-5' },
  lg: { button: 'h-12 w-12', icon: 'h-6 w-6' },
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (props, ref) => { /* implementation */ }
);
```

---

### Badge

```typescript
// src/renderer/src/components/ui/Badge.tsx

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Color variant */
  variant?: BadgeVariant;
  /** Size preset */
  size?: BadgeSize;
  /** Show status dot indicator */
  dot?: boolean;
  /** Dot color (overrides variant color) */
  dotColor?: string;
  /** Leading icon */
  icon?: React.ReactNode;
  /** Show remove button */
  removable?: boolean;
  /** Callback when remove clicked */
  onRemove?: () => void;
  /** Additional className */
  className?: string;
}

// Variant color mappings
const variantColors: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  default: { bg: 'bg-bg-hover', text: 'text-text-primary', dot: 'bg-text-secondary' },
  success: { bg: 'bg-accent-success/20', text: 'text-accent-success', dot: 'bg-accent-success' },
  warning: { bg: 'bg-accent-warning/20', text: 'text-accent-warning', dot: 'bg-accent-warning' },
  error: { bg: 'bg-accent-error/20', text: 'text-accent-error', dot: 'bg-accent-error' },
  info: { bg: 'bg-accent-info/20', text: 'text-accent-info', dot: 'bg-accent-info' },
  purple: { bg: 'bg-accent-primary/20', text: 'text-accent-primary', dot: 'bg-accent-primary' },
};
```

---

### Avatar

```typescript
// src/renderer/src/components/ui/Avatar.tsx

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'busy' | 'away' | 'offline';
export type AvatarShape = 'circle' | 'square';

export interface AvatarProps {
  /** Image source URL */
  src?: string;
  /** Alt text for image */
  alt?: string;
  /** Fallback initials when no image */
  fallback?: string;
  /** Size preset */
  size?: AvatarSize;
  /** Online status indicator */
  status?: AvatarStatus;
  /** Shape of avatar */
  shape?: AvatarShape;
  /** Additional className */
  className?: string;
}

// Internal state
interface AvatarInternalState {
  imageError: boolean;     // True if image failed to load
  imageLoaded: boolean;    // True once image is loaded
}

// Size mappings in pixels
const sizePx: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

// Status color mappings
const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-accent-success',
  busy: 'bg-accent-error',
  away: 'bg-accent-warning',
  offline: 'bg-text-tertiary',
};
```

---

### Tooltip

```typescript
// src/renderer/src/components/ui/Tooltip.tsx

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipAlign = 'start' | 'center' | 'end';

export interface TooltipProps {
  /** Tooltip content (can be string or React node) */
  content: React.ReactNode;
  /** Trigger element */
  children: React.ReactNode;
  /** Preferred side for tooltip */
  side?: TooltipSide;
  /** Alignment relative to trigger */
  align?: TooltipAlign;
  /** Delay before showing (ms) */
  delayDuration?: number;
  /** Offset from trigger (px) */
  sideOffset?: number;
  /** Disable tooltip */
  disabled?: boolean;
  /** Open state (controlled) */
  open?: boolean;
  /** Open change callback (controlled) */
  onOpenChange?: (open: boolean) => void;
}

// Uses Radix UI Tooltip internally
// Default values:
// - delayDuration: 300
// - sideOffset: 4
// - side: 'top'
// - align: 'center'
```

---

## Form Components

### Input

```typescript
// src/renderer/src/components/ui/Input.tsx

export type InputSize = 'sm' | 'md' | 'lg';
export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Field label */
  label?: string;
  /** Help text below input */
  hint?: string;
  /** Error message (shows red border when set) */
  error?: string;
  /** Leading icon */
  icon?: React.ReactNode;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Stretch to container width */
  fullWidth?: boolean;
  /** Size preset */
  size?: InputSize;
  /** Show character count */
  showCount?: boolean;
  /** Clear button */
  clearable?: boolean;
  /** Clear callback */
  onClear?: () => void;
}

// Internal state
interface InputInternalState {
  isFocused: boolean;
  showPassword: boolean;    // For password type
  charCount: number;
}

// Height mappings
const sizeHeights: Record<InputSize, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => { /* implementation */ }
);
```

---

### Textarea

```typescript
// src/renderer/src/components/ui/Textarea.tsx

export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Field label */
  label?: string;
  /** Help text */
  hint?: string;
  /** Error message */
  error?: string;
  /** Resize behavior */
  resize?: TextareaResize;
  /** Minimum rows */
  minRows?: number;
  /** Maximum rows (for auto-grow) */
  maxRows?: number;
  /** Auto-expand based on content */
  autoGrow?: boolean;
  /** Show character count */
  showCount?: boolean;
  /** Stretch to container width */
  fullWidth?: boolean;
}

// Internal state
interface TextareaInternalState {
  isFocused: boolean;
  currentHeight: number;   // For auto-grow
  charCount: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (props, ref) => { /* implementation */ }
);
```

---

### Select

```typescript
// src/renderer/src/components/ui/Select.tsx

export interface SelectOption {
  /** Unique value */
  value: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Disable this option */
  disabled?: boolean;
}

export interface SelectGroup {
  /** Group label */
  label: string;
  /** Options in this group */
  options: SelectOption[];
}

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectProps {
  /** Options (flat or grouped) */
  options: SelectOption[] | SelectGroup[];
  /** Selected value */
  value?: string;
  /** Change callback */
  onChange?: (value: string) => void;
  /** Field label */
  label?: string;
  /** Help text */
  hint?: string;
  /** Error message */
  error?: string;
  /** Placeholder when no selection */
  placeholder?: string;
  /** Disable select */
  disabled?: boolean;
  /** Enable search/filter */
  searchable?: boolean;
  /** Show clear button */
  clearable?: boolean;
  /** Size preset */
  size?: SelectSize;
  /** Name for form submission */
  name?: string;
  /** Required field */
  required?: boolean;
  /** Stretch to container width */
  fullWidth?: boolean;
}

// Internal state
interface SelectInternalState {
  isOpen: boolean;
  searchQuery: string;
  highlightedIndex: number;
  filteredOptions: SelectOption[];
}

// Uses Radix UI Select or custom implementation
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (props, ref) => { /* implementation */ }
);
```

---

### Toggle (Switch)

```typescript
// src/renderer/src/components/ui/Toggle.tsx

export type ToggleSize = 'sm' | 'md' | 'lg';

export interface ToggleProps {
  /** Checked state */
  checked?: boolean;
  /** Default checked (uncontrolled) */
  defaultChecked?: boolean;
  /** Change callback */
  onChange?: (checked: boolean) => void;
  /** Label text */
  label?: string;
  /** Description below label */
  description?: string;
  /** Disable toggle */
  disabled?: boolean;
  /** Size preset */
  size?: ToggleSize;
  /** Name for form submission */
  name?: string;
  /** ID for label association */
  id?: string;
}

// Size dimensions
const sizeDimensions: Record<ToggleSize, { track: string; thumb: string }> = {
  sm: { track: 'w-9 h-5', thumb: 'h-4 w-4' },
  md: { track: 'w-11 h-6', thumb: 'h-5 w-5' },
  lg: { track: 'w-13 h-7', thumb: 'h-6 w-6' },
};

// Uses Radix UI Switch
export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (props, ref) => { /* implementation */ }
);
```

---

### Checkbox

```typescript
// src/renderer/src/components/ui/Checkbox.tsx

export type CheckedState = boolean | 'indeterminate';

export interface CheckboxProps {
  /** Checked state */
  checked?: CheckedState;
  /** Default checked (uncontrolled) */
  defaultChecked?: CheckedState;
  /** Change callback */
  onChange?: (checked: boolean) => void;
  /** Label text */
  label?: string;
  /** Description */
  description?: string;
  /** Disable checkbox */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Name for form submission */
  name?: string;
  /** Value for form submission */
  value?: string;
  /** ID for label association */
  id?: string;
  /** Required field */
  required?: boolean;
}

// Uses Radix UI Checkbox
export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (props, ref) => { /* implementation */ }
);
```

---

### Radio Group

```typescript
// src/renderer/src/components/ui/Radio.tsx

export interface RadioOption {
  /** Unique value */
  value: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Disable this option */
  disabled?: boolean;
}

export type RadioOrientation = 'horizontal' | 'vertical';

export interface RadioGroupProps {
  /** Available options */
  options: RadioOption[];
  /** Selected value */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Change callback */
  onChange?: (value: string) => void;
  /** Name for form submission */
  name: string;
  /** Group label */
  label?: string;
  /** Layout direction */
  orientation?: RadioOrientation;
  /** Error message */
  error?: string;
  /** Disable all options */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
}

// Uses Radix UI RadioGroup
export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (props, ref) => { /* implementation */ }
);
```

---

### Slider

```typescript
// src/renderer/src/components/ui/Slider.tsx

export interface SliderMark {
  value: number;
  label: string;
}

export interface SliderProps {
  /** Current value */
  value?: number;
  /** Default value (uncontrolled) */
  defaultValue?: number;
  /** Change callback */
  onChange?: (value: number) => void;
  /** Change end callback (on mouse up) */
  onChangeEnd?: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Field label */
  label?: string;
  /** Show current value */
  showValue?: boolean;
  /** Custom value formatter */
  formatValue?: (value: number) => string;
  /** Show marks on track */
  marks?: SliderMark[];
  /** Disable slider */
  disabled?: boolean;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
}

// Internal state
interface SliderInternalState {
  isDragging: boolean;
  internalValue: number;
}

// Uses Radix UI Slider
export const Slider = React.forwardRef<HTMLSpanElement, SliderProps>(
  (props, ref) => { /* implementation */ }
);
```

---

### FormField

```typescript
// src/renderer/src/components/ui/FormField.tsx

export interface FormFieldProps {
  /** Field label */
  label?: string;
  /** Help text */
  hint?: string;
  /** Error message */
  error?: string;
  /** Show required indicator */
  required?: boolean;
  /** Form control element(s) */
  children: React.ReactNode;
  /** HTML for attribute (label association) */
  htmlFor?: string;
  /** Additional className */
  className?: string;
}

// Wrapper component for consistent field layout
export function FormField({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
  className,
}: FormFieldProps): JSX.Element;
```

---

## Feedback Components

### Modal (Dialog)

```typescript
// src/renderer/src/components/ui/Modal.tsx

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  /** Open state */
  open: boolean;
  /** Open change callback */
  onOpenChange: (open: boolean) => void;
  /** Modal title */
  title?: string;
  /** Modal description */
  description?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Size preset */
  size?: ModalSize;
  /** Show close button in header */
  showCloseButton?: boolean;
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Prevent scroll on body when open */
  preventBodyScroll?: boolean;
  /** Custom header content */
  header?: React.ReactNode;
  /** Custom footer content */
  footer?: React.ReactNode;
}

// Size width mappings
const sizeWidths: Record<ModalSize, string> = {
  sm: 'max-w-sm',     // 384px
  md: 'max-w-md',     // 448px
  lg: 'max-w-lg',     // 512px
  xl: 'max-w-xl',     // 576px
  full: 'max-w-4xl',  // 896px
};

// Uses Radix UI Dialog
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preventBodyScroll = true,
  header,
  footer,
}: ModalProps): JSX.Element | null;
```

---

### Toast

```typescript
// src/renderer/src/components/ui/Toast.tsx
// Uses Sonner library

export type ToastVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface ToastData {
  /** Unique ID */
  id: string;
  /** Toast title */
  title?: string;
  /** Toast description/message */
  description?: string;
  /** Visual variant */
  variant?: ToastVariant;
  /** Auto-dismiss duration (ms), 0 = no auto-dismiss */
  duration?: number;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Show dismiss button */
  dismissible?: boolean;
  /** Custom icon */
  icon?: React.ReactNode;
}

// Toast API (singleton)
export const toast = {
  /** Show toast */
  show: (data: Omit<ToastData, 'id'>) => string,
  /** Show success toast */
  success: (message: string, options?: Partial<ToastData>) => string,
  /** Show error toast */
  error: (message: string, options?: Partial<ToastData>) => string,
  /** Show warning toast */
  warning: (message: string, options?: Partial<ToastData>) => string,
  /** Show info toast */
  info: (message: string, options?: Partial<ToastData>) => string,
  /** Dismiss toast by ID */
  dismiss: (id: string) => void,
  /** Dismiss all toasts */
  dismissAll: () => void,
};

// Toaster container component
export interface ToasterProps {
  /** Position on screen */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  /** Max visible toasts */
  visibleToasts?: number;
  /** Default duration */
  duration?: number;
  /** Gap between toasts */
  gap?: number;
}

export function Toaster(props: ToasterProps): JSX.Element;
```

---

### Alert

```typescript
// src/renderer/src/components/ui/Alert.tsx

export type AlertVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface AlertProps {
  /** Visual variant */
  variant?: AlertVariant;
  /** Alert title */
  title?: string;
  /** Alert content */
  children: React.ReactNode;
  /** Custom icon (overrides variant default) */
  icon?: React.ReactNode;
  /** Show dismiss button */
  dismissible?: boolean;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Additional className */
  className?: string;
}

// Default icons per variant
const variantIcons: Record<AlertVariant, React.ComponentType> = {
  default: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
  error: XCircleIcon,
  info: InfoIcon,
};
```

---

### Progress

```typescript
// src/renderer/src/components/ui/Progress.tsx

export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressVariant = 'default' | 'success' | 'warning' | 'error';

export interface ProgressProps {
  /** Current value (0-100) */
  value: number;
  /** Maximum value */
  max?: number;
  /** Size preset */
  size?: ProgressSize;
  /** Color variant */
  variant?: ProgressVariant;
  /** Show percentage value */
  showValue?: boolean;
  /** Custom value formatter */
  formatValue?: (value: number, max: number) => string;
  /** Show shimmer animation */
  animated?: boolean;
  /** Indeterminate (loading) state */
  indeterminate?: boolean;
  /** Label text */
  label?: string;
  /** Additional className */
  className?: string;
}

// Height mappings
const sizeHeights: Record<ProgressSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};
```

---

### Spinner

```typescript
// src/renderer/src/components/ui/Spinner.tsx

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';
export type SpinnerColor = 'primary' | 'white' | 'inherit';

export interface SpinnerProps {
  /** Size preset */
  size?: SpinnerSize;
  /** Color */
  color?: SpinnerColor;
  /** Screen reader label */
  label?: string;
  /** Additional className */
  className?: string;
}

// Size mappings
const sizePx: Record<SpinnerSize, number> = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
};
```

---

### Skeleton

```typescript
// src/renderer/src/components/ui/Skeleton.tsx

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';
export type SkeletonAnimation = 'pulse' | 'wave' | 'none';

export interface SkeletonProps {
  /** Shape variant */
  variant?: SkeletonVariant;
  /** Width (CSS value or number in px) */
  width?: string | number;
  /** Height (CSS value or number in px) */
  height?: string | number;
  /** Animation type */
  animation?: SkeletonAnimation;
  /** Additional className */
  className?: string;
}
```

---

### EmptyState

```typescript
// src/renderer/src/components/ui/EmptyState.tsx

export interface EmptyStateProps {
  /** Illustration or icon */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action element (typically a button) */
  action?: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}
```

---

## Layout Components

### Card

```typescript
// src/renderer/src/components/ui/Card.tsx

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: CardVariant;
  /** Padding preset */
  padding?: CardPadding;
  /** Additional className */
  className?: string;
  /** Click handler (makes card focusable) */
  onClick?: () => void;
  /** Keyboard handler */
  onKeyDown?: (event: React.KeyboardEvent) => void;
  /** HTML element to render as */
  as?: 'div' | 'article' | 'section';
}

// Sub-components
export interface CardHeaderProps {
  /** Header title */
  title?: string;
  /** Header description */
  description?: string;
  /** Action element (right side) */
  action?: React.ReactNode;
  /** Leading icon */
  icon?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export interface CardContentProps {
  /** Content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

export interface CardFooterProps {
  /** Footer content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

// Compound component exports
export const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Content: React.FC<CardContentProps>;
  Footer: React.FC<CardFooterProps>;
};
```

---

### Tabs

```typescript
// src/renderer/src/components/ui/Tabs.tsx

export interface Tab {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Badge content (count or text) */
  badge?: string | number;
  /** Disable this tab */
  disabled?: boolean;
}

export type TabsVariant = 'default' | 'pills' | 'underlined';
export type TabsSize = 'sm' | 'md';

export interface TabsProps {
  /** Tab definitions */
  tabs: Tab[];
  /** Active tab ID */
  activeTab: string;
  /** Tab change callback */
  onChange: (tabId: string) => void;
  /** Visual variant */
  variant?: TabsVariant;
  /** Size preset */
  size?: TabsSize;
  /** Stretch tabs to full width */
  fullWidth?: boolean;
  /** Additional className */
  className?: string;
}

// Internal state
interface TabsInternalState {
  focusedIndex: number;    // For keyboard navigation
  tabWidths: number[];     // For underline animation
}

// Uses Radix UI Tabs or custom
export function Tabs(props: TabsProps): JSX.Element;

// Tab panel container
export interface TabPanelProps {
  /** Tab ID this panel belongs to */
  tabId: string;
  /** Current active tab */
  activeTab: string;
  /** Panel content */
  children: React.ReactNode;
  /** Keep panel mounted when inactive */
  keepMounted?: boolean;
}

export function TabPanel(props: TabPanelProps): JSX.Element | null;
```

---

### Accordion

```typescript
// src/renderer/src/components/ui/Accordion.tsx

export interface AccordionItem {
  /** Unique identifier */
  id: string;
  /** Trigger title */
  title: string;
  /** Expandable content */
  content: React.ReactNode;
  /** Leading icon */
  icon?: React.ReactNode;
  /** Disable this item */
  disabled?: boolean;
}

export type AccordionType = 'single' | 'multiple';

export interface AccordionProps {
  /** Accordion items */
  items: AccordionItem[];
  /** Single or multiple expansion */
  type?: AccordionType;
  /** Default expanded items */
  defaultValue?: string | string[];
  /** Controlled value */
  value?: string | string[];
  /** Value change callback */
  onValueChange?: (value: string | string[]) => void;
  /** Allow collapsing all items */
  collapsible?: boolean;
  /** Additional className */
  className?: string;
}

// Uses Radix UI Accordion
export function Accordion(props: AccordionProps): JSX.Element;
```

---

### Divider

```typescript
// src/renderer/src/components/ui/Divider.tsx

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerVariant = 'solid' | 'dashed';

export interface DividerProps {
  /** Line direction */
  orientation?: DividerOrientation;
  /** Line style */
  variant?: DividerVariant;
  /** Center label text */
  label?: string;
  /** Additional className */
  className?: string;
}
```

---

### ScrollArea

```typescript
// src/renderer/src/components/ui/ScrollArea.tsx

export type ScrollType = 'auto' | 'always' | 'scroll' | 'hover';
export type ScrollOrientation = 'vertical' | 'horizontal' | 'both';

export interface ScrollAreaProps {
  /** Scrollable content */
  children: React.ReactNode;
  /** Scrollbar visibility */
  type?: ScrollType;
  /** Scroll direction(s) */
  orientation?: ScrollOrientation;
  /** Additional className */
  className?: string;
  /** Callback when scrolled */
  onScroll?: (event: React.UIEvent) => void;
  /** Scroll to bottom on content change */
  autoScroll?: boolean;
}

// Internal state
interface ScrollAreaInternalState {
  scrollTop: number;
  scrollLeft: number;
  isScrolledToBottom: boolean;
}

// Uses Radix UI ScrollArea
export function ScrollArea(props: ScrollAreaProps): JSX.Element;
```

---

### Resizable

```typescript
// src/renderer/src/components/ui/Resizable.tsx

export type ResizeDirection = 'horizontal' | 'vertical';

export interface ResizableProps {
  /** Content */
  children: React.ReactNode;
  /** Resize direction */
  direction?: ResizeDirection;
  /** Default size (px or %) */
  defaultSize?: number | string;
  /** Minimum size (px) */
  minSize?: number;
  /** Maximum size (px) */
  maxSize?: number;
  /** Size change callback */
  onResize?: (size: number) => void;
  /** Resize end callback */
  onResizeEnd?: (size: number) => void;
  /** Additional className */
  className?: string;
}

// Internal state
interface ResizableInternalState {
  isDragging: boolean;
  currentSize: number;
  startPos: number;
  startSize: number;
}

// For split pane layout
export interface ResizablePanelProps {
  /** Panel content */
  children: React.ReactNode;
  /** Default size as percentage */
  defaultSize?: number;
  /** Minimum size (px) */
  minSize?: number;
  /** Maximum size (px) */
  maxSize?: number;
  /** Collapse panel */
  collapsible?: boolean;
  /** Collapsed state */
  collapsed?: boolean;
  /** Collapse change callback */
  onCollapse?: () => void;
}

export interface ResizablePanelGroupProps {
  /** Panels */
  children: React.ReactNode;
  /** Direction */
  direction: 'horizontal' | 'vertical';
  /** Persisted ID for localStorage */
  autoSaveId?: string;
}

export const ResizablePanelGroup: React.FC<ResizablePanelGroupProps>;
export const ResizablePanel: React.FC<ResizablePanelProps>;
export const ResizableHandle: React.FC<{ className?: string }>;
```

---

## Navigation Components

### Sidebar

```typescript
// src/renderer/src/components/layout/Sidebar.tsx

export interface SidebarItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon element */
  icon: React.ReactNode;
  /** Navigation href */
  href?: string;
  /** Click handler (alternative to href) */
  onClick?: () => void;
  /** Badge content */
  badge?: string | number;
  /** Badge variant */
  badgeVariant?: BadgeVariant;
  /** Active state */
  active?: boolean;
  /** Nested items */
  children?: SidebarItem[];
}

export interface SidebarProps {
  /** Collapsed state */
  collapsed?: boolean;
  /** Collapse toggle callback */
  onToggle?: () => void;
  /** Content (typically SidebarNav) */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

export interface SidebarNavProps {
  /** Navigation items */
  items: SidebarItem[];
  /** Active item ID */
  activeId?: string;
  /** Item click callback */
  onItemClick?: (id: string) => void;
}

// Width constants
const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 64;

// Internal state
interface SidebarInternalState {
  expandedGroups: string[];    // For nested items
  hoverItem: string | null;    // For tooltip in collapsed mode
}

export function Sidebar(props: SidebarProps): JSX.Element;
export function SidebarNav(props: SidebarNavProps): JSX.Element;
export function SidebarItem(props: { item: SidebarItem; collapsed?: boolean }): JSX.Element;
```

---

### Header

```typescript
// src/renderer/src/components/layout/Header.tsx

export interface Breadcrumb {
  /** Breadcrumb label */
  label: string;
  /** Navigation href */
  href?: string;
  /** Leading icon */
  icon?: React.ReactNode;
}

export interface HeaderProps {
  /** Page title */
  title?: string;
  /** Page subtitle */
  subtitle?: string;
  /** Breadcrumb navigation */
  breadcrumbs?: Breadcrumb[];
  /** Right-side actions */
  actions?: React.ReactNode;
  /** Left-side content (before title) */
  leftContent?: React.ReactNode;
  /** Show back button */
  showBack?: boolean;
  /** Back button handler */
  onBack?: () => void;
  /** Additional className */
  className?: string;
}

export function Header(props: HeaderProps): JSX.Element;
```

---

### Breadcrumbs

```typescript
// src/renderer/src/components/ui/Breadcrumbs.tsx

export interface BreadcrumbItem {
  /** Breadcrumb label */
  label: string;
  /** Navigation href */
  href?: string;
  /** Leading icon */
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps {
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Custom separator element */
  separator?: React.ReactNode;
  /** Max items to show (overflow handled) */
  maxItems?: number;
  /** Additional className */
  className?: string;
}
```

---

### CommandPalette

```typescript
// src/renderer/src/components/ui/CommandPalette.tsx

export interface Command {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Description text */
  description?: string;
  /** Leading icon */
  icon?: React.ReactNode;
  /** Keyboard shortcut display */
  shortcut?: string;
  /** Category for grouping */
  category?: string;
  /** Execute callback */
  onSelect: () => void;
  /** Search keywords (additional to label) */
  keywords?: string[];
  /** Disable this command */
  disabled?: boolean;
}

export interface CommandPaletteProps {
  /** Available commands */
  commands: Command[];
  /** Search placeholder */
  placeholder?: string;
  /** Keyboard shortcut to open */
  hotkey?: string;
  /** Open state (controlled) */
  open?: boolean;
  /** Open change callback */
  onOpenChange?: (open: boolean) => void;
  /** Show recent commands */
  showRecent?: boolean;
  /** Max recent commands to show */
  maxRecent?: number;
}

// Internal state
interface CommandPaletteInternalState {
  isOpen: boolean;
  searchQuery: string;
  highlightedIndex: number;
  filteredCommands: Command[];
  recentCommands: string[];    // IDs
}

// Uses cmdk or custom implementation
export function CommandPalette(props: CommandPaletteProps): JSX.Element;
```

---

## Data Display Components

### Table

```typescript
// src/renderer/src/components/ui/Table.tsx

export interface Column<T> {
  /** Unique identifier */
  id: string;
  /** Header content */
  header: string | React.ReactNode;
  /** Cell accessor */
  accessor: keyof T | ((row: T) => React.ReactNode);
  /** Column width */
  width?: string | number;
  /** Cell alignment */
  align?: 'left' | 'center' | 'right';
  /** Enable sorting */
  sortable?: boolean;
  /** Custom sort function */
  sortFn?: (a: T, b: T) => number;
  /** Hide on mobile */
  hideOnMobile?: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface TableProps<T extends { id: string }> {
  /** Data rows */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Loading state */
  loading?: boolean;
  /** Empty state element */
  emptyState?: React.ReactNode;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Selected row IDs */
  selectedRows?: string[];
  /** Selection change callback */
  onSelectionChange?: (ids: string[]) => void;
  /** Enable multi-select */
  multiSelect?: boolean;
  /** Current sort column */
  sortColumn?: string;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Sort change callback */
  onSort?: (column: string, direction: SortDirection) => void;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Virtualize rows */
  virtualized?: boolean;
  /** Row height for virtualization */
  rowHeight?: number;
}

// Internal state
interface TableInternalState<T> {
  internalSortColumn: string | null;
  internalSortDirection: SortDirection;
  sortedData: T[];
  selectedSet: Set<string>;
}

export function Table<T extends { id: string }>(props: TableProps<T>): JSX.Element;
```

---

### List

```typescript
// src/renderer/src/components/ui/List.tsx

export interface ListProps {
  /** List items */
  children: React.ReactNode;
  /** Show dividers between items */
  dividers?: boolean;
  /** Additional className */
  className?: string;
}

export interface ListItemProps {
  /** Item content */
  children: React.ReactNode;
  /** Leading icon */
  icon?: React.ReactNode;
  /** Trailing action/content */
  action?: React.ReactNode;
  /** Selected state */
  selected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Disable item */
  disabled?: boolean;
  /** Secondary text */
  secondaryText?: string;
  /** Additional className */
  className?: string;
}

export function List(props: ListProps): JSX.Element;
export function ListItem(props: ListItemProps): JSX.Element;
```

---

### CodeBlock

```typescript
// src/renderer/src/components/ui/CodeBlock.tsx

export interface CodeBlockProps {
  /** Code string */
  code: string;
  /** Language for syntax highlighting */
  language?: string;
  /** Filename header */
  filename?: string;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Lines to highlight */
  highlightLines?: number[];
  /** Enable collapse */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Max height before scroll */
  maxHeight?: number | string;
  /** Show copy button */
  copyButton?: boolean;
  /** Word wrap */
  wrap?: boolean;
  /** Additional className */
  className?: string;
}

// Internal state
interface CodeBlockInternalState {
  isCollapsed: boolean;
  copied: boolean;    // For copy feedback
}

// Uses Shiki, Prism, or highlight.js
export function CodeBlock(props: CodeBlockProps): JSX.Element;
```

---

### Terminal

```typescript
// src/renderer/src/components/ui/Terminal.tsx

export type TerminalLineType = 'input' | 'output' | 'error' | 'success' | 'info' | 'warning';

export interface TerminalLine {
  /** Unique ID */
  id: string;
  /** Line type for styling */
  type: TerminalLineType;
  /** Line content */
  content: string;
  /** Timestamp */
  timestamp?: Date;
}

export interface TerminalProps {
  /** Terminal lines */
  lines: TerminalLine[];
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Auto-scroll to bottom */
  autoScroll?: boolean;
  /** Max lines to keep */
  maxLines?: number;
  /** Clear callback */
  onClear?: () => void;
  /** Show clear button */
  showClearButton?: boolean;
  /** Additional className */
  className?: string;
  /** Title bar text */
  title?: string;
  /** Max height */
  maxHeight?: number | string;
}

// Internal state
interface TerminalInternalState {
  scrolledToBottom: boolean;
  isPaused: boolean;    // Pause auto-scroll on user scroll
}

export function Terminal(props: TerminalProps): JSX.Element;
```

---

### Stat

```typescript
// src/renderer/src/components/ui/Stat.tsx

export type StatTrend = 'up' | 'down' | 'neutral';

export interface StatChange {
  /** Change value */
  value: number;
  /** Change type */
  type: 'increase' | 'decrease';
}

export interface StatProps {
  /** Stat label */
  label: string;
  /** Stat value */
  value: string | number;
  /** Change indicator */
  change?: StatChange;
  /** Leading icon */
  icon?: React.ReactNode;
  /** Trend direction */
  trend?: StatTrend;
  /** Loading state */
  loading?: boolean;
  /** Help tooltip */
  helpText?: string;
  /** Click handler */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}
```

---

### Timeline

```typescript
// src/renderer/src/components/ui/Timeline.tsx

export type TimelineEventVariant = 'default' | 'success' | 'warning' | 'error';

export interface TimelineEvent {
  /** Unique identifier */
  id: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event title */
  title: string;
  /** Event description */
  description?: string;
  /** Event icon */
  icon?: React.ReactNode;
  /** Color variant */
  variant?: TimelineEventVariant;
  /** Additional metadata */
  metadata?: Record<string, string>;
}

export interface TimelineProps {
  /** Timeline events */
  events: TimelineEvent[];
  /** Layout direction */
  orientation?: 'vertical' | 'horizontal';
  /** Show connector line */
  showConnector?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Max events to show */
  maxEvents?: number;
  /** Show "load more" */
  hasMore?: boolean;
  /** Load more callback */
  onLoadMore?: () => void;
  /** Additional className */
  className?: string;
}

export function Timeline(props: TimelineProps): JSX.Element;
```

---

## Agent Components

### AgentBadge

```typescript
// src/renderer/src/components/agents/AgentBadge.tsx

export type AgentType = 'planner' | 'coder' | 'tester' | 'reviewer' | 'merger' | 'architect' | 'debugger' | 'documenter';
export type AgentStatus = 'idle' | 'working' | 'success' | 'error' | 'paused';

export interface AgentBadgeProps {
  /** Agent type */
  type: AgentType;
  /** Agent status */
  status?: AgentStatus;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Show type label */
  showLabel?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

// Type to icon mapping
const agentIcons: Record<AgentType, React.ComponentType> = {
  planner: BrainIcon,
  coder: CodeIcon,
  tester: TestTubeIcon,
  reviewer: EyeIcon,
  merger: GitMergeIcon,
  architect: BuildingIcon,
  debugger: BugIcon,
  documenter: FileTextIcon,
};

// Type to color mapping
const agentColors: Record<AgentType, string> = {
  planner: '#A78BFA',   // Purple-400
  coder: '#60A5FA',     // Blue-400
  tester: '#34D399',    // Green-400
  reviewer: '#FBBF24',  // Yellow-400
  merger: '#F472B6',    // Pink-400
  architect: '#FB923C', // Orange-400
  debugger: '#F87171',  // Red-400
  documenter: '#94A3B8', // Slate-400
};

export function AgentBadge(props: AgentBadgeProps): JSX.Element;
```

---

### AgentCard

```typescript
// src/renderer/src/components/agents/AgentCard.tsx

export interface AgentData {
  /** Agent ID */
  id: string;
  /** Agent type */
  type: AgentType;
  /** Current status */
  status: AgentStatus;
  /** Current task info */
  currentTask?: {
    id: string;
    name: string;
    progress?: number;
  };
  /** Model being used */
  model?: string;
  /** Iteration tracking */
  iteration?: {
    current: number;
    max: number;
  };
  /** Performance metrics */
  metrics?: {
    tokensUsed: number;
    duration: number;
  };
  /** Current file being worked on */
  currentFile?: string;
}

export interface AgentCardProps {
  /** Agent data */
  agent: AgentData;
  /** Selected state */
  selected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Show expanded details */
  showDetails?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

export function AgentCard(props: AgentCardProps): JSX.Element;
```

---

### AgentActivity

```typescript
// src/renderer/src/components/agents/AgentActivity.tsx

export interface AgentActivityProps {
  /** Agent ID */
  agentId: string;
  /** Output lines */
  output: string[];
  /** Current status */
  status: AgentStatus;
  /** Auto-scroll */
  autoScroll?: boolean;
  /** Max height */
  maxHeight?: number | string;
  /** Show timestamp */
  showTimestamp?: boolean;
  /** Clear output callback */
  onClear?: () => void;
}

// Internal state
interface AgentActivityInternalState {
  isPaused: boolean;
  scrollPosition: number;
}

export function AgentActivity(props: AgentActivityProps): JSX.Element;
```

---

### AgentPoolStatus

```typescript
// src/renderer/src/components/agents/AgentPoolStatus.tsx

export interface PoolAgent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  taskName?: string;
}

export interface AgentPoolStatusProps {
  /** Agents in pool */
  agents: PoolAgent[];
  /** Maximum pool size */
  maxAgents: number;
  /** Selected agent ID */
  selectedAgent?: string;
  /** Agent selection callback */
  onSelectAgent?: (agentId: string) => void;
  /** Additional className */
  className?: string;
}

export function AgentPoolStatus(props: AgentPoolStatusProps): JSX.Element;
```

---

### QAStatusPanel

```typescript
// src/renderer/src/components/agents/QAStatusPanel.tsx

export type QAStepType = 'build' | 'lint' | 'test' | 'review';
export type QAStepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface QAStep {
  /** Step type */
  type: QAStepType;
  /** Step status */
  status: QAStepStatus;
  /** Duration in ms */
  duration?: number;
  /** Output summary */
  output?: string;
  /** Error message */
  error?: string;
  /** Test counts (for test step) */
  testCounts?: {
    passed: number;
    failed: number;
    skipped: number;
  };
}

export interface QAStatusPanelProps {
  /** QA steps */
  steps: QAStep[];
  /** Current iteration */
  iteration: number;
  /** Maximum iterations */
  maxIterations: number;
  /** View logs callback */
  onViewLogs?: (type: QAStepType) => void;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Additional className */
  className?: string;
}

export function QAStatusPanel(props: QAStatusPanelProps): JSX.Element;
```

---

### IterationCounter

```typescript
// src/renderer/src/components/agents/IterationCounter.tsx

export interface IterationCounterProps {
  /** Current iteration */
  current: number;
  /** Maximum iterations */
  max: number;
  /** Size preset */
  size?: 'sm' | 'md';
  /** Show circular progress */
  showProgress?: boolean;
  /** Additional className */
  className?: string;
}

export function IterationCounter(props: IterationCounterProps): JSX.Element;
```

---

## Page-Specific Components

### Interview Components

```typescript
// src/renderer/src/components/interview/ChatMessage.tsx

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'error';

export interface Message {
  /** Message ID */
  id: string;
  /** Sender role */
  role: MessageRole;
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: Date;
  /** Send status */
  status?: MessageStatus;
}

export interface ChatMessageProps {
  /** Message data */
  message: Message;
  /** Show timestamp */
  showTimestamp?: boolean;
  /** Is typing indicator */
  isTyping?: boolean;
  /** Additional className */
  className?: string;
}

export function ChatMessage(props: ChatMessageProps): JSX.Element;

// src/renderer/src/components/interview/ChatInput.tsx

export interface ChatInputProps {
  /** Current value */
  value: string;
  /** Change callback */
  onChange: (value: string) => void;
  /** Submit callback */
  onSubmit: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disable input */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Max length */
  maxLength?: number;
}

export function ChatInput(props: ChatInputProps): JSX.Element;

// src/renderer/src/components/interview/RequirementCard.tsx

export type RequirementPriority = 'must' | 'should' | 'could' | 'wont';
export type RequirementStatus = 'extracted' | 'confirmed' | 'rejected';

export interface Requirement {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: RequirementPriority;
  status: RequirementStatus;
}

export interface RequirementCardProps {
  /** Requirement data */
  requirement: Requirement;
  /** Enable editing */
  editable?: boolean;
  /** Edit callback */
  onEdit?: () => void;
  /** Confirm callback */
  onConfirm?: () => void;
  /** Reject callback */
  onReject?: () => void;
  /** Selected state */
  selected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

export function RequirementCard(props: RequirementCardProps): JSX.Element;

// src/renderer/src/components/interview/CategorySection.tsx

export interface CategorySectionProps {
  /** Category name */
  category: string;
  /** Requirements in category */
  requirements: Requirement[];
  /** Collapsed state */
  collapsed?: boolean;
  /** Toggle callback */
  onToggle?: () => void;
  /** Completeness percentage */
  completeness?: number;
  /** Additional className */
  className?: string;
}

export function CategorySection(props: CategorySectionProps): JSX.Element;
```

---

### Kanban Components

```typescript
// src/renderer/src/components/kanban/KanbanColumn.tsx

export type ColumnId = 'planned' | 'in_progress' | 'in_review' | 'complete';

export interface KanbanColumnProps {
  /** Column identifier */
  id: ColumnId;
  /** Column title */
  title: string;
  /** Task count */
  count: number;
  /** WIP limit (show warning if exceeded) */
  wipLimit?: number;
  /** Column content (task cards) */
  children: React.ReactNode;
  /** Drop handler */
  onDrop?: (taskId: string) => void;
  /** Is drop target active */
  isDropTarget?: boolean;
  /** Additional className */
  className?: string;
}

export function KanbanColumn(props: KanbanColumnProps): JSX.Element;

// src/renderer/src/components/kanban/TaskCard.tsx

export type TaskStatus = 'pending' | 'planned' | 'in_progress' | 'in_review' | 'complete' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgent?: AgentType;
  estimatedTime?: number;     // minutes
  qaIteration?: number;
  progress?: number;          // 0-100
  dependencies?: string[];
  blockedBy?: string[];
}

export interface TaskCardProps {
  /** Task data */
  task: Task;
  /** Click handler */
  onClick?: () => void;
  /** Enable drag */
  draggable?: boolean;
  /** Is being dragged */
  isDragging?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

export function TaskCard(props: TaskCardProps): JSX.Element;

// src/renderer/src/components/kanban/TaskDetailModal.tsx

export interface TaskDetailModalProps {
  /** Task data */
  task: Task | null;
  /** Open state */
  open: boolean;
  /** Close callback */
  onClose: () => void;
  /** Update callback */
  onUpdate?: (updates: Partial<Task>) => void;
  /** View logs callback */
  onViewLogs?: () => void;
  /** Retry task callback */
  onRetry?: () => void;
}

export function TaskDetailModal(props: TaskDetailModalProps): JSX.Element;
```

---

### Dashboard Components

```typescript
// src/renderer/src/components/dashboard/StatCard.tsx

export interface StatCardProps {
  /** Card title */
  title: string;
  /** Main value */
  value: string | number;
  /** Change from previous period */
  change?: {
    value: number;
    direction: 'up' | 'down';
  };
  /** Card icon */
  icon: React.ReactNode;
  /** Sparkline data */
  trend?: number[];
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

export function StatCard(props: StatCardProps): JSX.Element;

// src/renderer/src/components/dashboard/ProjectCard.tsx

export type ProjectMode = 'genesis' | 'evolution';
export type ProjectStatus = 'idle' | 'interviewing' | 'planning' | 'executing' | 'complete' | 'failed' | 'paused';

export interface Project {
  id: string;
  name: string;
  mode: ProjectMode;
  status: ProjectStatus;
  progress: number;          // 0-100
  activeAgents: number;
  lastActivity: Date;
  path?: string;
}

export interface ProjectCardProps {
  /** Project data */
  project: Project;
  /** Click handler */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

export function ProjectCard(props: ProjectCardProps): JSX.Element;

// src/renderer/src/components/dashboard/LiveAgentFeed.tsx

export interface AgentEvent {
  id: string;
  agentType: AgentType;
  action: string;
  taskName?: string;
  projectName: string;
  timestamp: Date;
  status: AgentStatus;
}

export interface LiveAgentFeedProps {
  /** Agent events */
  events: AgentEvent[];
  /** Max items to display */
  maxItems?: number;
  /** Show filters */
  showFilters?: boolean;
  /** Filter by project */
  projectFilter?: string;
  /** Filter by agent type */
  agentFilter?: AgentType;
  /** Additional className */
  className?: string;
}

export function LiveAgentFeed(props: LiveAgentFeedProps): JSX.Element;
```

---

### Settings Components

```typescript
// src/renderer/src/components/settings/SettingsSection.tsx

export interface SettingsSectionProps {
  /** Section title */
  title: string;
  /** Section description */
  description?: string;
  /** Section content */
  children: React.ReactNode;
  /** Enable collapse */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Additional className */
  className?: string;
}

export function SettingsSection(props: SettingsSectionProps): JSX.Element;

// src/renderer/src/components/settings/ModelSelector.tsx

export type LLMProvider = 'claude' | 'gemini';

export interface ModelSelectorProps {
  /** Provider type */
  provider: LLMProvider;
  /** Selected model */
  value: string;
  /** Change callback */
  onChange: (model: string) => void;
  /** Show model description */
  showDescription?: boolean;
  /** Show pricing info */
  showPricing?: boolean;
  /** Disable selector */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

export function ModelSelector(props: ModelSelectorProps): JSX.Element;

// src/renderer/src/components/settings/BackendToggle.tsx

export type BackendType = 'cli' | 'api' | 'local';

export interface BackendToggleProps {
  /** Provider */
  provider: 'claude' | 'gemini' | 'embeddings';
  /** Current backend */
  value: BackendType;
  /** Change callback */
  onChange: (backend: BackendType) => void;
  /** CLI availability status */
  cliAvailable?: boolean;
  /** Disable toggle */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

export function BackendToggle(props: BackendToggleProps): JSX.Element;

// src/renderer/src/components/settings/AgentModelTable.tsx

export type AgentModelConfig = Record<AgentType, {
  provider: LLMProvider;
  model: string;
}>;

export interface AgentModelTableProps {
  /** Current configuration */
  config: AgentModelConfig;
  /** Change callback */
  onChange: (agentType: AgentType, provider: LLMProvider, model: string) => void;
  /** Disable editing */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

export function AgentModelTable(props: AgentModelTableProps): JSX.Element;

// src/renderer/src/components/settings/ApiKeyInput.tsx

export interface ApiKeyInputProps {
  /** Provider name */
  provider: string;
  /** Key is set (show mask) */
  hasKey: boolean;
  /** Save callback */
  onSave: (key: string) => void;
  /** Clear callback */
  onClear: () => void;
  /** Disable input */
  disabled?: boolean;
  /** Help text */
  helpText?: string;
  /** Additional className */
  className?: string;
}

export function ApiKeyInput(props: ApiKeyInputProps): JSX.Element;
```

---

### Execution Components

```typescript
// src/renderer/src/components/execution/ExecutionTab.tsx

export interface ExecutionTabProps {
  /** Tab type */
  type: 'build' | 'lint' | 'test' | 'review';
  /** Execution status */
  status: 'idle' | 'running' | 'success' | 'error';
  /** Output content */
  output: string;
  /** Execution duration (ms) */
  duration?: number;
  /** Execution timestamp */
  timestamp?: Date;
  /** Error count (for lint) */
  errorCount?: number;
  /** Warning count (for lint) */
  warningCount?: number;
  /** Test counts */
  testCounts?: {
    passed: number;
    failed: number;
    skipped: number;
  };
  /** Additional className */
  className?: string;
}

export function ExecutionTab(props: ExecutionTabProps): JSX.Element;

// src/renderer/src/components/execution/LogViewer.tsx

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  source?: string;
}

export interface LogViewerProps {
  /** Log entries */
  logs: LogEntry[];
  /** Auto-scroll */
  autoScroll?: boolean;
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Show log levels */
  showLevels?: boolean;
  /** Level filter */
  filter?: 'all' | LogLevel;
  /** Search query */
  search?: string;
  /** Max height */
  maxHeight?: number | string;
  /** Additional className */
  className?: string;
}

export function LogViewer(props: LogViewerProps): JSX.Element;

// src/renderer/src/components/execution/TestResults.tsx

export interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

export interface TestSuite {
  name: string;
  file: string;
  tests: TestCase[];
  duration: number;
}

export interface TestResultsProps {
  /** Test results */
  results: {
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    suites: TestSuite[];
  };
  /** Expanded state */
  expanded?: boolean;
  /** Toggle callback */
  onToggle?: () => void;
  /** Additional className */
  className?: string;
}

export function TestResults(props: TestResultsProps): JSX.Element;
```

---

## State Management

### Settings Store

```typescript
// src/renderer/src/stores/settingsStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LLMProviderConfig {
  backend: 'cli' | 'api';
  model: string;
  apiKey?: string;
  timeout: number;
  maxRetries: number;
}

export interface EmbeddingsConfig {
  backend: 'local' | 'api';
  model: string;
  apiKey?: string;
}

export interface AgentPoolConfig {
  maxConcurrentAgents: number;
  qaIterationLimit: number;
  taskTimeLimit: number;
  agentTimeout: number;
}

export interface UIConfig {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  showTimestamps: boolean;
  compactMode: boolean;
}

export interface SettingsState {
  // LLM Providers
  claude: LLMProviderConfig;
  gemini: LLMProviderConfig;
  embeddings: EmbeddingsConfig;

  // Agent configuration
  agentPool: AgentPoolConfig;
  agentModels: AgentModelConfig;

  // UI preferences
  ui: UIConfig;

  // Actions
  updateClaude: (config: Partial<LLMProviderConfig>) => void;
  updateGemini: (config: Partial<LLMProviderConfig>) => void;
  updateEmbeddings: (config: Partial<EmbeddingsConfig>) => void;
  updateAgentPool: (config: Partial<AgentPoolConfig>) => void;
  updateAgentModel: (type: AgentType, provider: LLMProvider, model: string) => void;
  updateUI: (config: Partial<UIConfig>) => void;
  resetToDefaults: () => void;
  loadFromBackend: () => Promise<void>;
  saveToBackend: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state...
    }),
    { name: 'nexus-settings' }
  )
);
```

---

### Project Store

```typescript
// src/renderer/src/stores/projectStore.ts

export interface ProjectState {
  // Current project
  currentProject: Project | null;
  currentMode: ProjectMode | null;

  // Project list
  projects: Project[];
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setMode: (mode: ProjectMode) => void;
  fetchProjects: () => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Implementation...
}));
```

---

### Agent Store

```typescript
// src/renderer/src/stores/agentStore.ts

export interface AgentState {
  // Agent pool
  agents: AgentData[];
  selectedAgent: string | null;

  // Real-time output
  agentOutput: Record<string, string[]>;

  // Actions
  setAgents: (agents: AgentData[]) => void;
  updateAgent: (id: string, updates: Partial<AgentData>) => void;
  selectAgent: (id: string | null) => void;
  appendOutput: (agentId: string, line: string) => void;
  clearOutput: (agentId: string) => void;

  // Event subscriptions
  subscribeToAgentEvents: () => () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  // Implementation...
}));
```

---

### Interview Store

```typescript
// src/renderer/src/stores/interviewStore.ts

export interface InterviewState {
  // Session
  sessionId: string | null;
  isActive: boolean;

  // Messages
  messages: Message[];
  isTyping: boolean;

  // Requirements
  requirements: Requirement[];
  categories: string[];

  // Progress
  progress: number;
  questionsRemaining: number;

  // Actions
  startInterview: (projectId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  addMessage: (message: Message) => void;
  setTyping: (typing: boolean) => void;
  addRequirement: (requirement: Requirement) => void;
  updateRequirement: (id: string, updates: Partial<Requirement>) => void;
  confirmRequirement: (id: string) => void;
  rejectRequirement: (id: string) => void;
  completeInterview: () => Promise<void>;
  saveDraft: () => Promise<void>;
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  // Implementation...
}));
```

---

### Task Store

```typescript
// src/renderer/src/stores/taskStore.ts

export interface TaskState {
  // Tasks by column
  tasksByColumn: Record<ColumnId, Task[]>;
  allTasks: Task[];

  // Selected task
  selectedTask: Task | null;

  // Filters
  agentFilter: AgentType | null;
  priorityFilter: TaskPriority | null;
  searchQuery: string;

  // Actions
  fetchTasks: (projectId: string) => Promise<void>;
  moveTask: (taskId: string, toColumn: ColumnId) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  selectTask: (task: Task | null) => void;
  setAgentFilter: (agent: AgentType | null) => void;
  setPriorityFilter: (priority: TaskPriority | null) => void;
  setSearchQuery: (query: string) => void;

  // Computed
  filteredTasks: () => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Implementation...
}));
```

---

## Custom Hooks

### useEventBus

```typescript
// src/renderer/src/hooks/useEventBus.ts

export type EventType =
  | 'project:created'
  | 'project:updated'
  | 'project:completed'
  | 'task:created'
  | 'task:started'
  | 'task:progress'
  | 'task:completed'
  | 'agent:spawned'
  | 'agent:working'
  | 'agent:complete'
  | 'qa:build:complete'
  | 'qa:lint:complete'
  | 'qa:test:complete'
  | 'qa:review:complete'
  | 'interview:message'
  | 'interview:requirement';

export interface EventPayload {
  type: EventType;
  data: unknown;
  timestamp: Date;
}

export function useEventBus() {
  /** Subscribe to event type */
  const on: (type: EventType, callback: (payload: EventPayload) => void) => () => void;

  /** Emit event */
  const emit: (type: EventType, data: unknown) => void;

  /** Subscribe to all events */
  const onAny: (callback: (payload: EventPayload) => void) => () => void;

  return { on, emit, onAny };
}
```

---

### useAgent

```typescript
// src/renderer/src/hooks/useAgent.ts

export interface UseAgentResult {
  /** Agent data */
  agent: AgentData | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Agent output lines */
  output: string[];
  /** Refresh agent data */
  refresh: () => Promise<void>;
  /** Pause agent */
  pause: () => Promise<void>;
  /** Resume agent */
  resume: () => Promise<void>;
}

export function useAgent(agentId: string): UseAgentResult;
```

---

### useSettings

```typescript
// src/renderer/src/hooks/useSettings.ts

export interface UseSettingsResult {
  /** All settings */
  settings: SettingsState;
  /** Loading state */
  loading: boolean;
  /** Saving state */
  saving: boolean;
  /** Error state */
  error: string | null;
  /** Update settings */
  update: (updates: Partial<SettingsState>) => void;
  /** Save to backend */
  save: () => Promise<void>;
  /** Reset to defaults */
  reset: () => void;
  /** Check if CLI available */
  cliStatus: {
    claude: boolean;
    gemini: boolean;
  };
}

export function useSettings(): UseSettingsResult;
```

---

### useRealTimeUpdates

```typescript
// src/renderer/src/hooks/useRealTimeUpdates.ts

export interface UseRealTimeUpdatesOptions {
  /** Event types to subscribe to */
  events: EventType[];
  /** Callback when event received */
  onEvent?: (event: EventPayload) => void;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
}

export interface UseRealTimeUpdatesResult {
  /** Connection status */
  connected: boolean;
  /** Last event received */
  lastEvent: EventPayload | null;
  /** Reconnect manually */
  reconnect: () => void;
  /** Disconnect */
  disconnect: () => void;
}

export function useRealTimeUpdates(options: UseRealTimeUpdatesOptions): UseRealTimeUpdatesResult;
```

---

### useLocalStorage

```typescript
// src/renderer/src/hooks/useLocalStorage.ts

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void];
```

---

### useMediaQuery

```typescript
// src/renderer/src/hooks/useMediaQuery.ts

export function useMediaQuery(query: string): boolean;

// Preset hooks
export function useIsMobile(): boolean;      // (max-width: 767px)
export function useIsTablet(): boolean;      // (min-width: 768px) and (max-width: 1023px)
export function useIsDesktop(): boolean;     // (min-width: 1024px)
```

---

### useDebounce

```typescript
// src/renderer/src/hooks/useDebounce.ts

export function useDebounce<T>(value: T, delay: number): T;
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T;
```

---

## Summary

This document defines the complete TypeScript interfaces for all Nexus UI components:

- **Base Components (5)**: Button, IconButton, Badge, Avatar, Tooltip
- **Form Components (8)**: Input, Textarea, Select, Toggle, Checkbox, Radio, Slider, FormField
- **Feedback Components (7)**: Modal, Toast, Alert, Progress, Spinner, Skeleton, EmptyState
- **Layout Components (6)**: Card, Tabs, Accordion, Divider, ScrollArea, Resizable
- **Navigation Components (4)**: Sidebar, Header, Breadcrumbs, CommandPalette
- **Data Display Components (6)**: Table, List, CodeBlock, Terminal, Stat, Timeline
- **Agent Components (6)**: AgentBadge, AgentCard, AgentActivity, AgentPoolStatus, QAStatusPanel, IterationCounter
- **Page-Specific Components**: Interview (4), Kanban (3), Dashboard (3), Settings (5), Execution (3)
- **Zustand Stores (5)**: Settings, Project, Agent, Interview, Task
- **Custom Hooks (7)**: useEventBus, useAgent, useSettings, useRealTimeUpdates, useLocalStorage, useMediaQuery, useDebounce

All interfaces include:
- Complete prop types with JSDoc documentation
- Internal state definitions where applicable
- Ref forwarding patterns
- Event handler signatures
- Default values and constants

---

*Document created for Phase 17: Nexus UI Complete Redesign*
*Version 1.0*
