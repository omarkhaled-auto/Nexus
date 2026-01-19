import type { ReactElement } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useEffect, useState, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { uiBackendBridge } from '@renderer/bridges/UIBackendBridge';
import { useGlobalShortcuts } from '@renderer/hooks/useKeyboardShortcuts';
import { useIsMobile } from '@renderer/hooks/useMediaQuery';
import { cn } from '@renderer/lib/utils';
import {
  Sidebar,
  SidebarNav,
  SidebarSection,
  defaultNavigationItems,
  settingsNavigationItems,
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
} from './Sidebar';

// ============================================================================
// Constants
// ============================================================================

const SIDEBAR_STATE_KEY = 'nexus-sidebar-collapsed';

// Pages that should show the full sidebar navigation
const PAGES_WITH_SIDEBAR = [
  '/dashboard',
  '/genesis',
  '/evolution',
  '/agents',
  '/execution',
  '/settings',
];

// Pages that should be full-screen without sidebar (landing pages, etc.)
const FULL_SCREEN_PAGES = ['/'];

/**
 * Root layout component that wraps all pages.
 * Initializes the UIBackendBridge on mount and global keyboard shortcuts.
 * Provides the app shell with optional sidebar navigation.
 * Responsive: Sidebar is an overlay on mobile with hamburger menu.
 */
export function RootLayout(): ReactElement {
  const location = useLocation();
  const isMobile = useIsMobile();

  // Initialize global keyboard shortcuts (requires router context)
  useGlobalShortcuts();

  // Mobile sidebar open state (overlay pattern)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sidebar collapsed state with localStorage persistence (desktop only)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Persist sidebar state
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarCollapsed));
    } catch {
      // Ignore localStorage errors
    }
  }, [sidebarCollapsed]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // Initialize UIBackendBridge
  useEffect(() => {
    uiBackendBridge.initialize();
    return () => {
      uiBackendBridge.cleanup();
    };
  }, []);

  // Determine if current page should show sidebar
  const showSidebar =
    PAGES_WITH_SIDEBAR.some((path) => location.pathname.startsWith(path)) &&
    !FULL_SCREEN_PAGES.includes(location.pathname);

  // Full-screen layout (landing page, etc.)
  if (!showSidebar) {
    return (
      <div
        className="min-h-screen bg-bg-dark text-text-primary"
        data-testid="root-layout"
      >
        <Outlet />
      </div>
    );
  }

  // App shell layout with sidebar
  return (
    <div
      className="flex min-h-screen bg-bg-dark text-text-primary"
      data-testid="root-layout"
    >
      {/* Mobile Menu Button - Fixed position hamburger */}
      {isMobile && (
        <button
          type="button"
          onClick={handleMobileMenuToggle}
          className={cn(
            'fixed top-3 left-3 z-50 flex items-center justify-center',
            'w-10 h-10 rounded-lg bg-bg-card border border-border-default',
            'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
            'transition-colors duration-normal',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
            mobileMenuOpen && 'bg-bg-hover'
          )}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          data-testid="mobile-menu-button"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" strokeWidth={1.5} />
          ) : (
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          )}
        </button>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleMobileMenuClose}
          aria-hidden="true"
          data-testid="mobile-menu-overlay"
        />
      )}

      {/* Sidebar Navigation */}
      {/* On mobile: overlay sidebar when menu is open */}
      {/* On desktop: static sidebar */}
      {(!isMobile || mobileMenuOpen) && (
        <div
          className={cn(
            isMobile && [
              'fixed left-0 top-0 z-40 h-full',
              'animate-in slide-in-from-left duration-300',
            ]
          )}
        >
          <Sidebar
            collapsed={isMobile ? false : sidebarCollapsed}
            onToggle={isMobile ? undefined : handleSidebarToggle}
            data-testid="app-sidebar"
          >
            {/* Main navigation */}
            <SidebarSection>
              <SidebarNav
                items={defaultNavigationItems}
                collapsed={isMobile ? false : sidebarCollapsed}
              />
            </SidebarSection>

            {/* Settings navigation (at bottom) */}
            <SidebarSection className="mt-auto pt-4 border-t border-border-default">
              <SidebarNav
                items={settingsNavigationItems}
                collapsed={isMobile ? false : sidebarCollapsed}
              />
            </SidebarSection>
          </Sidebar>
        </div>
      )}

      {/* Main content area */}
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0',
          isMobile && 'pt-14' // Add top padding for mobile menu button
        )}
        style={
          isMobile
            ? undefined
            : {
                width: `calc(100% - ${sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED}px)`,
              }
        }
        data-testid="main-content-area"
      >
        <Outlet />
      </div>
    </div>
  );
}
