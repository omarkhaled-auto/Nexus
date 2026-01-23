import type { ReactElement } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';
import { ThemeProvider } from './components/theme-provider';
import { RootLayout } from './components/layout/RootLayout';
import { ModeSelectorPage } from './pages/ModeSelectorPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Suspense, lazy, useEffect } from 'react';
import { useThemeEffect } from './hooks/useTheme';
import { useNexusEvents } from './hooks/useNexusEvents';
import { useRealTimeUpdates } from './hooks/useRealTimeUpdates';
import { useSettingsStore } from './stores/settingsStore';
import { Toaster } from 'sonner';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

// Lazy load pages that aren't immediately needed
const InterviewPage = lazy(() => import('./pages/InterviewPage'));
const KanbanPage = lazy(() => import('./pages/KanbanPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const ExecutionPage = lazy(() => import('./pages/ExecutionPage'));

/**
 * Loading fallback component for lazy-loaded pages.
 * Uses Nexus design system colors for consistency.
 */
function PageLoader(): ReactElement {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-dark" data-testid="page-loader">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
        <span className="text-sm text-text-secondary animate-pulse">Loading...</span>
      </div>
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
 * - /agents → Agents Activity Page (Phase 17)
 * - /execution → Execution Logs Page (Phase 17)
 * - /settings → Settings Page (Phase 12)
 */
const router = createHashRouter([
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
        path: 'agents',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AgentsPage />
          </Suspense>
        ),
      },
      {
        path: 'execution',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ExecutionPage />
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
 * Loads settings on mount, applies theme effect, and sets up Nexus event handling.
 * This ensures settings-based theme is applied after initial load
 * and backend events are properly routed to UI stores.
 *
 * Phase 19 Task 5: Added useNexusEvents for Backend -> UI event wiring.
 * Phase 19 Task 16: Added useRealTimeUpdates for dashboard/agent/execution events.
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

  // Subscribe to Nexus backend events for real-time UI updates
  // This wires: Backend Events -> IPC -> UI Stores
  useNexusEvents();

  // Subscribe to real-time dashboard, agent, and execution events
  // This wires: metrics:updated, timeline:event, agent:metrics, etc.
  useRealTimeUpdates();

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
