import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../context/AppContext'
import { api } from '../api'
import trackerLogo from '../assets/TrackerLogo.png'
import homeBg from '../assets/HomeScreenBG.png'
import loadLastIcon from '../assets/UI icons/loadlast.png'
import loadIcon from '../assets/UI icons/load.png'
import plusIcon from '../assets/UI icons/plus.png'
import settingsIcon from '../assets/UI icons/settings.png'
import starIcon from '../assets/UI icons/credits.png'
import confirmIcon from '../assets/UI icons/tutorial.png'
import closeIcon from '../assets/UI icons/close.png'
import { fmtDateOrdinal } from '../lib/dates'

const iconStyle = { width: 16, height: 16, filter: 'brightness(0) invert(1)' }
const btnStyle: React.CSSProperties = { width: '100%', justifyContent: 'flex-start', color: '#fff', padding: '8px 16px', fontSize: 13 }
const bigBtnStyle: React.CSSProperties = { ...btnStyle, padding: '16px 16px', fontSize: 14 }

export function WelcomePage() {
  const { connectToDb, recentDbs, images, setImagePath, setCurrentPage } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [showLoad, setShowLoad] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [exitHover, setExitHover] = useState(false)
  const [dbPath, setDbPath] = useState('')
  const [imgPath, setImgPath] = useState(images.path)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState('')

  const handleBrowseDb = async () => {
    setBusy('browse-db')
    setStatus('')
    try {
      const res = await api.db.browse()
      if (!res.cancelled && res.path) {
        setDbPath(res.path)
      }
    } catch {
      setStatus('Browse failed')
    }
    setBusy('')
  }

  const handleBrowseImg = async () => {
    setBusy('browse-img')
    setStatus('')
    try {
      const res = await api.images.browse()
      if (!res.cancelled && res.path) {
        setImgPath(res.path)
      }
    } catch {
      setStatus('Browse failed')
    }
    setBusy('')
  }

  const handleStart = async () => {
    setBusy('start')
    setStatus('Loading...')
    try {
      if (dbPath) {
        await connectToDb(dbPath)
      }
      if (imgPath) {
        await setImagePath(imgPath)
      }
    } catch (e: any) {
      setStatus(e.message || 'Failed to start')
      setBusy('')
    }
  }

  return (
    <div className="welcome-page" style={{
      display: 'flex', flexDirection: 'column', gap: 20,
      alignItems: 'center', justifyContent: 'center',
      position: 'fixed', inset: 0,
      backgroundImage: `url(${homeBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)', padding: '24px 30px', borderRadius: 12,
        width: 'fit-content', marginTop: -30,
      }}>
        <img src={trackerLogo} alt="TEW Tracker" style={{ width: 656, height: 621, objectFit: 'contain' }} />
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '20px 30px', width: 'fit-content',
        alignItems: 'stretch', minWidth: 716,
      }}>
        {!showNew ? (
          <>
            <button className="btn primary" onClick={() => setShowNew(true)} style={bigBtnStyle}>
              <img src={plusIcon} alt="" style={iconStyle} />
              New Booking Tracker
            </button>
            {recentDbs.length > 0 && (
              <>
                <button className="btn" onClick={async () => {
                  setBusy('start')
                  setStatus('Loading...')
                  try {
                    await connectToDb(recentDbs[0].path)
                  } catch (e: any) {
                    setStatus(e.message || 'Failed to start')
                  }
                  setBusy('')
                }} style={bigBtnStyle}>
                  <img src={loadLastIcon} alt="" style={iconStyle} />
                  Load Last{recentDbs[0].company ? ` — ${recentDbs[0].company}` : ''}{fmtDateOrdinal(recentDbs[0].gameDate) ? `, ${fmtDateOrdinal(recentDbs[0].gameDate)}` : ''}
                </button>
                <button className="btn" onClick={() => setShowLoad(true)} style={bigBtnStyle}>
                  <img src={loadIcon} alt="" style={iconStyle} />
                  Load Existing Booking Tracker
                </button>
                <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                  <button className="btn" onClick={() => setCurrentPage('settings')}
                    style={{ ...btnStyle, flex: 2 }}>
                    <img src={settingsIcon} alt="" style={iconStyle} />
                    Settings
                  </button>
                  <button className="btn" style={{ ...btnStyle, flex: 1 }}>
                    <img src={starIcon} alt="" style={iconStyle} />
                    Credits
                  </button>
                  <button className="btn" style={{ ...btnStyle, flex: 1 }}>
                    <img src={confirmIcon} alt="" style={iconStyle} />
                    Tutorial
                  </button>
                </div>
              </>
            )}
            {status && <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>{status}</div>}
          </>
        ) : (
          <>
            <div className="welcome-section-title" style={{ textAlign: 'center', color: '#fff' }}>New Booking Tracker</div>
            <div className="welcome-path-row" style={{ width: '100%' }}>
              <input type="text" className="search-input" style={{ flex: 1 }} value={dbPath}
                onChange={e => setDbPath(e.target.value)} placeholder="C:\Path\To\TEW9Save.mdb" />
              <button className="btn" onClick={handleBrowseDb} disabled={busy === 'browse-db'} style={{ color: '#fff' }}>
                {busy === 'browse-db' ? '...' : 'Browse'}
              </button>
            </div>
            <div className="welcome-path-row" style={{ width: '100%' }}>
              <input type="text" className="search-input" style={{ flex: 1 }} value={imgPath}
                onChange={e => setImgPath(e.target.value)} placeholder="C:\Path\To\TEW9\Pictures\Default" />
              <button className="btn" onClick={handleBrowseImg} disabled={busy === 'browse-img'} style={{ color: '#fff' }}>
                {busy === 'browse-img' ? '...' : 'Browse'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn" onClick={() => setShowNew(false)} style={{ color: '#fff' }}>Back</button>
              <button className="btn primary" onClick={handleStart}
                disabled={busy === 'start' || !dbPath} style={{ ...btnStyle, width: 'auto' }}>
                {busy === 'start' ? 'Creating...' : 'Create'}
              </button>
            </div>
            {status && <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>{status}</div>}
          </>
        )}
      </div>

      {showLoad && createPortal(
        <div className="modal-overlay" onClick={() => setShowLoad(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ background: 'var(--bg-secondary)' }}>
              <span className="modal-title">Load Existing Booking Tracker</span>
              <button className="modal-close" onClick={() => setShowLoad(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 8 }}>
              {recentDbs.map(entry => (
                <div key={entry.path}
                  onClick={async () => {
                    setShowLoad(false)
                    setBusy('start')
                    setStatus('Loading...')
                    try {
                      await connectToDb(entry.path)
                    } catch (e: any) {
                      setStatus(e.message || 'Failed to start')
                    }
                    setBusy('')
                  }}
                  style={{
                    padding: '12px 12px', cursor: 'pointer', borderRadius: 4,
                    borderBottom: '1px solid var(--border-color)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {entry.company ? `${entry.company}` : entry.filename}
                    {entry.gameDate ? <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>, {fmtDateOrdinal(entry.gameDate)}</span> : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginTop: 3 }}>
                    Last accessed {fmtDateOrdinal(entry.last_accessed)}
                  </div>
                </div>
              ))}
              {recentDbs.length === 0 && <div className="text-muted" style={{ padding: 20, textAlign: 'center' }}>No saved trackers</div>}
            </div>
          </div>
        </div>,
        document.body
      )}

      <button className="btn" onClick={() => setShowExitConfirm(true)}
        onMouseEnter={() => setExitHover(true)} onMouseLeave={() => setExitHover(false)}
        style={{ position: 'fixed', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6,
          background: exitHover ? '#c62828' : undefined, borderColor: exitHover ? '#c62828' : undefined }}>
        <img src={closeIcon} alt="" style={{ width: 16, height: 16,
          filter: exitHover ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.5) sepia(1) saturate(10) hue-rotate(-30deg)' }} />
        <span style={{ color: exitHover ? '#fff' : '#fff', fontSize: 13 }}>Close</span>
      </button>

      {showExitConfirm && createPortal(
        <div className="modal-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 320, textAlign: 'center' }}>
            <div className="modal-header">
              <span className="modal-title">Quit TEW Tracker?</span>
            </div>
            <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button className="btn primary" onClick={() => {
                const ea = (window as any).electronAPI
                if (ea?.quitApp) ea.quitApp()
                else window.close()
              }}>Yes</button>
              <button className="btn" onClick={() => setShowExitConfirm(false)}>No</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
