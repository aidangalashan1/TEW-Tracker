import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import homeIcon from '../assets/UI icons/home.png'
import settingsIcon from '../assets/UI icons/settings.png'
import closeIcon from '../assets/UI icons/close.png'
import calendarIcon from '../assets/UI icons/calendar.png'
import { fmtDateOrdinal } from '../lib/dates'

export function Sidebar() {
  const { currentPage, setCurrentPage, pages, addPage, removePage, reorderPages, gameInfo, db, disconnectFromDb } = useApp()
  const [showAddPage, setShowAddPage] = useState(false)
  const [pageName, setPageName] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showHomeConfirm, setShowHomeConfirm] = useState(false)

  const handleAddPage = () => {
    const name = pageName.trim()
    if (!name) return
    addPage(name)
    setPageName('')
    setShowAddPage(false)
  }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img src={calendarIcon} alt="" style={{ width: 24, height: 24, filter: 'brightness(0) invert(0.6)' }} />
        <div>
          <div className="sidebar-logo-text">{gameInfo?.current_date ? fmtDateOrdinal(gameInfo.current_date) : '—'}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Pages</div>
        {pages.map((page, idx) => (
          <div
            key={page.id}
            className={`nav-item ${currentPage === page.id ? 'active' : ''} ${dragIndex === idx ? 'dragging' : ''} ${dropIndex === idx ? 'drop-target' : ''}`}
            onClick={() => setCurrentPage(page.id)}
            draggable
            onDragStart={e => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', page.id)
              setDragIndex(idx)
            }}
            onDragOver={e => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDropIndex(idx)
            }}
            onDragLeave={() => setDropIndex(null)}
            onDrop={e => {
              e.preventDefault()
              if (dragIndex !== null && dragIndex !== idx) {
                reorderPages(dragIndex, idx)
              }
              setDragIndex(null)
              setDropIndex(null)
            }}
            onDragEnd={() => {
              setDragIndex(null)
              setDropIndex(null)
            }}
          >
            <span className="nav-item-icon">📄</span>
            <span style={{ flex: 1 }}>{page.label}</span>
            <button
              className="nav-item-remove"
              title="Remove page"
              onClick={e => {
                e.stopPropagation()
                removePage(page.id)
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <div className="nav-item nav-item-add" onClick={() => setShowAddPage(true)}>
          <span className="nav-item-icon">+</span>
          Add Page
        </div>
      </nav>

      {showAddPage && (
        <div className="modal-overlay" onClick={() => setShowAddPage(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <span className="modal-title">Add Page</span>
              <button className="modal-close" onClick={() => setShowAddPage(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="input"
                placeholder="Page name"
                value={pageName}
                onChange={e => setPageName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPage()}
                autoFocus
              />
              <button className="btn primary" onClick={handleAddPage}>Create Page</button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirm && (
        <div className="modal-overlay" onClick={() => setShowCloseConfirm(false)}>
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
              <button className="btn" onClick={() => setShowCloseConfirm(false)}>No</button>
            </div>
          </div>
        </div>
      )}

      {showHomeConfirm && (
        <div className="modal-overlay" onClick={() => setShowHomeConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 320, textAlign: 'center' }}>
            <div className="modal-header">
              <span className="modal-title">Return to Home?</span>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <p style={{ margin: 0 }}>This will disconnect the current save. You can load it again from Home.</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn primary" onClick={() => { setShowHomeConfirm(false); disconnectFromDb() }}>Yes</button>
                <button className="btn" onClick={() => setShowHomeConfirm(false)}>No</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-actions">
        <button className="sidebar-action-btn" onClick={() => { if (db.connected) setShowHomeConfirm(true); else setCurrentPage('welcome') }}>
          <img src={homeIcon} alt="Home" style={{ width: 18, height: 18 }} />
          <span>Home</span>
        </button>
        <button className="sidebar-action-btn" onClick={() => setCurrentPage('settings')}>
          <img src={settingsIcon} alt="Settings" style={{ width: 18, height: 18 }} />
          <span>Settings</span>
        </button>
        <button className="sidebar-action-btn sidebar-action-close" onClick={() => setShowCloseConfirm(true)}>
          <img src={closeIcon} alt="Close" style={{ width: 18, height: 18 }} />
          <span>Close</span>
        </button>
      </div>

    </div>
  )
}
