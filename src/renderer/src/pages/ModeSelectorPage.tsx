import { useState, useCallback, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@renderer/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { uiBackendBridge } from '@renderer/bridges/UIBackendBridge';
import { useUIStore } from '@renderer/stores/uiStore';
import { Sparkles, GitBranch, FolderOpen, Plus, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@renderer/lib/utils';

/**
 * Check if running in Electron environment
 */
const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && typeof window.nexusAPI !== 'undefined';
};

/**
 * Project data interface for display
 */
interface ProjectData {
  id: string;
  name: string;
  mode: 'genesis' | 'evolution';
  status?: string;
}

/**
 * Mode Selector Page - Landing page with Genesis/Evolution mode cards.
 *
 * Design: Cursor-style aesthetic with dark theme, gradient accents,
 * and subtle hover effects. Two prominent cards for mode selection.
 */
export function ModeSelectorPage(): ReactElement {
  const navigate = useNavigate();
  const isLoading = useUIStore((s) => s.isLoading);

  // State for project selection modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  /**
   * Load projects from backend
   */
  const loadProjects = useCallback(async () => {
    if (!isElectronEnvironment()) {
      setProjectsError('Backend not available. Please run in Electron.');
      return;
    }

    setLoadingProjects(true);
    setProjectsError(null);

    try {
      const projectsData = await window.nexusAPI.getProjects();
      if (Array.isArray(projectsData)) {
        const transformedProjects: ProjectData[] = projectsData.map((p: unknown) => {
          const proj = p as { id: string; name: string; mode: 'genesis' | 'evolution'; status?: string };
          return {
            id: proj.id,
            name: proj.name,
            mode: proj.mode,
            status: proj.status,
          };
        });
        setProjects(transformedProjects);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      setProjectsError('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const handleGenesisClick = (): void => {
    // Navigate immediately for responsive UX
    void navigate('/genesis');
    // Fire backend call as side effect (non-blocking)
    void uiBackendBridge.startGenesis().catch((error: unknown) => {
      console.error('Failed to start Genesis:', error);
    });
  };

  const handleEvolutionClick = (): void => {
    // Show project selector modal instead of navigating immediately
    setShowProjectModal(true);
    void loadProjects();
  };

  const handleSelectProject = (projectId: string): void => {
    setShowProjectModal(false);
    // Navigate to evolution/kanban page
    void navigate('/evolution');
    // Fire backend call to start evolution with selected project
    void uiBackendBridge.startEvolution(projectId).catch((error: unknown) => {
      console.error('Failed to start Evolution:', error);
    });
  };

  const handleCreateNewProject = (): void => {
    setShowProjectModal(false);
    // Navigate to dashboard where user can create a new project
    void navigate('/dashboard');
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

      {/* Project Selection Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="bg-bg-card border-border-default max-w-md">
          <DialogHeader>
            <DialogTitle className="text-text-primary flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-emerald-500" />
              Select Project
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              Choose an existing project to evolve, or create a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Loading State */}
            {loadingProjects && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                <span className="ml-2 text-text-secondary">Loading projects...</span>
              </div>
            )}

            {/* Error State */}
            {projectsError && !loadingProjects && (
              <div className="text-center py-8">
                <p className="text-sm text-accent-error">{projectsError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => void loadProjects()}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Projects List */}
            {!loadingProjects && !projectsError && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {projects.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderOpen className="h-10 w-10 text-text-tertiary mx-auto mb-3" />
                    <p className="text-sm text-text-secondary">No projects yet</p>
                    <p className="text-xs text-text-tertiary mt-1">Create your first project to get started</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={(): void => { handleSelectProject(project.id); }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                        'border-border-default hover:border-emerald-500/50 hover:bg-bg-hover',
                        'text-left group'
                      )}
                      data-testid={`project-select-${project.id}`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <GitBranch className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">{project.name}</p>
                        <p className="text-xs text-text-tertiary capitalize">{project.mode} mode</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-text-tertiary group-hover:text-emerald-500 transition-colors" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border-default">
            <Button
              variant="outline"
              onClick={(): void => { setShowProjectModal(false); }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateNewProject}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
