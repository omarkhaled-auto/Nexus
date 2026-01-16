import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@renderer/components/ui/card';
import { uiBackendBridge } from '@renderer/bridges/UIBackendBridge';
import { useUIStore } from '@renderer/stores/uiStore';
import { Sparkles, GitBranch } from 'lucide-react';

/**
 * Mode Selector Page - Landing page with Genesis/Evolution mode cards.
 *
 * Design: Cursor-style aesthetic with dark theme, gradient accents,
 * and subtle hover effects. Two prominent cards for mode selection.
 */
export function ModeSelectorPage(): ReactElement {
  const navigate = useNavigate();
  const isLoading = useUIStore((s) => s.isLoading);

  const handleGenesisClick = (): void => {
    // Navigate immediately for responsive UX
    void navigate('/genesis');
    // Fire backend call as side effect (non-blocking)
    void uiBackendBridge.startGenesis().catch((error: unknown) => {
      console.error('Failed to start Genesis:', error);
    });
  };

  const handleEvolutionClick = (): void => {
    // Navigate immediately for responsive UX
    void navigate('/evolution');
    // Fire backend call as side effect (non-blocking)
    // TODO: In production, show project selector first
    void uiBackendBridge.startEvolution('placeholder-project').catch((error: unknown) => {
      console.error('Failed to start Evolution:', error);
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          Nexus
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Build anything with AI
        </p>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {/* Genesis Card */}
        <Card
          className="relative overflow-hidden cursor-pointer group hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10"
          onClick={handleGenesisClick}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
                <Sparkles className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">Genesis</CardTitle>
            </div>
            <CardDescription className="text-base">
              Start a new project from scratch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Describe your idea in natural language. Nexus will interview you
              to understand requirements, then build it autonomously.
            </p>
            <div className="mt-4 flex items-center text-xs text-muted-foreground/60">
              <span className="inline-block w-2 h-2 rounded-full bg-violet-500 mr-2" />
              New applications
            </div>
          </CardContent>
        </Card>

        {/* Evolution Card */}
        <Card
          className="relative overflow-hidden cursor-pointer group hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
          onClick={handleEvolutionClick}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <GitBranch className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">Evolution</CardTitle>
            </div>
            <CardDescription className="text-base">
              Enhance an existing project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Add features to existing codebases. Manage work visually on a
              Kanban board while AI agents handle implementation.
            </p>
            <div className="mt-4 flex items-center text-xs text-muted-foreground/60">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
              Existing codebases
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="mt-8 text-muted-foreground animate-pulse">
          Initializing...
        </div>
      )}

      {/* Footer hint */}
      <p className="mt-12 text-xs text-muted-foreground/50">
        Press a card to begin
      </p>
    </div>
  );
}
