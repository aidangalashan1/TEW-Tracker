import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../context/AppContext'
import type { Federation } from '../api'
import { imageUrl } from '../api'
import { getAllModules } from '../modules/registry'
import { useBeltBreadcrumb } from '../pages/entities/belt/useBeltBreadcrumb'
import { usePastShowBreadcrumb } from '../pages/entities/show/usePastShowBreadcrumb'
import { useTvEpisodeBreadcrumb } from '../pages/entities/show/useTvEpisodeBreadcrumb'
import { useWorkerBreadcrumb } from '../pages/entities/worker-profile/useWorkerBreadcrumb'
import { usePlannedStorylineBreadcrumb } from '../pages/entities/storyline/usePlannedStorylineBreadcrumb'
import { useWorkerRosterNav } from '../pages/entities/worker-profile/useWorkerRosterNav'
import moveDownIcon from '../assets/UI icons/movedown.png'
import moveUpIcon from '../assets/UI icons/moveup.png'
import leftIcon from '../assets/UI icons/left.png'
import rightIcon from '../assets/UI icons/right.png'
import popoutIcon from '../assets/UI icons/popout.png'
import { isPopoutWindow, openPopout } from '../lib/popout'
import { WORKER_LIST_PAGE_ID } from '../pages/pageStorage'

const pageNames: Record<string, string> = {
  roster: 'Roster',
  settings: 'Settings',
  welcome: 'Home',
}

const entityLabels: Record<string, string> = {
  worker: 'Worker Profile',
  belt: 'Belt Profile',
  fed: 'Company Profile',
  tagteam: 'Tag Team Profile',
  tvshow: 'TV Show',
  tvepisode: 'TV Episode',
  pastshow: 'Past Show',
  storyline: 'Storyline',
  event: 'Event',
  module: 'Module',
}

const AREA_ORDER = ['USA', 'Canada', 'Mexico', 'Japan', 'British Isles', 'Europe', 'Oceania', 'India']

// Popout window titles for the WORKER_LIST_PAGE_ID / 'booking' sub-tabs —
// those pages show several distinct views (Full Roster vs. Champions,
// Schedule vs. Storylines, ...) under one currentPage, so the plain page
// name alone wouldn't tell the popout windows apart.
const ROSTER_TAB_LABELS: Record<string, string> = {
  workers: 'Full Roster', developmental: 'Developmental', teams: 'Teams & Stables', champions: 'Champions',
}
const CREATIVE_TAB_LABELS: Record<string, string> = {
  schedule: 'Schedule', history: 'Show History', segments: 'Segments', storylines: 'Storylines', arcs: 'Arcs',
  rankings: 'Power Rankings',
}

function groupFeds(feds: Federation[], playerFed: Federation | null): [string, Federation[]][] {
  const groups = new Map<string, Federation[]>()
  // Separate player's fed
  const playerFedEntry: Federation[] = []
  for (const fed of feds) {
    if ((fed as any).Trading === false || (fed as any).Trading === 0) continue
    if (playerFed && fed.uid === playerFed.uid) {
      playerFedEntry.push(fed)
      continue
    }
    const area = fed.home_area || 'Unknown'
    const arr = groups.get(area) || []
    arr.push(fed)
    groups.set(area, arr)
  }
  // Sort each group by size descending
  for (const [, arr] of groups) arr.sort((a, b) => b.size - a.size)
  // Sort groups by custom area order, then alphabetically
  const sorted = [...groups.entries()].sort(([a], [b]) => {
    const ai = AREA_ORDER.indexOf(a)
    const bi = AREA_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })
  // Prepend player's fed at the very top
  if (playerFedEntry.length > 0) {
    sorted.unshift(['Your Company', playerFedEntry])
  }
  return sorted
}

