import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

afterEach(cleanup)

function Boom({ crash }: { crash: boolean }) {
  if (crash) throw new Error('kaboom')
  return <div>all good</div>
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary label="X">
        <div>hello</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('catches a render error and shows the labelled box', () => {
    // React logs caught errors to console.error; silence it for a clean run.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary label="PageRouter" titlePrefix="ROUTE">
        <Boom crash />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/ROUTE: PageRouter/)).toBeInTheDocument()
    expect(screen.getByText(/kaboom/)).toBeInTheDocument()
    spy.mockRestore()
  })

  it('recovers when resetKey changes and the child stops throwing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <ErrorBoundary label="P" resetKey="a">
        <Boom crash />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/BLOCK: P/)).toBeInTheDocument()

    // Simulate navigation: resetKey changes and the child no longer throws.
    rerender(
      <ErrorBoundary label="P" resetKey="b">
        <Boom crash={false} />
      </ErrorBoundary>,
    )
    expect(screen.queryByText(/BLOCK: P/)).not.toBeInTheDocument()
    expect(screen.getByText('all good')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('stays in error state if resetKey is unchanged (sticky until navigation)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <ErrorBoundary label="P" resetKey="a">
        <Boom crash />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/BLOCK: P/)).toBeInTheDocument()

    rerender(
      <ErrorBoundary label="P" resetKey="a">
        <Boom crash={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/BLOCK: P/)).toBeInTheDocument()
    spy.mockRestore()
  })
})
