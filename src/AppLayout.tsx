import { useEffect } from 'react'
import { useApp } from './context/AppContext'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { PageRouter } from './PageRouter'
import { ErrorBoundary } from './components/ErrorBoundary'
import trackerLogo from './assets/TrackerLogo.png'
import { WORKER_LIST_PAGE_ID } from './pages/pageStorage'

export function AppLayout() {
  const { currentPage, db, appReady, syncWorkspace, rosterTab, setRosterTab, creativeTab, setCreativeTab } = useApp()
  const isWelcome = currentPage === 'welcome' || (!db.connected && !db.loading)
  const isRosterPage = currentPage === WORKER_LIST_PAGE_ID
  const isCreativePage = currentPage === 'booking'
  // Stay on the loading screen through the connect round trip AND the
  // post-connect readiness window (game info + fixed-page prefetch — see
  // DataContext's finishConnect), so the shell only appears once the pages
  // a user lands on first are already warm, not with its own inline spinner.
  const isLoading = (db.loading && !db.connected) || (db.connected && !appReady)

  useEffect(() => {
    if (!db.connected) return
    syncWorkspace()
  }, [db.connected, syncWorkspace])

  if (isLoading) {
    return (
      <div className="welcome-page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, height: '100%' }}>
          <img src={trackerLogo} alt="TEW Tracker" style={{ width: 120, height: 120, objectFit: 'contain' }} />
          <div className="loading" style={{ padding: 0 }}>Loading</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout">
      {!isWelcome && <ErrorBoundary label="Sidebar"><Sidebar /></ErrorBoundary>}
      <div className="main-area">
        {!isWelcome && <ErrorBoundary label="TopBar"><TopBar /></ErrorBoundary>}
        {isRosterPage && (
          <div className="page-tabs">
            <span className={`page-tab${rosterTab === 'workers' ? ' active' : ''}`} onClick={() => setRosterTab('workers')}>Full Roster</span>
            <span className={`page-tab${rosterTab === 'teams' ? ' active' : ''}`} onClick={() => setRosterTab('teams')}>Teams &amp; Stables</span>
            <span className={`page-tab${rosterTab === 'champions' ? ' active' : ''}`} onClick={() => setRosterTab('champions')}>Champions</span>
          </div>
        )}
        {isCreativePage && (
          <div className="page-tabs">
            <span className={`page-tab${creativeTab === 'schedule' ? ' active' : ''}`} onClick={() => setCreativeTab('schedule')}>Schedule</span>
            <span className={`page-tab${creativeTab === 'history' ? ' active' : ''}`} onClick={() => setCreativeTab('history')}>Show History</span>
            <span className={`page-tab${creativeTab === 'storylines' ? ' active' : ''}`} onClick={() => setCreativeTab('storylines')}>Storylines</span>
          </div>
        )}
        <div className="content">
          <ErrorBoundary label="PageRouter" resetKey={currentPage}><PageRouter /></ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
