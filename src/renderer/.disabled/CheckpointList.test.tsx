import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckpointList } from './CheckpointList';
import type { Checkpoint } from '../../../../persistence/database/schema';

// Mock useCheckpoint hook
const mockLoadCheckpoints = vi.fn();
const mockRestoreCheckpoint = vi.fn();
const mockDeleteCheckpoint = vi.fn();
const mockCreateCheckpoint = vi.fn();

vi.mock('@renderer/hooks/useCheckpoint', () => ({
  useCheckpoint: () => ({
    checkpoints: mockCheckpoints,
    isLoading: mockIsLoading,
    error: null,
    loadCheckpoints: mockLoadCheckpoints,
    restoreCheckpoint: mockRestoreCheckpoint,
    deleteCheckpoint: mockDeleteCheckpoint,
    createCheckpoint: mockCreateCheckpoint,
  }),
}));

// Test state variables
let mockCheckpoints: Checkpoint[] = [];
let mockIsLoading = false;

function createTestCheckpoint(overrides: Partial<Checkpoint> = {}): Checkpoint {
  const now = new Date();
  return {
    id: `cp-${Math.random().toString(36).slice(2, 11)}`,
    projectId: 'project-1',
    name: 'Test Checkpoint',
    reason: 'Manual checkpoint',
    state: '{}',
    gitCommit: 'abc123',
    createdAt: now,
    ...overrides,
  };
}

describe('CheckpointList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckpoints = [];
    mockIsLoading = false;
  });

  it('renders loading state', () => {
    mockIsLoading = true;
    render(<CheckpointList projectId="project-1" />);
    expect(screen.getByText('Loading checkpoints...')).toBeInTheDocument();
  });

  it('renders empty state when no checkpoints', () => {
    mockCheckpoints = [];
    render(<CheckpointList projectId="project-1" />);
    expect(screen.getByText('No checkpoints yet')).toBeInTheDocument();
  });

  it('renders checkpoints list', () => {
    mockCheckpoints = [
      createTestCheckpoint({ id: 'cp-1', name: 'First Checkpoint' }),
      createTestCheckpoint({ id: 'cp-2', name: 'Second Checkpoint' }),
    ];
    render(<CheckpointList projectId="project-1" />);

    expect(screen.getByText('First Checkpoint')).toBeInTheDocument();
    expect(screen.getByText('Second Checkpoint')).toBeInTheDocument();
  });

  it('displays checkpoint reason when name is empty', () => {
    mockCheckpoints = [
      createTestCheckpoint({ id: 'cp-1', name: null, reason: 'Auto-checkpoint: phase_complete' }),
    ];
    render(<CheckpointList projectId="project-1" />);

    expect(screen.getByText('Auto-checkpoint: phase_complete')).toBeInTheDocument();
  });

  it('calls loadCheckpoints on mount', () => {
    render(<CheckpointList projectId="project-1" />);
    expect(mockLoadCheckpoints).toHaveBeenCalledWith('project-1');
  });

  it('calls restoreCheckpoint when restore button is clicked', async () => {
    mockCheckpoints = [createTestCheckpoint({ id: 'cp-1', name: 'Test Checkpoint' })];
    render(<CheckpointList projectId="project-1" />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Restore'));

    expect(mockRestoreCheckpoint).toHaveBeenCalledWith('cp-1', true);
  });

  it('calls deleteCheckpoint when delete button is clicked', async () => {
    mockCheckpoints = [createTestCheckpoint({ id: 'cp-1', name: 'Test Checkpoint' })];
    render(<CheckpointList projectId="project-1" />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Delete'));

    expect(mockDeleteCheckpoint).toHaveBeenCalledWith('cp-1');
  });

  it('calls createCheckpoint when create button is clicked', async () => {
    render(<CheckpointList projectId="project-1" />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Create Checkpoint'));

    expect(mockCreateCheckpoint).toHaveBeenCalledWith('project-1', 'Manual checkpoint');
  });

  it('displays Checkpoints header', () => {
    render(<CheckpointList projectId="project-1" />);
    expect(screen.getByText('Checkpoints')).toBeInTheDocument();
  });
});
