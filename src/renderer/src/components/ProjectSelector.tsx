/**
 * ProjectSelector Component
 * Phase 21 Task 7: UI Integration for Project Selection
 *
 * This component provides a unified interface for:
 * - Genesis Mode: Create new project with folder selection
 * - Evolution Mode: Load existing project with folder selection
 *
 * Uses the dialog and projectInit APIs exposed via preload script.
 */

import { useState, useCallback, type ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/Input';
import { FolderOpen, Plus, Loader2, Sparkles, GitBranch, AlertCircle } from 'lucide-react';
import { cn } from '@renderer/lib/utils';

/**
 * Check if running in Electron environment with dialog API
 */
const isElectronWithDialog = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof window.nexusAPI !== 'undefined' &&
    typeof window.nexusAPI.dialog !== 'undefined'
  );
};

/**
 * Project data returned from initialization/loading
 */
export interface ProjectData {
  id: string;
  name: string;
  path: string;
  createdAt?: Date;
  description?: string;
  isNexusProject?: boolean;
  hasGit?: boolean;
}

/**
 * Props for ProjectSelector component
 */
interface ProjectSelectorProps {
  /** Mode: 'genesis' for new project, 'evolution' for existing */
  mode: 'genesis' | 'evolution';
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Callback when a project is successfully selected/created */
  onProjectSelected: (project: ProjectData) => void;
  /** Optional callback when user cancels */
  onCancel?: () => void;
}

/**
 * ProjectSelector - Dialog for selecting or creating projects
 *
 * Genesis Mode:
 * - User enters project name
 * - User selects parent directory
 * - Creates new project with .nexus configuration
 *
 * Evolution Mode:
 * - User selects existing project directory
 * - Loads project (creates .nexus if needed)
 */
