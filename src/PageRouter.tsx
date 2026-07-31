import { useApp } from './context/AppContext'
import { DynamicPage } from './DynamicPage'
import { WorkerProfile } from './pages/entities/WorkerProfile'
import { BeltProfile } from './pages/entities/BeltProfile'
import { WorkerListPage } from './pages/entities/WorkerListPage'
import { WorkerSearchPage } from './pages/entities/WorkerSearchPage'
import { ModulePage } from './pages/entities/ModulePage'
import { SettingsPage } from './pages/Settings'
import { WelcomePage } from './pages/Welcome'
import { parseEntityPage } from './pages/entityRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CreativePage } from './pages/entities/CreativePage'
import { ShowProfile } from './pages/entities/ShowProfile'
import { ShowEpisodeProfile } from './pages/entities/ShowEpisodeProfile'
import { PastShowProfile } from './pages/entities/PastShowProfile'
import { StorylineProfile } from './pages/entities/StorylineProfile'

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
      case 'belt': return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="BeltProfile"><BeltProfile beltUid={entity.id as number} /></ErrorBoundary>
      case 'tvshow': return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="ShowProfile"><ShowProfile showUid={entity.id as number} showType="tv" /></ErrorBoundary>
      case 'pastshow': return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="PastShowProfile"><PastShowProfile pastCardUid={entity.id as number} /></ErrorBoundary>
      case 'storyline': return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="StorylineProfile"><StorylineProfile storylineUid={entity.id as number} /></ErrorBoundary>
      case 'tvepisode': return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="ShowEpisodeProfile"><ShowEpisodeProfile entityId={entity.id as string} /></ErrorBoundary>
      case 'event': return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="ShowProfile"><ShowProfile showUid={entity.id as number} showType="event" /></ErrorBoundary>
      case 'module':
        if (entity.id === 'worker-list') return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="WorkerListPage"><WorkerListPage /></ErrorBoundary>
        return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="ModulePage"><ModulePage moduleId={entity.id as string} /></ErrorBoundary>
      default: break
    }
  }

  if (currentPage === 'worker-search') return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="WorkerSearchPage"><WorkerSearchPage /></ErrorBoundary>
  if (currentPage === 'booking') return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="CreativePage"><CreativePage /></ErrorBoundary>
  if (currentPage === 'settings') return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="Settings"><SettingsPage /></ErrorBoundary>
  if (currentPage === 'welcome') return <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="Welcome"><WelcomePage /></ErrorBoundary>

  const pageExists = pages.some(p => p.id === currentPage)
  const content = pageExists
    ? <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label={`Page:${currentPage}`}><DynamicPage pageId={currentPage} /></ErrorBoundary>
    : pages.length > 0
      ? <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label={`Page:${pages[0].id}`}><DynamicPage pageId={pages[0].id} /></ErrorBoundary>
      : <ErrorBoundary titlePrefix="ROUTE" resetKey={currentPage} label="Page:roster"><DynamicPage pageId="roster" /></ErrorBoundary>

  return content
}
