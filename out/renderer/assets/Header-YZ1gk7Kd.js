import { c as createLucideIcon, j as jsxRuntimeExports, a as cn, W as ChevronRight, V as Link, i as useNavigate } from "./index-BX2rC_Ui.js";
import { A as ArrowLeft } from "./arrow-left-DKMkPiIn.js";
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
];
const Ellipsis = createLucideIcon("ellipsis", __iconNode$1);
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", key: "5wwlr5" }],
  [
    "path",
    {
      d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
      key: "r6nss1"
    }
  ]
];
const House = createLucideIcon("house", __iconNode);
function BreadcrumbSeparator({
  separator
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-1.5 text-text-tertiary", "aria-hidden": "true", children: separator || /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "w-3.5 h-3.5", strokeWidth: 1.5 }) });
}
function BreadcrumbLink({ item, isLast }) {
  const Icon = item.icon;
  const content = /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
    Icon && /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "w-3.5 h-3.5", strokeWidth: 1.5 }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate max-w-[200px]", children: item.label })
  ] });
  if (isLast || item.current || !item.href) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: cn(
          "text-sm font-medium",
          isLast ? "text-text-primary" : "text-text-secondary"
        ),
        "aria-current": isLast ? "page" : void 0,
        "data-testid": `breadcrumb-item-${item.label.toLowerCase().replace(/\s+/g, "-")}`,
        children: content
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Link,
    {
      to: item.href,
      className: cn(
        "text-sm text-text-secondary hover:text-text-primary",
        "transition-colors",
        "focus-visible:outline-none focus-visible:underline"
      ),
      "data-testid": `breadcrumb-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`,
      children: content
    }
  );
}
function BreadcrumbEllipsis({
  hiddenItems
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: "px-1 text-text-tertiary hover:text-text-secondary cursor-default",
      title: hiddenItems.map((i) => i.label).join(" / "),
      "data-testid": "breadcrumb-ellipsis",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "w-4 h-4", strokeWidth: 1.5 })
    }
  );
}
function Breadcrumbs({
  items,
  separator,
  maxItems = 4,
  className,
  showHome = false,
  homeHref = "/"
}) {
  if (!items || items.length === 0) {
    return null;
  }
  const allItems = showHome ? [{ label: "Home", href: homeHref, icon: House }, ...items] : items;
  const shouldTruncate = maxItems > 0 && allItems.length > maxItems;
  let visibleItems;
  let hiddenItems = [];
  if (shouldTruncate) {
    const itemsToShow = maxItems - 1;
    visibleItems = [
      allItems[0],
      ...allItems.slice(-(itemsToShow - 1))
    ];
    hiddenItems = allItems.slice(1, -(itemsToShow - 1));
  } else {
    visibleItems = allItems;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "nav",
    {
      className: cn("flex items-center", className),
      "aria-label": "Breadcrumb",
      "data-testid": "breadcrumbs",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "flex items-center flex-wrap", children: visibleItems.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === visibleItems.length - 1;
        const showEllipsis = shouldTruncate && index === 0 && !isLast;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center", children: [
          !isFirst && /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbSeparator, { separator }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbLink, { item, isLast }),
          showEllipsis && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbSeparator, { separator }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbEllipsis, { hiddenItems })
          ] })
        ] }, item.label);
      }) })
    }
  );
}
function Header({
  title,
  subtitle,
  breadcrumbs,
  actions,
  leftContent,
  showBack = false,
  onBack,
  className,
  sticky = true,
  icon: Icon,
  loading = false
}) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "header",
    {
      className: cn(
        "flex items-center justify-between px-6 py-4",
        "bg-bg-card border-b border-border-default",
        "min-h-[56px]",
        sticky && "sticky top-0 z-30",
        className
      ),
      "data-testid": "page-header",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 min-w-0 flex-1", children: [
          showBack && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: handleBack,
              className: cn(
                "flex items-center justify-center w-8 h-8 rounded-md shrink-0",
                "text-text-secondary hover:text-text-primary",
                "hover:bg-bg-hover transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              ),
              "aria-label": "Go back",
              "data-testid": "header-back-button",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "w-4 h-4", strokeWidth: 1.5 })
            }
          ),
          leftContent,
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col min-w-0", children: [
            breadcrumbs && breadcrumbs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Breadcrumbs, { items: breadcrumbs, className: "mb-1" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              Icon && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Icon,
                {
                  className: "w-5 h-5 text-text-secondary shrink-0",
                  strokeWidth: 1.5
                }
              ),
              title && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "h1",
                {
                  className: cn(
                    "text-lg font-semibold text-text-primary truncate",
                    loading && "animate-pulse bg-bg-hover rounded w-32 h-6"
                  ),
                  "data-testid": "header-title",
                  children: !loading && title
                }
              ),
              subtitle && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: cn(
                    "text-sm text-text-secondary truncate",
                    "hidden sm:inline"
                  ),
                  "data-testid": "header-subtitle",
                  children: subtitle
                }
              )
            ] })
          ] })
        ] }),
        actions && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 shrink-0 ml-4", "data-testid": "header-actions", children: actions })
      ]
    }
  );
}
export {
  Header as H
};
