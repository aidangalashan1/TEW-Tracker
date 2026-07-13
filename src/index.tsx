import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { reportClientError, installGlobalErrorLogging } from './lib/clientLog'

installGlobalErrorLogging()

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  constructor(props: {children: React.ReactNode}) { super(props); this.state = {error: null} }
  static getDerivedStateFromError(error: Error) { return {error} }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportClientError({ source: 'root', message: error.message, stack: error.stack, componentStack: info.componentStack ?? undefined })
  }
  render() {
    if (this.state.error) {
      const e = this.state.error
      return <div style={{padding: 40, color: '#e0e0e0', background: '#1a1a2e', minHeight: '100vh', fontFamily: 'monospace', whiteSpace: 'pre-wrap'}}>
        <h2 style={{color: '#e94560'}}>Render Error</h2>
        <p>{e.message}</p>
        <p style={{color: '#88929e', fontSize: 12}}>{e.stack}</p>
      </div>
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
