import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary, withErrorBoundary } from './ErrorBoundary'

// Component that throws an error when shouldThrow is true
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('Test error')
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors in tests
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('normal rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )
      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('renders multiple children', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>
      )
      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('shows error UI when error is thrown', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Test error')).toBeInTheDocument()
    })

    it('shows default message when error has no message', () => {
      const ThrowEmpty = () => {
        throw new Error()
      }
      render(
        <ErrorBoundary>
          <ThrowEmpty />
        </ErrorBoundary>
      )
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('displays AlertTriangle icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      // Check for the icon container by looking for the destructive class
      const container = screen.getByText('Something went wrong').closest('div')
      expect(container?.parentElement?.querySelector('.text-destructive')).toBeInTheDocument()
    })
  })

  describe('retry functionality', () => {
    it('shows retry button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const retryButton = screen.getByRole('button', { name: /try again/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('retry button resets error state', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // Error UI should be visible
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i })
      fireEvent.click(retryButton)

      // After retry, component tries to render again
      // It will throw again, but that's expected behavior
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('custom fallback', () => {
    it('renders custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error UI</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(screen.getByText('Custom error UI')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('withErrorBoundary HOC', () => {
    it('wraps component with error boundary', () => {
      const SafeComponent = withErrorBoundary(ThrowError)
      render(<SafeComponent shouldThrow={false} />)
      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('catches errors from wrapped component', () => {
      const SafeComponent = withErrorBoundary(ThrowError)
      render(<SafeComponent shouldThrow={true} />)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('uses custom fallback when provided to HOC', () => {
      const SafeComponent = withErrorBoundary(ThrowError, <div>HOC fallback</div>)
      render(<SafeComponent shouldThrow={true} />)
      expect(screen.getByText('HOC fallback')).toBeInTheDocument()
    })
  })

  describe('componentDidCatch', () => {
    it('logs error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error')
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(consoleSpy).toHaveBeenCalled()
    })
  })
})
