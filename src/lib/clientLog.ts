// Forwards renderer-side errors to the Electron main process, which persists
// them to a log file in userData. In a plain browser (no Electron) it's a no-op
// beyond console — logging must never itself throw.

export interface ClientErrorReport {
  source: string
  message: string
  stack?: string
  componentStack?: string
  url?: string
}

export function reportClientError(report: ClientErrorReport): void {
  try {
    const api = (window as any).electronAPI
    api?.logError?.({
      ...report,
      url: report.url ?? window.location?.href,
      time: new Date().toISOString(),
    })
  } catch {
    /* never let logging break the app */
  }
}

/** Capture errors and promise rejections that escape React's error boundaries. */
export function installGlobalErrorLogging(): void {
  window.addEventListener('error', (e) => {
    reportClientError({ source: 'window.onerror', message: e.message, stack: e.error?.stack })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const reason: any = e.reason
    reportClientError({
      source: 'unhandledrejection',
      message: String(reason?.message ?? reason),
      stack: reason?.stack,
    })
  })
}
