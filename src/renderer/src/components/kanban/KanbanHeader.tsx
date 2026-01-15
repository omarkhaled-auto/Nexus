import { Plus, Search, Layers } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { useFeatureCount } from '@renderer/stores/featureStore'

interface KanbanHeaderProps {
  /** Project or board name */
  projectName?: string
  /** Callback when Add Feature button is clicked */
  onNewFeature?: () => void
}

/**
 * KanbanHeader - Header component for the Kanban board.
 * Displays project name, feature count, and action buttons.
 */
export function KanbanHeader({ projectName, onNewFeature }: KanbanHeaderProps) {
  const featureCount = useFeatureCount()

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
      {/* Left side: Title and feature count */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">
            {projectName || 'Evolution Mode'}
          </h1>
        </div>

        {/* Feature count badge */}
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
          {featureCount} {featureCount === 1 ? 'feature' : 'features'}
        </span>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-3">
        {/* Search placeholder - disabled for now */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search features..."
            className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled
          />
        </div>

        {/* Add Feature button - placeholder for future implementation */}
        <Button
          size="sm"
          onClick={onNewFeature}
          disabled={!onNewFeature}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Feature
        </Button>
      </div>
    </header>
  )
}
