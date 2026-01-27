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
import { ProjectSelector, type ProjectData } from '@renderer/components/ProjectSelector';
import { uiBackendBridge } from '@renderer/bridges/UIBackendBridge';
import { useUIStore } from '@renderer/stores/uiStore';
import { useProjectStore } from '@renderer/stores/projectStore';
import { Sparkles, GitBranch, FolderOpen, Plus, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@renderer/lib/utils';

/**
 * Check if running in Electron environment
 */
const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && typeof window.nexusAPI !== 'undefined';
};

/**
 * Check if dialog API is available
 */
const hasDialogAPI = (): boolean => {
  return (
    isElectronEnvironment() &&
    typeof window.nexusAPI.dialog !== 'undefined'
  );
};

/**
 * Legacy project data interface for display (from backend projects:list)
 */
interface LegacyProjectData {
  id: string;
  name: string;
  mode: 'genesis' | 'evolution';
  status?: string;
}

/**
 * Mode Selector Page - Landing page with Genesis/Evolution mode cards.
 *
 * Design: Linear/Raycast-inspired aesthetic with dark theme, gradient accents,
 * glassmorphism, floating orbs, and 3D hover effects.
 *
 * Phase 21 Update: Now uses ProjectSelector with native folder dialog
 * for proper project directory selection.
 */
