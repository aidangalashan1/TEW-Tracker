import { useEffect, useState } from 'react'
import { useApp } from './context/AppContext'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { PopoutTitleBar } from './components/PopoutTitleBar'
import { PageRouter } from './PageRouter'
import { ErrorBoundary } from './components/ErrorBoundary'
import trackerLogo from './assets/TrackerLogo.png'
import moveDownIcon from './assets/UI icons/movedown.png'
import { WORKER_LIST_PAGE_ID } from './pages/pageStorage'
import type { StorylinesSubTab, RosterTab } from './context/UIContext'

const STORYLINES_SUB_TABS: { id: StorylinesSubTab; label: string }[] = [
  { id: 'list', label: 'Storylines' },
  { id: 'beats', label: 'Beats Planner' },
]

const ROSTER_SUB_TABS: { id: RosterTab; label: string }[] = [
  { id: 'workers', label: 'Full Roster' },
  { id: 'developmental', label: 'Developmental' },
]

export function AppLayout({ popout = false }: { popout?: boolean } = {}) {
  const { currentPage, db, appReady, syncWorkspace, rosterTab, setRosterTab, creativeTab, setCreativeTab, storylinesSubTab, setStorylinesSubTab } = useApp()
  const [storylinesMenuOpen, setStorylinesMenuOpen] = useState(false)
  const [rosterMenuOpen, setRosterMenuOpen] = useState(false)
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {popout && <PopoutTitleBar />}
        <div className="welcome-page" style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, height: '100%' }}>
            <img src={trackerLogo} alt="TEW Tracker" style={{ width: 120, height: 120, objectFit: 'contain' }} />
            <div className="loading" style={{ padding: 0 }}>Loading</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout" style={popout ? { flexDirection: 'column' } : undefined}>
      {/* A popout window is a pinned view onto a single page, not a second
          full navigation shell — no Sidebar (its Quit button quits the
          whole app, which would be surprising from a secondary window) and
          no TopBar (fed switcher/breadcrumb/navigation belongs to the one
          main window; a popout is just a pinned page). Its own frameless
          titlebar replaces both — drag region + window controls + a plain
          label naming the pinned page. */}
      {popout && <PopoutTitleBar />}
      {!isWelcome && !popout && <ErrorBoundary label="Sidebar"><Sidebar /></ErrorBoundary>}
      <div className="main-area">
        {!isWelcome && !popout && <ErrorBoundary label="TopBar"><TopBar /></ErrorBoundary>}
        {isRosterPage && (
          <div className="page-tabs">
            <div
              className={`page-tab${rosterTab === 'workers' || rosterTab === 'developmental' ? ' active' : ''}`}
              style={{ position: 'relative', gap: 5 }}
              onMouseEnter={() => setRosterMenuOpen(true)} onMouseLeave={() => setRosterMenuOpen(false)}
            >
              <span onClick={() => setRosterTab('workers')}>{ROSTER_SUB_TABS.find(t => t.id === rosterTab)?.label || 'Full Roster'}</span>
              <img src={moveDownIcon} alt="" style={{ width: 10, height: 10, filter: 'brightness(0) invert(1)' }} />
              {rosterMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, zIndex: 1000, minWidth: 170,
                  background: 'var(--bg-card)', borderRadius: 6, padding: 4,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                }}>
                  {ROSTER_SUB_TABS.map(t => (
                    <div key={t.id}
                      onClick={() => setRosterTab(t.id)}
                      style={{
                        padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        color: t.id === rosterTab ? 'var(--accent)' : 'var(--text-primary)',
                        background: t.id === rosterTab ? 'var(--bg-tertiary)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (t.id !== rosterTab) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { if (t.id !== rosterTab) e.currentTarget.style.background = 'transparent' }}
                    >
                      {t.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className={`page-tab${rosterTab === 'teams' ? ' active' : ''}`} onClick={() => setRosterTab('teams')}>Teams &amp; Stables</span>
            <span className={`page-tab${rosterTab === 'champions' ? ' active' : ''}`} onClick={() => setRosterTab('champions')}>Champions</span>
          </div>
        )}
        {isCreativePage && (
          <div className="page-tabs">
            <span className={`page-tab${creativeTab === 'schedule' ? ' active' : ''}`} onClick={() => setCreativeTab('schedule')}>Schedule</span>
            <span className={`page-tab${creativeTab === 'history' ? ' active' : ''}`} onClick={() => setCreativeTab('history')}>Show History</span>
            <span className={`page-tab${creativeTab === 'segments' ? ' active' : ''}`} onClick={() => setCreativeTab('segments')}>Segments</span>
            {creativeTab === 'storylines' ? (
              <div
                className="page-tab active" style={{ position: 'relative', gap: 5 }}
                onMouseEnter={() => setStorylinesMenuOpen(true)} onMouseLeave={() => setStorylinesMenuOpen(false)}
              >
                <span>{STORYLINES_SUB_TABS.find(t => t.id === storylinesSubTab)?.label}</span>
                <img src={moveDownIcon} alt="" style={{ width: 10, height: 10, filter: 'brightness(0) invert(1)' }} />
                {storylinesMenuOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 1000, minWidth: 170,
                    background: 'var(--bg-card)', borderRadius: 6, padding: 4,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}>
                    {STORYLINES_SUB_TABS.map(t => (
                      <div key={t.id}
                        onClick={() => setStorylinesSubTab(t.id)}
                        style={{
                          padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          color: t.id === storylinesSubTab ? 'var(--accent)' : 'var(--text-primary)',
                          background: t.id === storylinesSubTab ? 'var(--bg-tertiary)' : 'transparent',
                        }}
                        onMouseEnter={e => { if (t.id !== storylinesSubTab) e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={e => { if (t.id !== storylinesSubTab) e.currentTarget.style.background = 'transparent' }}
                      >
                        {t.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className="page-tab" onClick={() => setCreativeTab('storylines')}>Storylines</span>
            )}
            <span className={`page-tab${creativeTab === 'arcs' ? ' active' : ''}`} onClick={() => setCreativeTab('arcs')}>Arcs</span>
            <span className={`page-tab${creativeTab === 'diary' ? ' active' : ''}`} onClick={() => setCreativeTab('diary')}>Diary</span>
          </div>
        )}
        <div className="content">
          <ErrorBoundary label="PageRouter" resetKey={currentPage}><PageRouter /></ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
