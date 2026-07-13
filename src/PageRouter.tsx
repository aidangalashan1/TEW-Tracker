import { useApp } from './context/AppContext'
import { DynamicPage } from './DynamicPage'
import { WorkerProfile } from './pages/entities/WorkerProfile'
import { ModulePage } from './pages/entities/ModulePage'
import { SettingsPage } from './pages/Settings'
import { WelcomePage } from './pages/Welcome'
import { parseEntityPage } from './pages/entityRoute'
import { ErrorBoundary } from './components/ErrorBoundary'

export function PageRouter() {
  const { currentPage, db, error, pages } = useApp()

  if (!db.connected && !db.loading) return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="Welcome"><WelcomePage /></ErrorBoundary>

  if (error) {
    return (
      <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>⚠</div>
        <div style={{ fontSize: 18, color: 'var(--accent)', fontWeight: 600 }}>Connection Error</div>
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400 }}>
          {error}.<br />
          Make sure the Python backend is running.
        </div>
      </div>
    )
  }

  const entity = parseEntityPage(currentPage)
  if (entity) {
    switch (entity.type) {
      case 'worker': return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="WorkerProfile"><WorkerProfile workerUid={entity.id as number} /></ErrorBoundary>
      case 'module': return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="ModulePage"><ModulePage moduleId={entity.id as string} /></ErrorBoundary>
      default: break
    }
  }

  if (currentPage === 'settings') return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="Settings"><SettingsPage /></ErrorBoundary>
  if (currentPage === 'welcome') return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="Welcome"><WelcomePage /></ErrorBoundary>

  const pageExists = pages.some(p => p.id === currentPage)
  if (pageExists) return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label={`Page:${currentPage}`}><DynamicPage pageId={currentPage} /></ErrorBoundary>
  if (pages.length > 0) return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label={`Page:${pages[0].id}`}><DynamicPage pageId={pages[0].id} /></ErrorBoundary>
  return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="Page:roster"><DynamicPage pageId="roster" /></ErrorBoundary>
}
