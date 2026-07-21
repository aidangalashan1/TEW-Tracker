import { useEffect } from 'react'
import { useApp } from './context/AppContext'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { PageRouter } from './PageRouter'
import { ErrorBoundary } from './components/ErrorBoundary'
import trackerLogo from './assets/TrackerLogo.png'
import { WORKER_LIST_PAGE_ID } from './pages/pageStorage'

export function AppLayout() {
  const { currentPage, db, syncWorkspace, rosterTab, setRosterTab } = useApp()
  const isWelcome = currentPage === 'welcome' || (!db.connected && !db.loading)
  const isRosterPage = currentPage === WORKER_LIST_PAGE_ID
  const isLoading = db.loading && !db.connected

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
        <div className="content">
          <ErrorBoundary label="PageRouter" resetKey={currentPage}><PageRouter /></ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
