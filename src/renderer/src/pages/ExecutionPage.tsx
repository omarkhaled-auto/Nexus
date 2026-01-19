import type { ReactElement } from 'react';
import { Header } from '@renderer/components/layout/Header';
import { Terminal, Trash2, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { useState } from 'react';
import { cn } from '@renderer/lib/utils';

// ============================================================================
// Types
// ============================================================================

type TabId = 'build' | 'lint' | 'test' | 'review';
type TabStatus = 'pending' | 'running' | 'success' | 'error';

interface LogTab {
  id: TabId;
  label: string;
  status: TabStatus;
  count?: number;
  duration?: number;
  logs: string[];
}

// ============================================================================
// Mock Data (will be replaced with real data from stores/IPC)
// ============================================================================

const mockTabs: LogTab[] = [
  {
    id: 'build',
    label: 'Build',
    status: 'success',
    duration: 2300,
    logs: [
      '$ tsc --noEmit',
      '',
      'Compiling 47 files...',
      '  src/auth/middleware.ts',
      '  src/auth/jwt.ts',
      '  src/auth/oauth.ts',
      '  src/api/routes.ts',
      '  src/api/handlers/userHandler.ts',
      '  src/api/handlers/teamHandler.ts',
      '  src/database/schema.ts',
      '  src/database/migrations/001_init.ts',
      '  ... and 39 more files',
      '',
      'Compilation complete. 0 errors.',
      'Duration: 2.3s',
    ],
  },
  {
    id: 'lint',
    label: 'Lint',
    status: 'success',
    count: 0,
    duration: 1100,
    logs: [
      '$ eslint src/ --ext .ts,.tsx',
      '',
      'Checking 47 files...',
      '',
      'All files passed linting',
      'Checked 47 files in 1.1s',
    ],
  },
  {
    id: 'test',
    label: 'Test',
    status: 'running',
    count: 47,
    logs: [
      '$ vitest run',
      '',
      ' DEV  v1.6.0 /project',
      '',
      ' auth/middleware.test.ts (8 tests) 234ms',
      '   verifyToken',
      '     verifies valid tokens',
      '     rejects expired tokens',
      '     rejects invalid signatures',
      '   refreshToken',
      '     rotates refresh tokens',
      '     invalidates old refresh tokens',
      '   validateSession',
      '     validates active sessions',
      '     rejects expired sessions',
      '     handles concurrent sessions',
      '',
      ' auth/jwt.test.ts (10 tests) 156ms',
      '   signToken',
      '     creates valid JWT tokens',
      '     includes correct claims',
      '     sets expiration correctly',
      '   verifyToken',
      '     verifies valid tokens',
      '     handles malformed tokens',
      '   ...',
      '',
      ' auth/oauth.test.ts (5 tests) 312ms',
      '   GoogleOAuth',
      '     handles authorization code',
      '     exchanges tokens correctly',
      '   GitHubOAuth',
      '     handles authorization code',
      '     exchanges tokens correctly',
      '     handles organization access',
      '',
      ' Running 24 more tests...',
    ],
  },
  {
    id: 'review',
    label: 'Review',
    status: 'pending',
    logs: ['Waiting for tests to complete...'],
  },
];

// ============================================================================
// Tab Button Component
// ============================================================================

interface TabButtonProps {
  tab: LogTab;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ tab, isActive, onClick }: TabButtonProps): ReactElement {
  const getStatusIcon = () => {
    switch (tab.status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-accent-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-accent-error" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-bg-hover" />;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg',
        'transition-colors border-b-2',
        isActive
          ? 'text-text-primary border-accent-primary bg-bg-card'
          : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-hover'
      )}
      data-testid={`execution-tab-${tab.id}`}
    >
      {getStatusIcon()}
      <span>{tab.label}</span>
      {tab.count !== undefined && (
        <span
          className={cn(
            'px-1.5 py-0.5 text-xs rounded',
            tab.status === 'error' ? 'bg-accent-error/20 text-accent-error' : 'bg-bg-hover text-text-secondary'
          )}
        >
          {tab.count}
        </span>
      )}
      {tab.duration && (
        <span className="text-xs text-text-tertiary">{(tab.duration / 1000).toFixed(1)}s</span>
      )}
    </button>
  );
}

