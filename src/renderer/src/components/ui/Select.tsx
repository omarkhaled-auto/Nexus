import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react'

import { cn } from '@renderer/lib/utils'

/**
 * Nexus Select Component
 *
 * A comprehensive select dropdown component with support for labels, hints,
 * errors, groups, search/filter, and custom option rendering.
 *
 * @example
 * ```tsx
 * // Simple select
 * <Select
 *   label="Claude Model"
 *   options={claudeModels}
 *   value={selectedModel}
 *   onChange={setSelectedModel}
 *   placeholder="Select a model..."
 * />
 *
 * // Grouped options
 * <Select
 *   label="LLM Provider"
 *   options={[
 *     { label: 'Claude Models', options: claudeModels },
 *     { label: 'Gemini Models', options: geminiModels },
 *   ]}
 *   searchable
 * />
 * ```
 */

export interface SelectOption {
  /** Unique value */
  value: string
  /** Display label */
  label: string
  /** Optional description */
  description?: string
  /** Optional icon */
  icon?: React.ReactNode
  /** Disable this option */
  disabled?: boolean
}

export interface SelectGroup {
  /** Group label */
  label: string
  /** Options in this group */
  options: SelectOption[]
}

export type SelectSize = 'sm' | 'md' | 'lg'

export interface SelectProps {
  /** Options (flat or grouped) */
  options: SelectOption[] | SelectGroup[]
  /** Selected value */
  value?: string
  /** Change callback */
  onChange?: (value: string) => void
  /** Field label */
  label?: string
  /** Help text */
  hint?: string
  /** Error message */
  error?: string
  /** Placeholder when no selection */
  placeholder?: string
  /** Disable select */
  disabled?: boolean
  /** Enable search/filter */
  searchable?: boolean
  /** Show clear button */
  clearable?: boolean
  /** Size preset */
  size?: SelectSize
  /** Name for form submission */
  name?: string
  /** Required field */
  required?: boolean
  /** Stretch to container width */
  fullWidth?: boolean
  /** Additional className for trigger */
  className?: string
  /** Test ID for Playwright testing */
  'data-testid'?: string
}

// Type guard to check if options are grouped
function isGroupedOptions(
  options: SelectOption[] | SelectGroup[]
): options is SelectGroup[] {
  return options.length > 0 && 'options' in options[0]
}

// Flatten grouped options for search
function flattenOptions(options: SelectOption[] | SelectGroup[]): SelectOption[] {
  if (isGroupedOptions(options)) {
    return options.flatMap((group) => group.options)
  }
  return options
}