export function ModeSelectorPage(): ReactElement {
  const navigate = useNavigate();
  const isLoading = useUIStore((s) => s.isLoading);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  // State for the new ProjectSelector dialog
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [projectSelectorMode, setProjectSelectorMode] = useState<'genesis' | 'evolution'>('genesis');

  // State for legacy project selection modal (fallback when no dialog API)
  const [showLegacyModal, setShowLegacyModal] = useState(false);
  const [legacyProjects, setLegacyProjects] = useState<LegacyProjectData[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  /**
   * Load projects from backend (legacy method)
   */
  const loadLegacyProjects = useCallback(async () => {
    if (!isElectronEnvironment()) {
      setProjectsError('Backend not available. Please run in Electron.');
      return;
    }

    setLoadingProjects(true);
    setProjectsError(null);

    try {
      const projectsData = await window.nexusAPI.getProjects();
      if (Array.isArray(projectsData)) {
        const transformedProjects: LegacyProjectData[] = projectsData.map((p: unknown) => {
          const proj = p as { id: string; name: string; mode: 'genesis' | 'evolution'; status?: string };
          return {
            id: proj.id,
            name: proj.name,
            mode: proj.mode,
            status: proj.status,
          };
        });
        setLegacyProjects(transformedProjects);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      setProjectsError('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  /**
   * Handle Genesis card click
   * Opens ProjectSelector in genesis mode for folder selection
   */
  const handleGenesisClick = (): void => {
    if (hasDialogAPI()) {
      // Use new ProjectSelector with native folder dialog
      setProjectSelectorMode('genesis');
      setShowProjectSelector(true);
    } else {
      // Fallback: Navigate directly and let backend handle it
      void navigate('/genesis');
      void uiBackendBridge.startGenesis().catch((error: unknown) => {
        console.error('Failed to start Genesis:', error);
      });
    }
  };

  /**
   * Handle Evolution card click
   * Opens ProjectSelector in evolution mode for folder selection
   */
  const handleEvolutionClick = (): void => {
    if (hasDialogAPI()) {
      // Use new ProjectSelector with native folder dialog
      setProjectSelectorMode('evolution');
      setShowProjectSelector(true);
    } else {
      // Fallback: Show legacy project selector modal
      setShowLegacyModal(true);
      void loadLegacyProjects();
    }
  };

  /**
   * Handle project selected from ProjectSelector
   * This is called when user completes folder selection and project init/load
   * FIX #3: Await backend operations before navigation to avoid race conditions
   */
  const handleProjectSelected = async (project: ProjectData): Promise<void> => {
    console.log('[ModeSelectorPage] Project selected:', project);

    // Store project info in project store
    setCurrentProject({
      id: project.id,
      name: project.name,
      path: project.path,
      mode: projectSelectorMode,
    });

    // Navigate to appropriate page based on mode
    // FIX #3: Await backend operations before navigation
    if (projectSelectorMode === 'genesis') {
      try {
        await uiBackendBridge.startGenesis(project.path);
        void navigate('/genesis');
      } catch (error: unknown) {
        console.error('Failed to start Genesis:', error);
        setProjectsError('Failed to initialize project. Please try again.');
      }
    } else {
      try {
        await uiBackendBridge.startEvolution(project.id);
        void navigate('/evolution');
      } catch (error: unknown) {
        console.error('Failed to start Evolution:', error);
        setProjectsError('Failed to load project. Please try again.');
      }
    }
  };

  /**
   * Wrapper to handle async callback for ProjectSelector
   */
  const handleProjectSelectedWrapper = (project: ProjectData): void => {
    void handleProjectSelected(project);
  };

  /**
   * Handle legacy project selection (fallback)
   */
  const handleLegacySelectProject = (projectId: string): void => {
    setShowLegacyModal(false);
    void navigate('/evolution');
    void uiBackendBridge.startEvolution(projectId).catch((error: unknown) => {
      console.error('Failed to start Evolution:', error);
    });
  };

  /**
   * Handle legacy create new project (fallback)
   */
  const handleLegacyCreateNewProject = (): void => {
    setShowLegacyModal(false);
    void navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0D1117] relative overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-40" />

      {/* Radial gradient spotlight from center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.15)_0%,transparent_70%)]" />

      {/* Floating orbs with slow animation */}
      <div
        className="absolute top-20 left-20 w-64 h-64 bg-[#7C3AED]/10 rounded-full blur-3xl animate-float"
        style={{ animationDuration: '8s' }}
      />
      <div
        className="absolute bottom-20 right-20 w-96 h-96 bg-[#06B6D4]/8 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '2s', animationDuration: '10s' }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-48 h-48 bg-[#10B981]/8 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '4s', animationDuration: '12s' }}
      />

      {/* Content container with higher z-index */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Header with staggered animation */}
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-[#F0F6FC] via-[#F0F6FC] to-[#8B949E] bg-clip-text text-transparent">
            Nexus
          </h1>
          <p className="text-[#8B949E] mt-3 text-lg">
            Build anything with AI
          </p>
        </div>

        {/* Mode Cards with staggered entrance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Genesis Card */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            <Card
              className={cn(
                "group relative overflow-hidden cursor-pointer",
                "bg-[#161B22]/80 backdrop-blur-sm",
                "border border-[#30363D]",
                "transition-all duration-300 ease-out",
                "hover:scale-[1.02] hover:border-[#7C3AED]/50",
                "hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_30px_rgba(124,58,237,0.15)]"
              )}
              onClick={handleGenesisClick}
              data-testid="genesis-card"
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/20 via-[#7C3AED]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Shine sweep effect */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              </div>

              {/* Card content */}
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  {/* Icon with glow effect */}
                  <div className={cn(
                    "p-3 rounded-xl flex items-center justify-center",
                    "bg-gradient-to-br from-[#7C3AED]/20 to-[#7C3AED]/5",
                    "group-hover:shadow-[0_0_30px_rgba(124,58,237,0.4)]",
                    "transition-all duration-300"
                  )}>
                    <Sparkles className="h-7 w-7 text-[#A78BFA] group-hover:text-[#C4B5FD] transition-colors" />
                  </div>
                  <CardTitle className="text-2xl text-[#F0F6FC] group-hover:text-white transition-colors">
                    Genesis
                  </CardTitle>
                </div>
                <CardDescription className="text-base text-[#8B949E]">
                  Start a new project from scratch
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-[#8B949E] text-sm leading-relaxed">
                  Describe your idea in natural language. Nexus will interview you
                  to understand requirements, then build it autonomously.
                </p>
                <div className="mt-5 flex items-center text-xs text-[#6E7681]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#7C3AED] mr-2 group-hover:shadow-[0_0_8px_rgba(124,58,237,0.8)] transition-shadow" />
                  New applications
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Evolution Card */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <Card
              className={cn(
                "group relative overflow-hidden cursor-pointer",
                "bg-[#161B22]/80 backdrop-blur-sm",
                "border border-[#30363D]",
                "transition-all duration-300 ease-out",
                "hover:scale-[1.02] hover:border-[#10B981]/50",
                "hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_30px_rgba(16,185,129,0.15)]"
              )}
              onClick={handleEvolutionClick}
              data-testid="evolution-card"
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/20 via-[#10B981]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Shine sweep effect */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              </div>

              {/* Card content */}
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  {/* Icon with glow effect */}
                  <div className={cn(
                    "p-3 rounded-xl flex items-center justify-center",
                    "bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5",
                    "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]",
                    "transition-all duration-300"
                  )}>
                    <GitBranch className="h-7 w-7 text-[#34D399] group-hover:text-[#6EE7B7] transition-colors" />
                  </div>
                  <CardTitle className="text-2xl text-[#F0F6FC] group-hover:text-white transition-colors">
                    Evolution
                  </CardTitle>
                </div>
                <CardDescription className="text-base text-[#8B949E]">
                  Enhance an existing project
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-[#8B949E] text-sm leading-relaxed">
                  Add features to existing codebases. Manage work visually on a
                  Kanban board while AI agents handle implementation.
                </p>
                <div className="mt-5 flex items-center text-xs text-[#6E7681]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#10B981] mr-2 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-shadow" />
                  Existing codebases
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="mt-8 text-[#8B949E] animate-pulse text-center">
            <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
            Initializing...
          </div>
        )}

        {/* Footer hint with fade animation */}
        <p
          className="mt-12 text-xs text-[#484F58] text-center animate-fade-in-up"
          style={{ animationDelay: '0.4s' }}
        >
          Press a card to begin
        </p>
      </div>

      {/* New ProjectSelector Dialog (with native folder selection) */}
      <ProjectSelector
        mode={projectSelectorMode}
        open={showProjectSelector}
        onOpenChange={setShowProjectSelector}
        onProjectSelected={handleProjectSelectedWrapper}
        onCancel={() => { setShowProjectSelector(false); }}
      />

      {/* Legacy Project Selection Modal (fallback when no dialog API) */}
      <Dialog open={showLegacyModal} onOpenChange={setShowLegacyModal}>
        <DialogContent className="bg-[#161B22] border-[#30363D] max-w-md backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-[#F0F6FC] flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#10B981]/10">
                <GitBranch className="h-5 w-5 text-[#34D399]" />
              </div>
              Select Project
            </DialogTitle>
            <DialogDescription className="text-[#8B949E]">
              Choose an existing project to evolve, or create a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Loading State */}
            {loadingProjects && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#34D399]" />
                <span className="ml-2 text-[#8B949E]">Loading projects...</span>
              </div>
            )}

            {/* Error State */}
            {projectsError && !loadingProjects && (
              <div className="text-center py-8">
                <p className="text-sm text-red-400">{projectsError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-[#30363D] text-[#8B949E] hover:bg-[#21262D]"
                  onClick={() => void loadLegacyProjects()}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Projects List */}
            {!loadingProjects && !projectsError && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {legacyProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderOpen className="h-10 w-10 text-[#484F58] mx-auto mb-3" />
                    <p className="text-sm text-[#8B949E]">No projects yet</p>
                    <p className="text-xs text-[#6E7681] mt-1">Create your first project to get started</p>
                  </div>
                ) : (
                  legacyProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={(): void => { handleLegacySelectProject(project.id); }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                        'border-[#30363D] hover:border-[#10B981]/50 hover:bg-[#21262D]/50',
                        'text-left group'
                      )}
                      data-testid={`project-select-${project.id}`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                        <GitBranch className="h-5 w-5 text-[#34D399]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#F0F6FC] truncate">{project.name}</p>
                        <p className="text-xs text-[#8B949E] capitalize">{project.mode} mode</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#6E7681] group-hover:text-[#34D399] transition-colors" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#30363D]">
            <Button
              variant="outline"
              onClick={(): void => { setShowLegacyModal(false); }}
              className="border-[#30363D] text-[#8B949E] hover:bg-[#21262D]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLegacyCreateNewProject}
              className="gap-2 bg-[#10B981] hover:bg-[#059669] text-white"
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