export function TopBar() {
  const { currentPage, pages, playerFed, focusedFed, allFeds, setFocusedFed, navigateToEntity, img, goBack, goForward, canGoBack, canGoForward, rosterTab, creativeTab, storylinesSubTab } = useApp()
  const [logoErr, setLogoErr] = useState(false)
  const [fedOpen, setFedOpen] = useState(false)
  const [fedPos, setFedPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const fedRef = useRef<HTMLDivElement>(null)
  const entityMatch = currentPage.match(/^entity-(\w+)-(.+)$/)
  const entityType = entityMatch?.[1]
  const entityId = entityMatch?.[2]

  // Entity breadcrumb names — each fetched by a small hook living in that
  // entity's own domain folder, so TopBar composes rather than knows how to
  // fetch every entity type itself.
  const isBeltEntity = entityType === 'belt'
  const beltUid = isBeltEntity ? Number(entityId) : null
  const beltName = useBeltBreadcrumb(isBeltEntity, beltUid)

  const isPastShowEntity = entityType === 'pastshow'
  const pastShowUid = isPastShowEntity ? Number(entityId) : null
  const pastShowName = usePastShowBreadcrumb(isPastShowEntity, pastShowUid)

  // TV episode entity id encodes "tvUid@date"; the breadcrumb only needs tvUid.
  const isTvEpisodeEntity = entityType === 'tvepisode'
  const tvEpisodeTvUid = isTvEpisodeEntity ? parseInt((entityId || '').split('@')[0], 10) : null
  const tvEpisodeName = useTvEpisodeBreadcrumb(isTvEpisodeEntity, tvEpisodeTvUid)

  const isPlannedStorylineEntity = entityType === 'plannedstoryline'
  const plannedStorylineId = isPlannedStorylineEntity ? entityId ?? null : null
  const plannedStorylineName = usePlannedStorylineBreadcrumb(isPlannedStorylineEntity, plannedStorylineId)

  let pageName = pageNames[currentPage] || pages.find(p => p.id === currentPage)?.label || currentPage
  if (entityType === 'module') {
    const mod = getAllModules().find(m => m.id === entityId)
    if (mod) pageName = mod.name
  } else if (entityType === 'belt') {
    pageName = beltName || 'Belt Profile'
  } else if (entityType === 'tvepisode') {
    pageName = 'TV Episode'
  } else if (isPlannedStorylineEntity) {
    pageName = plannedStorylineName || 'Planned Storyline'
  } else if (entityType && entityLabels[entityType]) {
    pageName = entityLabels[entityType]
  }
  const displayFed = focusedFed || playerFed
  const logoUrl = displayFed?.logo ? img('Logos/' + displayFed.logo) : ''

  // Worker entity: fetch name and provide roster nav
  const isWorkerEntity = entityType === 'worker'
  const workerUid = isWorkerEntity ? Number(entityId) : null
  const workerName = useWorkerBreadcrumb(isWorkerEntity, workerUid)
  const { rosterList, perceptionOrder } = useWorkerRosterNav()
  const currentPerceptionIdx = isWorkerEntity && workerUid ? perceptionOrder.indexOf(workerUid) : -1
  const [rosterOpen, setRosterOpen] = useState(false)
  const rosterRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!rosterOpen) return
    const handler = (e: MouseEvent) => {
      if (rosterRef.current && !rosterRef.current.contains(e.target as Node)) {
        setRosterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [rosterOpen])

  // Close fed dropdown on outside click
  useEffect(() => {
    if (!fedOpen) return
    const handler = (e: MouseEvent) => {
      if (fedRef.current && !fedRef.current.contains(e.target as Node)) {
        setFedOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [fedOpen])

  const orderedFeds = useMemo(() => {
    const result: Federation[] = []
    for (const [, feds] of groupFeds(allFeds, playerFed)) {
      for (const fed of feds) result.push(fed)
    }
    return result
  }, [allFeds, playerFed])

  const currentIdx = orderedFeds.findIndex(f => f.uid === (focusedFed || playerFed)?.uid)

  const cycleFed = (dir: -1 | 1) => {
    if (orderedFeds.length === 0) return
    const newIdx = (currentIdx + dir + orderedFeds.length) % orderedFeds.length
    setFocusedFed(orderedFeds[newIdx])
  }

  return (
    <div className="topbar" style={{ paddingLeft: 10 }}>
      {isWorkerEntity ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="btn" onClick={goBack} disabled={!canGoBack} style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} title="Back">
            <img src={leftIcon} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(0.6)' }} />
          </button>
          <button className="btn" onClick={goForward} disabled={!canGoForward} style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} title="Forward">
            <img src={rightIcon} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(0.6)' }} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginLeft: 4 }}>
            <button className="btn" onClick={() => { const id = perceptionOrder[currentPerceptionIdx - 1]; if (id) navigateToEntity('worker', id) }} disabled={currentPerceptionIdx <= 0} style={{ padding: 0, lineHeight: 0 }} title="Previous worker">
              <img src={moveUpIcon} alt="" style={{ width: 10, height: 10, filter: 'brightness(0) invert(0.6)', display: 'block' }} />
            </button>
            <button className="btn" onClick={() => { const id = perceptionOrder[currentPerceptionIdx + 1]; if (id) navigateToEntity('worker', id) }} disabled={currentPerceptionIdx >= perceptionOrder.length - 1} style={{ padding: 0, lineHeight: 0 }} title="Next worker">
              <img src={moveDownIcon} alt="" style={{ width: 10, height: 10, filter: 'brightness(0) invert(0.6)', display: 'block' }} />
            </button>
          </div>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginLeft: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none' }} onClick={() => setRosterOpen(p => !p)}>
              {workerName || 'Worker'}
              <img src={moveDownIcon} alt="" style={{ width: 12, height: 12, filter: 'brightness(0) invert(0.6)' }} />
            </div>
            {rosterOpen && (
            <div ref={rosterRef} style={{ position: 'absolute', top: '100%', left: 8, zIndex: 1000, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 6, maxHeight: 400, overflow: 'auto', minWidth: 250 }}>
              {rosterList.map(w => (
                <div key={w.uid} onClick={() => { navigateToEntity('worker', w.uid); setRosterOpen(false) }}
                  style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: w.uid === workerUid ? 'var(--accent)' : 'transparent', color: w.uid === workerUid ? '#fff' : 'var(--text-primary)' }}
                  onMouseEnter={e => { if (w.uid !== workerUid) (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)' }}
                  onMouseLeave={e => { if (w.uid !== workerUid) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  {(() => {
                    const pic = w.contractPicture || w.picture
                    if (!pic) return <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--bg-tertiary)', flexShrink: 0 }} />
                    return <img src={imageUrl('People/' + pic)} alt=""
                      style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none' }} />
                  })()}
                  <span>{w.name}</span>
                </div>
              ))}
              {rosterList.length === 0 && <div style={{ padding: '6px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>}
            </div>
          )}
        </div>
        </div>
      ) : isBeltEntity ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn" onClick={goBack} disabled={!canGoBack} style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} title="Back">
            <img src={leftIcon} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(0.6)' }} />
          </button>
          <button className="btn" onClick={goForward} disabled={!canGoForward} style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} title="Forward">
            <img src={rightIcon} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(0.6)' }} />
          </button>
          <div style={{ fontSize: 43, fontWeight: 700, lineHeight: 1.1, color: '#fff' }}>{beltName || 'Belt'}</div>
        </div>
      ) : isPastShowEntity ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn" onClick={goBack} disabled={!canGoBack} style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} title="Back">
            <img src={leftIcon} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(0.6)' }} />
          </button>
          <button className="btn" onClick={goForward} disabled={!canGoForward} style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} title="Forward">
            <img src={rightIcon} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(0.6)' }} />
          </button>
          <div style={{ fontSize: 43, fontWeight: 700, lineHeight: 1.1, color: '#fff' }}>{pastShowName || 'Past Show'}</div>
        </div>
      ) : isTvEpisodeEntity ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn" onClick={goBack} disabled={!canGoBack} style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} title="Back">
            <img src={leftIcon} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(0.6)' }} />
          </button>
          <button className="btn" onClick={goForward} disabled={!canGoForward} style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} title="Forward">
            <img src={rightIcon} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(0.6)' }} />
          </button>
          <div style={{ fontSize: 43, fontWeight: 700, lineHeight: 1.1, color: '#fff' }}>{tvEpisodeName || 'TV Episode'}</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} ref={fedRef}>
            <button className="btn" onClick={goBack} disabled={!canGoBack} style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} title="Back">
              <img src={leftIcon} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(0.6)' }} />
            </button>
            <button className="btn" onClick={goForward} disabled={!canGoForward} style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} title="Forward">
              <img src={rightIcon} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(0.6)' }} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button className="btn" onClick={() => cycleFed(-1)} style={{ padding: 0, lineHeight: 0 }} title="Previous company">
                <img src={moveUpIcon} alt="" style={{ width: 10, height: 10, filter: 'brightness(0) invert(0.6)', display: 'block' }} />
              </button>
              <button className="btn" onClick={() => cycleFed(1)} style={{ padding: 0, lineHeight: 0 }} title="Next company">
                <img src={moveDownIcon} alt="" style={{ width: 10, height: 10, filter: 'brightness(0) invert(0.6)', display: 'block' }} />
              </button>
            </div>
            {logoUrl && !logoErr && (
              <img src={logoUrl} alt="" style={{ width: 88, height: 88, objectFit: 'contain', borderRadius: 4, cursor: 'pointer' }}
                onClick={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setFedPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) }); setFedOpen(p => !p) }} onError={() => setLogoErr(true)} />
            )}
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setFedPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) }); setFedOpen(p => !p) }}>
              <div style={{ fontSize: 43, fontWeight: 700, lineHeight: 1.1 }}>{displayFed?.name || 'TEW Tracker'}</div>
              <img src={moveDownIcon} alt="" style={{ width: 12, height: 12, filter: 'brightness(0) invert(0.6)', marginTop: 8 }} />
            </div>
          </div>

          {fedOpen && fedPos && createPortal(
        <div style={{
          position: 'fixed', top: fedPos.top, left: fedPos.left, width: fedPos.width, zIndex: 1000,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 6, padding: 4, maxHeight: 300, overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          {allFeds.length === 0 && <div className="text-muted" style={{ padding: 8, fontSize: 12 }}>No feds loaded</div>}
          {groupFeds(allFeds, playerFed).map(([area, feds]) => (
            <div key={area}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', padding: '6px 10px 2px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {area}
              </div>
              {feds.map(fed => (
                <div key={fed.uid}
                  onClick={() => { setFocusedFed(fed); setFedOpen(false) }}
                  style={{
                    padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                    background: displayFed?.uid === fed.uid ? 'var(--bg-tertiary)' : 'transparent',
                    color: displayFed?.uid === fed.uid ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                  onMouseEnter={e => { if (displayFed?.uid !== fed.uid) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (displayFed?.uid !== fed.uid) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ fontWeight: 600 }}>{fed.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fed.size_label}{fed.user_controlled ? ' · Your Company' : ''}</div>
                </div>
              ))}
            </div>
            ))}
          </div>,
          document.body
        )}
        </>)}
      <div className="topbar-breadcrumb">
        {!isPopoutWindow && (window as any).electronAPI?.isElectron && (() => {
          // Roster and Booking are one currentPage each but several distinct
          // sub-tab views (see ROSTER_TAB_LABELS/CREATIVE_TAB_LABELS above) —
          // that tab state lives in UIContext, not currentPage, so it has to
          // be forwarded explicitly for the popout to land on the exact tab
          // the user had open (e.g. Champions) instead of that page's default.
          const isRoster = currentPage === WORKER_LIST_PAGE_ID
          const isBooking = currentPage === 'booking'
          const tabLabel = isRoster ? ROSTER_TAB_LABELS[rosterTab] : isBooking ? CREATIVE_TAB_LABELS[creativeTab] : null
          const popoutTitle = tabLabel ? `${pageName} — ${tabLabel}` : pageName
          return (
            <button
              className="btn" title="Open in a separate, resizable window"
              style={{ padding: '2px 4px', border: 'none', background: 'transparent' }}
              onClick={() => openPopout(currentPage, popoutTitle, {
                rosterTab: isRoster ? rosterTab : undefined,
                creativeTab: isBooking ? creativeTab : undefined,
                storylinesSubTab: isBooking && creativeTab === 'storylines' ? storylinesSubTab : undefined,
                // Most top-level pages (Roster, Champions, Teams & Stables,
                // Schedule, ...) scope themselves to whichever company is
                // currently focused in this switcher, not always the
                // player's own — without forwarding it, the popout's fresh
                // DataProvider would default back to the player's fed
                // regardless of what's actually showing here.
                focusedFedUid: displayFed?.uid,
              })}
            >
              <img src={popoutIcon} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(1)' }} />
            </button>
          )
        })()}
        <span className="topbar-breadcrumb-current">{pageName}</span>
      </div>
    </div>
  )
}
