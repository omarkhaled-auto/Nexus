import { useEffect, type ReactElement } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useCheckpoint } from '@renderer/hooks/useCheckpoint';
import { Button } from '@renderer/components/ui/button';

interface CheckpointListProps {
  projectId: string;
}

/**
 * CheckpointList - Display list of checkpoints with restore/delete actions
 *
 * Features:
 * - Lists all checkpoints for a project
 * - Shows checkpoint name/reason and relative time
 * - Restore and delete actions for each checkpoint
 * - Create new checkpoint button
 */
export function CheckpointList({ projectId }: CheckpointListProps): ReactElement {
  const {
    checkpoints,
    isLoading,
    loadCheckpoints,
    restoreCheckpoint,
    deleteCheckpoint,
    createCheckpoint,
  } = useCheckpoint();

  useEffect(() => {
    void loadCheckpoints(projectId);
  }, [projectId, loadCheckpoints]);

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading checkpoints...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Checkpoints</h3>
        <Button
          size="sm"
          onClick={() => void createCheckpoint(projectId, 'Manual checkpoint')}
        >
          Create Checkpoint
        </Button>
      </div>

      {checkpoints.length === 0 ? (
        <p className="text-muted-foreground">No checkpoints yet</p>
      ) : (
        <ul className="space-y-2">
          {checkpoints.map((cp) => (
            <li
              key={cp.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <p className="font-medium">{cp.name || cp.reason || 'Unnamed checkpoint'}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(cp.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void restoreCheckpoint(cp.id, true)}
                >
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void deleteCheckpoint(cp.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
