import { cn } from '@renderer/lib/utils'
import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      className={cn(
        'animate-spin text-muted-foreground',
        sizeClasses[size],
        className
      )}
    />
  )
}

export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
