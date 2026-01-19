/**
 * Nexus Layout Components
 *
 * This module exports all layout components for building consistent page layouts.
 *
 * Components:
 * - RootLayout - Root wrapper with UIBackendBridge initialization
 * - PageLayout - Main page layout with sidebar and header
 * - PageSection - Section container with title and actions
 * - PageGrid - Responsive grid layout helper
 * - Sidebar - Collapsible navigation sidebar
 * - SidebarNav - Navigation menu for sidebar
 * - SidebarSection - Section grouping for sidebar
 * - SidebarLogo - Nexus logo for sidebar header
 * - SidebarToggle - Collapse toggle button
 * - Header - Page header with title, breadcrumbs, and actions
 * - HeaderSkeleton - Loading skeleton for header
 * - Breadcrumbs - Navigation breadcrumb trail
 */

// Root Layout
export { RootLayout } from './RootLayout'

// Page Layout
export {
  PageLayout,
  PageSection,
  PageGrid,
  type PageLayoutProps,
  type PageSectionProps,
  type PageGridProps,
} from './PageLayout'

// Sidebar
export {
  Sidebar,
  SidebarNav,
  SidebarSection,
  SidebarLogo,
  SidebarToggle,
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
  defaultNavigationItems,
  settingsNavigationItems,
  type SidebarProps,
  type SidebarNavProps,
  type SidebarItem,
  type BadgeVariant,
} from './Sidebar'

// Header
export {
  Header,
  HeaderSkeleton,
  type HeaderProps,
} from './Header'

// Breadcrumbs
export {
  Breadcrumbs,
  BreadcrumbSeparator,
  BreadcrumbLink,
  BreadcrumbEllipsis,
  type BreadcrumbsProps,
  type BreadcrumbItem,
} from './Breadcrumbs'

// Responsive Containers
export {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack,
  ResponsiveSplit,
  ShowOnMobile,
  HideOnMobile,
  ShowOnDesktop,
  HideOnDesktop,
} from './ResponsiveContainer'