// ============================================================================
// Log Viewer Component
// ============================================================================

interface LogViewerProps {
  logs: string[];
  status: TabStatus;
}

function LogViewer({ logs, status }: LogViewerProps): ReactElement {
  return (
    <div
      className={cn(
        'flex-1 bg-bg-dark rounded-lg border border-border-default overflow-auto',
        'font-mono text-sm'
      )}
      data-testid="log-viewer"
    >
      <div className="p-4 space-y-0.5">
        {logs.map((line, index) => (
          <div
            key={index}
            className={cn(
              'flex items-start gap-3 leading-relaxed',
              line.startsWith('$') && 'text-accent-secondary font-semibold',
              line.includes('error') && 'text-accent-error',
              line.includes('warning') && 'text-accent-warning',
              (line.includes('') || line.includes('passed') || line.includes('success')) &&
                'text-accent-success',
              !line.startsWith('$') &&
                !line.includes('error') &&
                !line.includes('warning') &&
                !line.includes('') &&
                !line.includes('passed') &&
                !line.includes('success') &&
                'text-text-secondary'
            )}
          >
            <span className="w-8 text-right text-text-tertiary shrink-0 select-none">
              {index + 1}
            </span>
            <span className="whitespace-pre-wrap">{line || ' '}</span>
          </div>
        ))}

        {/* Running indicator */}
        {status === 'running' && (
          <div className="flex items-center gap-3 mt-4 text-accent-primary">
            <span className="w-8" />
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="animate-pulse">Running...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ExecutionPage Component
// ============================================================================

/**
 * Execution Page - View build, lint, test, and review logs.
 *
 * Displays:
 * - Tab navigation for different QA stages
 * - Syntax-highlighted log output
 * - Status indicators and durations
 * - Clear and export actions
 */
export default function ExecutionPage(): ReactElement {
  const [activeTab, setActiveTab] = useState<TabId>('test');
  const activeTabData = mockTabs.find((t) => t.id === activeTab) || mockTabs[0];

  const handleClearLogs = () => {
    // TODO: Implement clear logs via IPC
  };

  const handleExportLogs = () => {
    // TODO: Implement export logs
  };

  return (
    <div className="flex flex-col h-screen" data-testid="execution-page">
      {/* Header */}
      <Header
        title="Execution Logs"
        subtitle={`Current task: Auth System`}
        icon={Terminal}
        showBack
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportLogs}
              data-testid="export-logs-button"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearLogs}
              data-testid="clear-logs-button"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 min-h-0">
        {/* Tab Navigation */}
        <div
          className="flex items-center gap-1 border-b border-border-default shrink-0"
          role="tablist"
          data-testid="execution-tabs"
        >
          {mockTabs.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {/* Log Output */}
        <div className="flex-1 mt-4 min-h-0 flex flex-col">
          <LogViewer logs={activeTabData.logs} status={activeTabData.status} />
        </div>

        {/* Summary Bar */}
        <div
          className="flex items-center justify-between mt-4 px-4 py-3 bg-bg-card rounded-lg border border-border-default shrink-0"
          data-testid="execution-summary"
        >
          <div className="flex items-center gap-4">
            {mockTabs.map((tab) => (
              <div key={tab.id} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    tab.status === 'success' && 'bg-accent-success',
                    tab.status === 'error' && 'bg-accent-error',
                    tab.status === 'running' && 'bg-accent-primary animate-pulse',
                    tab.status === 'pending' && 'bg-text-tertiary'
                  )}
                />
                <span className="text-text-secondary">{tab.label}</span>
              </div>
            ))}
          </div>
          <div className="text-sm text-text-tertiary">
            Total Duration:{' '}
            {(mockTabs.reduce((acc, t) => acc + (t.duration || 0), 0) / 1000).toFixed(1)}s
          </div>
        </div>
      </div>
    </div>
  );
}
