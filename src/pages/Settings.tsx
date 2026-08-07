import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { api } from '../api'
import { ProfileManager } from '../components/ProfileManager'
import { getZoomOverride, setZoomOverride, getAutoScale, ZOOM_PRESETS } from '../lib/uiScale'

export function SettingsPage() {
  const { ratingFormat, setRatingFormat, refresh, gameInfo, db, connectToDb, images, setImagePath, resetDefaultView } = useApp()
  const [dbPath, setDbPath] = useState(db.path)
  const [imgPath, setImgPath] = useState(images.path)
  const [status, setStatus] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [zoomOverride, setZoomOverrideState] = useState(getZoomOverride)
  const autoScale = getAutoScale()
  const isElectron = !!(window as any).electronAPI?.isElectron

  const handleBrowse = async () => {
    setBrowsing(true)
    try {
      const res = await api.db.browse()
      if (!res.cancelled && res.path) {
        setDbPath(res.path)
      }
    } catch {
      setStatus('Browse failed')
    }
    setBrowsing(false)
  }

  const handleConnect = async () => {
    if (!dbPath) return
    setConnecting(true)
    setStatus('Connecting...')
    try {
      await connectToDb(dbPath)
      setStatus('Connected')
    } catch (e: any) {
      setStatus(e.message || 'Connection failed')
    }
    setConnecting(false)
  }

  const handleBrowseImg = async () => {
    try {
      const res = await api.images.browse()
      if (!res.cancelled && res.path) {
        setImgPath(res.path)
      }
    } catch {
      setStatus('Browse failed')
    }
  }

  const handleSetImgPath = async () => {
    try {
      await setImagePath(imgPath)
      setStatus('Image path saved')
    } catch (e: any) {
      setStatus(e.message || 'Failed')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-subtitle">Appearance and preferences</div>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div className="settings-group">
          <div className="settings-group-title">Display</div>

          <div className="settings-row">
            <div>
              <div className="settings-label">Rating Display Format</div>
              <div className="settings-description">How worker skills and ratings are shown throughout the app</div>
            </div>
            <div className="toolbar">
              <button
                className={`btn ${ratingFormat === 'pct' ? 'active' : ''}`}
                onClick={() => setRatingFormat('pct')}
              >
                0-100
              </button>
              <button
                className={`btn ${ratingFormat === 'grade' ? 'active' : ''}`}
                onClick={() => setRatingFormat('grade')}
              >
                A*-F
              </button>
            </div>
          </div>

          {isElectron && (
            <div className="settings-row">
              <div>
                <div className="settings-label">UI Scale</div>
                <div className="settings-description">
                  The app auto-fits itself to your monitor (currently {Math.round(autoScale * 100)}% of the design's 2560×1440 baseline).
                  Nudge it further here if that's still too small or too large.
                </div>
              </div>
              <div className="toolbar">
                {ZOOM_PRESETS.map(p => (
                  <button
                    key={p}
                    className={`btn ${zoomOverride === p ? 'active' : ''}`}
                    onClick={() => { setZoomOverride(p); setZoomOverrideState(p) }}
                  >
                    {Math.round(p * 100)}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="settings-group">
          <div className="settings-group-title">Database</div>

          <div className="settings-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div style={{ flex: '1 1 100%', marginBottom: 4 }}>
              <div className="settings-label">Save File Path</div>
              <div className="settings-description">Path to your TEW9Save.mdb file</div>
            </div>
            <input
              type="text"
              className="search-input"
              style={{ flex: 1, minWidth: 200 }}
              value={dbPath}
              onChange={e => setDbPath(e.target.value)}
              placeholder="C:\Path\To\TEW9Save.mdb"
            />
            <button className="btn" onClick={handleBrowse} disabled={browsing}>
              {browsing ? '...' : 'Browse'}
            </button>
            <button className="btn" onClick={handleConnect} disabled={connecting || !dbPath}>
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-label">Status</div>
            </div>
            <span style={{
              color: db.connected ? 'var(--accent-green)' : 'var(--accent)',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {db.connected ? `Connected to ${db.path}` : status || 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-title">Images</div>

          <div className="settings-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div style={{ flex: '1 1 100%', marginBottom: 4 }}>
              <div className="settings-label">Image Folder</div>
              <div className="settings-description">
                Path to your TEW9\Pictures\Default folder (auto-detected from save path if available)
              </div>
            </div>
            <input
              type="text"
              className="search-input"
              style={{ flex: 1, minWidth: 200 }}
              value={imgPath}
              onChange={e => setImgPath(e.target.value)}
              placeholder="C:\Path\To\TEW9\Pictures\Default"
            />
            <button className="btn" onClick={handleBrowseImg}>
              Browse
            </button>
            <button className="btn" onClick={handleSetImgPath} disabled={!imgPath}>
              Connect
            </button>
            <span style={{
              color: images.configured ? 'var(--accent-green)' : 'var(--accent)',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {images.configured ? `Connected to ${images.path}` : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-title">Data</div>

          <div className="settings-row">
            <div>
              <div className="settings-label">Refresh Database Cache</div>
              <div className="settings-description">Force reload data from the save file</div>
            </div>
            <button className="btn" onClick={refresh}>
              ⟳ Refresh
            </button>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-label">Reset Default View</div>
              <div className="settings-description">Restore default page layout and remove all custom pages</div>
            </div>
            <button className="btn" onClick={resetDefaultView}>
              ↺ Reset
            </button>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-label">Last Loaded</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {gameInfo?.current_date ?? 'Unknown'}
            </span>
          </div>
        </div>

        {isElectron && (
          <div className="settings-group">
            <div className="settings-group-title">Updates</div>
            <div className="settings-row">
              <div>
                <div className="settings-label">Check for Updates</div>
                <div className="settings-description">A banner appears at the top if a newer version is available</div>
              </div>
              <button className="btn" onClick={() => (window as any).electronAPI?.updates?.check()}>
                Check Now
              </button>
            </div>
          </div>
        )}

        <div className="settings-section">
          <div className="settings-section-title">Save Profiles</div>
          <ProfileManager onSwitch={() => window.location.reload()} />
        </div>
      </div>
    </div>
  )
}