// Height mappings
const sizeHeights: Record<SelectSize, string> = {
  sm: 'h-8 text-xs',
  md: 'h-10 text-sm',
  lg: 'h-12 text-base',
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      label,
      hint,
      error,
      placeholder = 'Select...',
      disabled = false,
      searchable = false,
      clearable = false,
      size = 'md',
      name,
      required = false,
      fullWidth = true,
      className,
      'data-testid': dataTestId,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState('')
    const searchInputRef = React.useRef<HTMLInputElement>(null)
    const selectId = React.useId()
    const hintId = `${selectId}-hint`
    const errorId = `${selectId}-error`

    // Get all options (flattened for search)
    const allOptions = React.useMemo(() => flattenOptions(options), [options])

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return options

      const query = searchQuery.toLowerCase()

      if (isGroupedOptions(options)) {
        return options
          .map((group) => ({
            ...group,
            options: group.options.filter(
              (opt) =>
                opt.label.toLowerCase().includes(query) ||
                opt.description?.toLowerCase().includes(query)
            ),
          }))
          .filter((group) => group.options.length > 0)
      }

      return options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(query) ||
          opt.description?.toLowerCase().includes(query)
      )
    }, [options, searchQuery])

    // Find selected option
    const selectedOption = React.useMemo(
      () => allOptions.find((opt) => opt.value === value),
      [allOptions, value]
    )

    // Focus search input when dropdown opens
    React.useEffect(() => {
      if (open && searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 0)
      }
      if (!open) {
        setSearchQuery('')
      }
    }, [open, searchable])

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange?.('')
    }

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-[#F0F6FC]"
          >
            {label}
            {required && <span className="text-[#EF4444] ml-1">*</span>}
          </label>
        )}

        <SelectPrimitive.Root
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          open={open}
          onOpenChange={setOpen}
          name={name}
          required={required}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={selectId}
            className={cn(
              'flex items-center justify-between',
              'px-3 rounded-md',
              'bg-[#161B22] border',
              error ? 'border-[#EF4444]' : 'border-[#30363D]',
              'text-[#F0F6FC]',
              'transition-all duration-150',
              'focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#21262D]',
              'data-[placeholder]:text-[#6E7681]',
              sizeHeights[size],
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            data-testid={dataTestId}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedOption?.icon && (
                <span className="flex-shrink-0">{selectedOption.icon}</span>
              )}
              <SelectPrimitive.Value placeholder={placeholder}>
                {selectedOption ? (
                  <span className="truncate">{selectedOption.label}</span>
                ) : null}
              </SelectPrimitive.Value>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Clear button */}
              {clearable && value && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={cn(
                    'p-0.5 rounded',
                    'text-[#6E7681] hover:text-[#F0F6FC]',
                    'transition-colors',
                    'focus:outline-none focus:ring-1 focus:ring-[#7C3AED]'
                  )}
                  aria-label="Clear selection"
                  data-testid={dataTestId ? `${dataTestId}-clear` : undefined}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <SelectPrimitive.Icon asChild>
                <ChevronDown className="h-4 w-4 text-[#6E7681]" />
              </SelectPrimitive.Icon>
            </div>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className={cn(
                'relative z-50 max-h-96 min-w-[8rem] overflow-hidden',
                'rounded-md border border-[#30363D]',
                'bg-[#161B22] text-[#F0F6FC]',
                'shadow-lg shadow-black/20',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                'data-[side=bottom]:slide-in-from-top-2',
                'data-[side=left]:slide-in-from-right-2',
                'data-[side=right]:slide-in-from-left-2',
                'data-[side=top]:slide-in-from-bottom-2'
              )}
              position="popper"
              sideOffset={4}
              data-testid={dataTestId ? `${dataTestId}-content` : undefined}
            >
              {/* Search input */}
              {searchable && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[#30363D]">
                  <Search className="h-4 w-4 text-[#6E7681]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      'flex-1 bg-transparent',
                      'text-sm text-[#F0F6FC] placeholder:text-[#6E7681]',
                      'focus:outline-none'
                    )}
                    onClick={(e) => e.stopPropagation()}
                    data-testid={dataTestId ? `${dataTestId}-search` : undefined}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSearchQuery('')
                      }}
                      className="text-[#6E7681] hover:text-[#F0F6FC]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 bg-[#161B22] cursor-default">
                <ChevronUp className="h-4 w-4 text-[#6E7681]" />
              </SelectPrimitive.ScrollUpButton>

              <SelectPrimitive.Viewport className="p-1">
                {/* Render options */}
                {isGroupedOptions(filteredOptions as SelectOption[] | SelectGroup[])
                  ? (filteredOptions as SelectGroup[]).map((group, index) => (
                      <React.Fragment key={group.label}>
                        {index > 0 && (
                          <SelectPrimitive.Separator className="my-1 h-px bg-[#30363D]" />
                        )}
                        <SelectPrimitive.Group>
                          <SelectPrimitive.Label className="px-2 py-1.5 text-xs font-medium text-[#6E7681]">
                            {group.label}
                          </SelectPrimitive.Label>
                          {group.options.map((option) => (
                            <SelectItem
                              key={option.value}
                              option={option}
                              size={size}
                            />
                          ))}
                        </SelectPrimitive.Group>
                      </React.Fragment>
                    ))
                  : (filteredOptions as SelectOption[]).map((option) => (
                      <SelectItem key={option.value} option={option} size={size} />
                    ))}

                {/* No results */}
                {(isGroupedOptions(filteredOptions as SelectOption[] | SelectGroup[])
                  ? (filteredOptions as SelectGroup[]).length === 0
                  : (filteredOptions as SelectOption[]).length === 0) && (
                  <div className="px-2 py-4 text-center text-sm text-[#6E7681]">
                    No options found
                  </div>
                )}
              </SelectPrimitive.Viewport>

              <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 bg-[#161B22] cursor-default">
                <ChevronDown className="h-4 w-4 text-[#6E7681]" />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

        {/* Hint or error */}
        <div className="min-h-[20px]">
          {error ? (
            <p id={errorId} className="text-xs text-[#EF4444]" role="alert">
              {error}
            </p>
          ) : hint ? (
            <p id={hintId} className="text-xs text-[#6E7681]">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    )
  }
)
Select.displayName = 'Select'

// Internal SelectItem component
interface SelectItemProps {
  option: SelectOption
  size: SelectSize
}

const SelectItem = ({ option, size }: SelectItemProps) => {
  return (
    <SelectPrimitive.Item
      value={option.value}
      disabled={option.disabled}
      className={cn(
        'relative flex items-center gap-2',
        'px-2 py-2 rounded-sm',
        'cursor-pointer select-none outline-none',
        'text-[#F0F6FC]',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        'data-[highlighted]:bg-[#21262D]',
        'data-[state=checked]:text-[#7C3AED]',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-base'
      )}
    >
      {option.icon && (
        <span className="flex-shrink-0">{option.icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <SelectPrimitive.ItemText>
          <span className="truncate">{option.label}</span>
        </SelectPrimitive.ItemText>
        {option.description && (
          <p className="text-xs text-[#6E7681] truncate mt-0.5">
            {option.description}
          </p>
        )}
      </div>
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-[#7C3AED]" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select }
