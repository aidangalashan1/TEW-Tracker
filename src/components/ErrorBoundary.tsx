import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportClientError } from '../lib/clientLog'

interface ErrorBoundaryProps {
  label: string
  /** Heading prefix shown before the label, e.g. "BLOCK" (default) or "ROUTE". */
  titlePrefix?: string
  /** When this value changes, a caught error is cleared — so a transient render
   *  failure recovers on navigation instead of leaving the pane blank until reload. */
  resetKey?: unknown
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError({
      source: `ErrorBoundary:${this.props.label}`,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    })
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    if (error) {
      return (
        <div style={{ padding: 20, margin: 8, border: '2px solid #e94560', borderRadius: 6, background: '#1a1a2e' }}>
          <h3 style={{ color: '#e94560', margin: '0 0 8px' }}>{this.props.titlePrefix ?? 'BLOCK'}: {this.props.label}</h3>
          <pre style={{ color: '#e0e0e0', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {error.message}
            {'\n'}{error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