export function ProjectSelector({
  mode,
  open,
  onOpenChange,
  onProjectSelected,
  onCancel,
}: ProjectSelectorProps): ReactElement {
  // State
  const [projectName, setProjectName] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  /**
   * Reset state when dialog closes
   */
  const handleOpenChange = (newOpen: boolean): void => {
    if (!newOpen) {
      // Reset state on close
      setProjectName('');
      setSelectedPath(null);
      setError(null);
      setIsLoading(false);
      setValidationStatus('idle');
    }
    onOpenChange(newOpen);
  };

  /**
   * Handle folder selection via native dialog
   */
  const handleSelectFolder = useCallback(async () => {
    if (!isElectronWithDialog()) {
      setError('Dialog API not available. Please run in Electron.');
      return;
    }

    try {
      setError(null);
      const result = await window.nexusAPI.dialog.openDirectory({
        title: mode === 'genesis'
          ? 'Select Location for New Project'
          : 'Select Existing Project',
        buttonLabel: 'Select',
      });

      if (!result.canceled && result.path) {
        setSelectedPath(result.path);

        // For evolution mode, validate the selected path
        if (mode === 'evolution') {
          setValidationStatus('idle');
          const validation = await window.nexusAPI.projectInit.validatePath(result.path);
          if (validation.valid) {
            setValidationStatus('valid');
            setError(null);
          } else {
            setValidationStatus('invalid');
            setError(validation.error || 'Selected directory is not a valid project');
          }
        } else {
          // For genesis mode, check if path is empty or suitable
          const pathCheck = await window.nexusAPI.projectInit.isPathEmpty(result.path);
          if (!pathCheck.exists) {
            // Path doesn't exist - that's fine, we'll create it
            setValidationStatus('valid');
          } else if (pathCheck.empty) {
            setValidationStatus('valid');
          } else {
            // Path exists and is not empty - warn user
            setValidationStatus('valid'); // Still valid, just informational
          }
        }
      }
    } catch (err) {
      console.error('Failed to open folder dialog:', err);
      setError('Failed to open folder dialog');
    }
  }, [mode]);

  /**
   * Handle project creation (Genesis) or loading (Evolution)
   */
  const handleConfirm = useCallback(async () => {
    if (!selectedPath) {
      setError('Please select a folder');
      return;
    }

    if (mode === 'genesis' && !projectName.trim()) {
      setError('Please enter a project name');
      return;
    }

    // Validate project name (only alphanumeric, dash, underscore)
    if (mode === 'genesis') {
      const nameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!nameRegex.test(projectName.trim())) {
        setError('Project name can only contain letters, numbers, dashes, and underscores');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'genesis') {
        // Initialize new project
        const result = await window.nexusAPI.projectInit.initialize({
          name: projectName.trim(),
          path: selectedPath,
          initGit: true,
        });

        if (!result.success || !result.data) {
          setError(result.error || 'Failed to create project');
          setIsLoading(false);
          return;
        }

        onProjectSelected({
          id: result.data.id,
          name: result.data.name,
          path: result.data.path,
          createdAt: result.data.createdAt,
        });
      } else {
        // Load existing project
        const result = await window.nexusAPI.projectInit.load(selectedPath);

        if (!result.success || !result.data) {
          setError(result.error || 'Failed to load project');
          setIsLoading(false);
          return;
        }

        onProjectSelected({
          id: result.data.id,
          name: result.data.name,
          path: result.data.path,
          description: result.data.description,
          isNexusProject: result.data.isNexusProject,
          hasGit: result.data.hasGit,
        });
      }

      // Close dialog on success
      handleOpenChange(false);
    } catch (err) {
      console.error('Project operation failed:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [mode, projectName, selectedPath, onProjectSelected, handleOpenChange]);

  /**
   * Handle cancel
   */
  const handleCancel = (): void => {
    handleOpenChange(false);
    onCancel?.();
  };

  // Mode-specific styling
  const _modeColor = mode === 'genesis' ? 'violet' : 'emerald'; // Reserved for future styling
  const ModeIcon = mode === 'genesis' ? Sparkles : GitBranch;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-background border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className={cn(
              'p-1.5 rounded-md',
              mode === 'genesis' ? 'bg-violet-500/10 text-violet-500' : 'bg-emerald-500/10 text-emerald-500'
            )}>
              <ModeIcon className="h-5 w-5" />
            </div>
            {mode === 'genesis' ? 'Create New Project' : 'Open Existing Project'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {mode === 'genesis'
              ? 'Enter a name and select where to create your new project.'
              : 'Select an existing project folder to enhance with Nexus.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Project Name Input (Genesis only) */}
          {mode === 'genesis' && (
            <div className="space-y-2">
              <label htmlFor="project-name" className="text-sm font-medium text-foreground">
                Project Name
              </label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setError(null);
                }}
                placeholder="my-awesome-app"
                disabled={isLoading}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Letters, numbers, dashes, and underscores only
              </p>
            </div>
          )}

          {/* Folder Selection */}
          <div className="space-y-2">
            <label htmlFor="project-path" className="text-sm font-medium text-foreground">
              {mode === 'genesis' ? 'Location' : 'Project Folder'}
            </label>
            <div className="flex gap-2">
              <Input
                id="project-path"
                value={selectedPath || ''}
                readOnly
                placeholder="Select a folder..."
                className="flex-1 bg-muted/50 cursor-pointer"
                onClick={handleSelectFolder}
              />
              <Button
                type="button"
                variant="outline"
                size="icon" data-testid="folder-select-btn"
                onClick={handleSelectFolder}
                disabled={isLoading}
                className="shrink-0"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            {selectedPath && mode === 'genesis' && (
              <p className="text-xs text-muted-foreground">
                Project will be created at: {selectedPath}/{projectName || '[project-name]'}
              </p>
            )}
            {selectedPath && mode === 'evolution' && validationStatus === 'valid' && (
              <p className="text-xs text-emerald-500">
                Valid project directory
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel} data-testid="cancel-btn"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm} data-testid="confirm-btn"
            disabled={isLoading || !selectedPath || (mode === 'genesis' && !projectName.trim())}
            className={cn(
              mode === 'genesis'
                ? 'bg-violet-600 hover:bg-violet-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'genesis' ? 'Creating...' : 'Loading...'}
              </>
            ) : (
              <>
                {mode === 'genesis' ? (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Open Project
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProjectSelector;
