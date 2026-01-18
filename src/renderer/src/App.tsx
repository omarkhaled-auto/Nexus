import type { ReactElement } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ThemeProvider } from './components/theme-provider';
import { RootLayout } from './components/layout/RootLayout';
import { ModeSelectorPage } from './pages/ModeSelectorPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Suspense, lazy, useEffect } from 'react';
import { useThemeEffect } from './hooks/useTheme';
import { useSettingsStore } from './stores/settingsStore';
import { Toaster } from 'sonner';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

// Lazy load pages that aren't immediately needed
const InterviewPage = lazy(() => import('./pages/InterviewPage'));
const KanbanPage = lazy(() => import('./pages/KanbanPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

/**
 * Loading fallback component for lazy-loaded pages.
 */
function PageLoader(): ReactElement {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/**
 * Application router configuration.
 *
 * Routes:
 * - / → Mode Selector (Genesis/Evolution cards)
 * - /genesis → Interview Page (Phase 6)
 * - /evolution → Kanban Page (Phase 7)
 * - /dashboard → Dashboard Page (Phase 8)
 * - /settings → Settings Page (Phase 12)
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <ModeSelectorPage />,
      },
      {
        path: 'genesis',
        element: (
          <Suspense fallback={<PageLoader />}>
            <InterviewPage />
          </Suspense>
        ),
      },
      {
        path: 'evolution',
        element: (
          <Suspense fallback={<PageLoader />}>
            <KanbanPage />
          </Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
    ],
  },
]);

/**
 * Settings and Theme Initializer
 *
 * Loads settings on mount and applies theme effect.
 * This ensures settings-based theme is applied after initial load.
 */
function SettingsInitializer({ children }: { children: React.ReactNode }): ReactElement {
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  // Load settings on mount (theme will be applied via useThemeEffect)
  useEffect(() => {
    // Only load if nexusAPI is available (Electron context)
    if (typeof window.nexusAPI !== 'undefined') {
      void loadSettings();
    }
  }, [loadSettings]);

  // Apply theme from settings (or system default if not loaded)
  useThemeEffect();

  return <>{children}</>;
}

/**
 * Nexus Application Root Component
 *
 * Provides theme context and routing for the entire application.
 * Uses ThemeProvider for initial render (avoids flash) and
 * SettingsInitializer for settings-based theme after load.
 */
function App(): ReactElement {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="nexus-theme">
      <SettingsInitializer>
        <ErrorBoundary>
          <RouterProvider router={router} />
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
          <KeyboardShortcutsModal />
        </ErrorBoundary>
      </SettingsInitializer>
    </ThemeProvider>
  );
}

export default App;
