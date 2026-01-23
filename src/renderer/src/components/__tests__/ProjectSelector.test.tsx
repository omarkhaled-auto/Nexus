/**
 * ProjectSelector Component Tests
 * Phase 21 Task 7: UI Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectSelector } from '../ProjectSelector';

// Mock window.nexusAPI
const mockNexusAPI = {
  dialog: {
    openDirectory: vi.fn(),
    openFile: vi.fn(),
    saveFile: vi.fn(),
  },
  projectInit: {
    initialize: vi.fn(),
    load: vi.fn(),
    validatePath: vi.fn(),
    isPathEmpty: vi.fn(),
  },
};

// Setup global mock
beforeEach(() => {
  vi.clearAllMocks();
  // @ts-expect-error - mocking window.nexusAPI
  window.nexusAPI = mockNexusAPI;
});

describe('ProjectSelector', () => {
  describe('Genesis Mode', () => {
    it('should render genesis mode UI correctly', () => {
      render(
        <ProjectSelector
          mode="genesis"
          open={true}
          onOpenChange={vi.fn()}
          onProjectSelected={vi.fn()}
        />
      );

      expect(screen.getByText('Create New Project')).toBeTruthy();
      expect(screen.getByText('Project Name')).toBeTruthy();
      expect(screen.getByText('Location')).toBeTruthy();
      expect(screen.getByText('Create Project')).toBeTruthy();
    });

    it('should keep confirm button disabled when path is set but no project name', async () => {
      render(
        <ProjectSelector
          mode="genesis"
          open={true}
          onOpenChange={vi.fn()}
          onProjectSelected={vi.fn()}
        />
      );

      // Set a path but no name
      mockNexusAPI.dialog.openDirectory.mockResolvedValueOnce({
        canceled: false,
        path: '/test/path',
      });
      mockNexusAPI.projectInit.isPathEmpty.mockResolvedValueOnce({
        exists: true,
        empty: true,
      });

      // Click folder button using test ID
      const folderButton = screen.getByTestId('folder-select-btn');
      fireEvent.click(folderButton);

      await waitFor(() => {
        expect(mockNexusAPI.dialog.openDirectory).toHaveBeenCalled();
      });

      // Confirm button should still be disabled (no name entered)
      const confirmButton = screen.getByTestId('confirm-btn');
      expect(confirmButton.hasAttribute('disabled')).toBe(true);
    });

    it('should call initialize on confirm with valid data', async () => {
      const onProjectSelected = vi.fn();
      const onOpenChange = vi.fn();

      mockNexusAPI.dialog.openDirectory.mockResolvedValueOnce({
        canceled: false,
        path: '/test/path',
      });
      mockNexusAPI.projectInit.isPathEmpty.mockResolvedValueOnce({
        exists: true,
        empty: true,
      });
      mockNexusAPI.projectInit.initialize.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'proj_123',
          name: 'test-project',
          path: '/test/path/test-project',
          createdAt: new Date(),
        },
      });

      render(
        <ProjectSelector
          mode="genesis"
          open={true}
          onOpenChange={onOpenChange}
          onProjectSelected={onProjectSelected}
        />
      );

      // Enter project name
      const nameInput = screen.getByPlaceholderText('my-awesome-app');
      fireEvent.change(nameInput, { target: { value: 'test-project' } });

      // Select folder
      const folderButton = screen.getByTestId('folder-select-btn');
      fireEvent.click(folderButton);

      await waitFor(() => {
        expect(mockNexusAPI.dialog.openDirectory).toHaveBeenCalled();
      });

      // Create project
      const confirmButton = screen.getByTestId('confirm-btn');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockNexusAPI.projectInit.initialize).toHaveBeenCalledWith({
          name: 'test-project',
          path: '/test/path',
          initGit: true,
        });
        expect(onProjectSelected).toHaveBeenCalledWith({
          id: 'proj_123',
          name: 'test-project',
          path: '/test/path/test-project',
          createdAt: expect.any(Date),
        });
      });
    });

    it('should validate project name format', async () => {
      mockNexusAPI.dialog.openDirectory.mockResolvedValueOnce({
        canceled: false,
        path: '/test/path',
      });
      mockNexusAPI.projectInit.isPathEmpty.mockResolvedValueOnce({
        exists: true,
        empty: true,
      });

      render(
        <ProjectSelector
          mode="genesis"
          open={true}
          onOpenChange={vi.fn()}
          onProjectSelected={vi.fn()}
        />
      );

      // Enter invalid project name with spaces
      const nameInput = screen.getByPlaceholderText('my-awesome-app');
      fireEvent.change(nameInput, { target: { value: 'test project' } });

      // Select folder
      const folderButton = screen.getByTestId('folder-select-btn');
      fireEvent.click(folderButton);

      await waitFor(() => {
        expect(mockNexusAPI.dialog.openDirectory).toHaveBeenCalled();
      });

      // Try to create
      const confirmButton = screen.getByTestId('confirm-btn');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/can only contain letters, numbers, dashes, and underscores/i)).toBeTruthy();
      });
    });
  });

  describe('Evolution Mode', () => {
    it('should render evolution mode UI correctly', () => {
      render(
        <ProjectSelector
          mode="evolution"
          open={true}
          onOpenChange={vi.fn()}
          onProjectSelected={vi.fn()}
        />
      );

      expect(screen.getByText('Open Existing Project')).toBeTruthy();
      expect(screen.getByText('Project Folder')).toBeTruthy();
      expect(screen.getByText('Open Project')).toBeTruthy();
      // Should NOT show project name input for evolution mode
      expect(screen.queryByPlaceholderText('my-awesome-app')).toBeNull();
    });

    it('should call load on confirm with valid path', async () => {
      const onProjectSelected = vi.fn();
      const onOpenChange = vi.fn();

      mockNexusAPI.dialog.openDirectory.mockResolvedValueOnce({
        canceled: false,
        path: '/existing/project',
      });
      mockNexusAPI.projectInit.validatePath.mockResolvedValueOnce({
        valid: true,
        isNexusProject: true,
      });
      mockNexusAPI.projectInit.load.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'proj_456',
          name: 'existing-project',
          path: '/existing/project',
          isNexusProject: true,
          hasGit: true,
          config: {
            name: 'existing-project',
            version: '1.0.0',
            created: '2025-01-01',
            nexusVersion: '1.0.0',
            settings: {
              maxAgents: 4,
              qaMaxIterations: 50,
              taskMaxMinutes: 30,
              checkpointIntervalSeconds: 7200,
            },
          },
        },
      });

      render(
        <ProjectSelector
          mode="evolution"
          open={true}
          onOpenChange={onOpenChange}
          onProjectSelected={onProjectSelected}
        />
      );

      // Select folder
      const folderButton = screen.getByTestId('folder-select-btn');
      fireEvent.click(folderButton);

      await waitFor(() => {
        expect(mockNexusAPI.dialog.openDirectory).toHaveBeenCalled();
        expect(mockNexusAPI.projectInit.validatePath).toHaveBeenCalledWith('/existing/project');
      });

      // Open project
      const confirmButton = screen.getByTestId('confirm-btn');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockNexusAPI.projectInit.load).toHaveBeenCalledWith('/existing/project');
        expect(onProjectSelected).toHaveBeenCalledWith({
          id: 'proj_456',
          name: 'existing-project',
          path: '/existing/project',
          description: undefined,
          isNexusProject: true,
          hasGit: true,
        });
      });
    });

    it('should show validation feedback for valid path', async () => {
      mockNexusAPI.dialog.openDirectory.mockResolvedValueOnce({
        canceled: false,
        path: '/valid/path',
      });
      mockNexusAPI.projectInit.validatePath.mockResolvedValueOnce({
        valid: true,
        isNexusProject: true,
      });

      render(
        <ProjectSelector
          mode="evolution"
          open={true}
          onOpenChange={vi.fn()}
          onProjectSelected={vi.fn()}
        />
      );

      // Select folder
      const folderButton = screen.getByTestId('folder-select-btn');
      fireEvent.click(folderButton);

      await waitFor(() => {
        expect(mockNexusAPI.projectInit.validatePath).toHaveBeenCalled();
      });

      // Should show valid message
      await waitFor(() => {
        expect(screen.getByText(/valid project directory/i)).toBeTruthy();
      });
    });
  });

  describe('Common Behavior', () => {
    it('should handle cancel correctly', () => {
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ProjectSelector
          mode="genesis"
          open={true}
          onOpenChange={onOpenChange}
          onProjectSelected={vi.fn()}
          onCancel={onCancel}
        />
      );

      const cancelButton = screen.getByTestId('cancel-btn');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should handle dialog cancel correctly', async () => {
      mockNexusAPI.dialog.openDirectory.mockResolvedValueOnce({
        canceled: true,
        path: null,
      });

      render(
        <ProjectSelector
          mode="genesis"
          open={true}
          onOpenChange={vi.fn()}
          onProjectSelected={vi.fn()}
        />
      );

      // Click folder button
      const folderButton = screen.getByTestId('folder-select-btn');
      fireEvent.click(folderButton);

      await waitFor(() => {
        expect(mockNexusAPI.dialog.openDirectory).toHaveBeenCalled();
      });

      // Path input should remain empty (check via element attribute)
      const pathInput = screen.getByPlaceholderText('Select a folder...');
      expect(pathInput.getAttribute('value')).toBe('');
    });

    it('should disable confirm button when no path selected', () => {
      render(
        <ProjectSelector
          mode="genesis"
          open={true}
          onOpenChange={vi.fn()}
          onProjectSelected={vi.fn()}
        />
      );

      const confirmButton = screen.getByTestId('confirm-btn');
      expect(confirmButton.hasAttribute('disabled')).toBe(true);
    });
  });
});
