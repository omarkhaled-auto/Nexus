import { c as createLucideIcon, r as reactExports, j as jsxRuntimeExports, a as cn, X as cva, Y as X } from "./index-BX2rC_Ui.js";
import { C as CircleAlert } from "./circle-alert-CGw4XaIP.js";
import { E as EyeOff } from "./eye-off-BJBJRlas.js";
import { E as Eye } from "./eye-BPN0s3mY.js";
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
const Search = createLucideIcon("search", __iconNode);
const inputVariants = cva(
  // Base styles
  [
    "flex w-full",
    "bg-[#161B22] border border-[#30363D]",
    "text-[#F0F6FC] placeholder:text-[#6E7681]",
    "transition-all duration-150",
    "focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#21262D]",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium"
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-8 px-3 text-xs rounded",
        md: "h-10 px-3 text-sm rounded-md",
        lg: "h-12 px-4 text-base rounded-md"
      },
      hasError: {
        true: "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20",
        false: ""
      },
      hasIcon: {
        left: "pl-10",
        right: "pr-10",
        both: "pl-10 pr-10",
        none: ""
      }
    },
    defaultVariants: {
      size: "md",
      hasError: false,
      hasIcon: "none"
    }
  }
);
const Input = reactExports.forwardRef(
  ({
    className,
    type = "text",
    label,
    hint,
    error,
    icon,
    iconPosition = "left",
    fullWidth = true,
    size = "md",
    showCount = false,
    clearable = false,
    onClear,
    disabled,
    maxLength,
    value,
    onChange,
    id,
    "aria-label": ariaLabel,
    "data-testid": dataTestId,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = reactExports.useState(false);
    const [charCount, setCharCount] = reactExports.useState(0);
    const inputId = id || reactExports.useId();
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;
    reactExports.useEffect(() => {
      if (typeof value === "string") {
        setCharCount(value.length);
      }
    }, [value]);
    const handleChange = (e) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };
    const handleClear = () => {
      onClear?.();
      const event = {
        target: { value: "" }
      };
      onChange?.(event);
      setCharCount(0);
    };
    const hasLeftIcon = icon && iconPosition === "left";
    const hasRightIcon = icon && iconPosition === "right" || type === "password" || clearable && charCount > 0 || error;
    const hasIconVariant = hasLeftIcon && hasRightIcon ? "both" : hasLeftIcon ? "left" : hasRightIcon ? "right" : "none";
    const actualType = type === "password" && showPassword ? "text" : type;
    const iconSizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex flex-col gap-1.5", fullWidth && "w-full"), children: [
      label && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "label",
        {
          htmlFor: inputId,
          className: "text-sm font-medium text-[#F0F6FC]",
          children: label
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        hasLeftIcon && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: cn(
              "absolute left-3 top-1/2 -translate-y-1/2",
              "text-[#6E7681] pointer-events-none",
              iconSizeClass
            ),
            children: type === "search" && !icon ? /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: iconSizeClass }) : icon
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref,
            id: inputId,
            type: actualType,
            disabled,
            maxLength,
            value,
            onChange: handleChange,
            className: cn(
              inputVariants({ size, hasError: !!error, hasIcon: hasIconVariant }),
              className
            ),
            "aria-label": ariaLabel,
            "aria-invalid": !!error,
            "aria-describedby": error ? errorId : hint ? hintId : void 0,
            "data-testid": dataTestId,
            ...props
          }
        ),
        hasRightIcon && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "flex items-center gap-2"
            ),
            children: [
              error && /* @__PURE__ */ jsxRuntimeExports.jsx(
                CircleAlert,
                {
                  className: cn(iconSizeClass, "text-[#EF4444]"),
                  "aria-hidden": "true"
                }
              ),
              clearable && charCount > 0 && !error && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: handleClear,
                  className: cn(
                    "text-[#6E7681] hover:text-[#F0F6FC]",
                    "transition-colors p-0.5 rounded",
                    "focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                  ),
                  "aria-label": "Clear input",
                  "data-testid": dataTestId ? `${dataTestId}-clear` : void 0,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: iconSizeClass })
                }
              ),
              type === "password" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setShowPassword(!showPassword);
                  },
                  className: cn(
                    "text-[#6E7681] hover:text-[#F0F6FC]",
                    "transition-colors p-0.5 rounded",
                    "focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                  ),
                  "aria-label": showPassword ? "Hide password" : "Show password",
                  "data-testid": dataTestId ? `${dataTestId}-toggle-password` : void 0,
                  children: showPassword ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: iconSizeClass }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: iconSizeClass })
                }
              ),
              icon && iconPosition === "right" && !error && type !== "password" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(iconSizeClass, "text-[#6E7681]"), children: icon })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 min-h-[20px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: error ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            id: errorId,
            className: "text-xs text-[#EF4444]",
            role: "alert",
            children: error
          }
        ) : hint ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            id: hintId,
            className: "text-xs text-[#6E7681]",
            children: hint
          }
        ) : null }),
        showCount && maxLength && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "p",
          {
            className: cn(
              "text-xs",
              charCount >= maxLength ? "text-[#EF4444]" : "text-[#6E7681]"
            ),
            children: [
              charCount,
              "/",
              maxLength
            ]
          }
        )
      ] })
    ] });
  }
);
Input.displayName = "Input";
export {
  Input as I,
  Search as S
};
