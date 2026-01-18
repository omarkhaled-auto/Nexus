import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewModal } from './ReviewModal';
import type { HumanReviewRequest } from '../../../../orchestration/review/HumanReviewService';

function createTestReview(overrides: Partial<HumanReviewRequest> = {}): HumanReviewRequest {
  return {
    id: 'review-1',
    taskId: 'task-123',
    projectId: 'project-1',
    reason: 'qa_exhausted',
    context: {
      qaIterations: 5,
    },
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ReviewModal', () => {
  const mockOnApprove = vi.fn().mockResolvedValue(undefined);
  const mockOnReject = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when review is null', () => {
    const { container } = render(
      <ReviewModal
        review={null}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays review title', () => {
    render(
      <ReviewModal
        review={createTestReview()}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText('Human Review Required')).toBeInTheDocument();
  });

  it('displays task ID', () => {
    render(
      <ReviewModal
        review={createTestReview({ taskId: 'task-abc-123' })}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText('task-abc-123')).toBeInTheDocument();
  });

  it('displays qa_exhausted reason description', () => {
    render(
      <ReviewModal
        review={createTestReview({ reason: 'qa_exhausted', context: { qaIterations: 10 } })}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText('QA loop exhausted after 10 iterations')).toBeInTheDocument();
  });

  it('displays merge_conflict reason description', () => {
    render(
      <ReviewModal
        review={createTestReview({ reason: 'merge_conflict', context: {} })}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText('Merge conflict detected')).toBeInTheDocument();
  });

  it('displays escalation reason when provided', () => {
    render(
      <ReviewModal
        review={createTestReview({ context: { escalationReason: 'Build failed 3 times' } })}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText('Build failed 3 times')).toBeInTheDocument();
  });

  it('displays suggested action when provided', () => {
    render(
      <ReviewModal
        review={createTestReview({ context: { suggestedAction: 'Check type errors' } })}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText('Check type errors')).toBeInTheDocument();
  });

  it('requires feedback for rejection', () => {
    render(
      <ReviewModal
        review={createTestReview()}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const rejectButton = screen.getByText('Reject');
    expect(rejectButton).toBeDisabled();
  });

  it('enables reject button when feedback is entered', async () => {
    render(
      <ReviewModal
        review={createTestReview()}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText('Enter feedback or resolution notes...');
    await user.type(textarea, 'Some feedback');

    const rejectButton = screen.getByText('Reject');
    expect(rejectButton).not.toBeDisabled();
  });

  it('calls onApprove when approve button is clicked', async () => {
    render(
      <ReviewModal
        review={createTestReview({ id: 'review-xyz' })}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByText('Approve'));
    await vi.waitFor(() => {
      expect(mockOnApprove).toHaveBeenCalledWith('review-xyz', undefined);
    });
  });

  it('calls onApprove with resolution when provided', async () => {
    render(
      <ReviewModal
        review={createTestReview({ id: 'review-xyz' })}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText('Enter feedback or resolution notes...');
    await user.type(textarea, 'Looks good to me');
    await user.click(screen.getByText('Approve'));

    expect(mockOnApprove).toHaveBeenCalledWith('review-xyz', 'Looks good to me');
  });

  it('calls onReject with feedback when reject is clicked', async () => {
    render(
      <ReviewModal
        review={createTestReview({ id: 'review-xyz' })}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText('Enter feedback or resolution notes...');
    await user.type(textarea, 'Needs more work');
    await user.click(screen.getByText('Reject'));

    expect(mockOnReject).toHaveBeenCalledWith('review-xyz', 'Needs more work');
  });

  it('displays Task ID label', () => {
    render(
      <ReviewModal
        review={createTestReview()}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText('Task ID')).toBeInTheDocument();
  });
});
