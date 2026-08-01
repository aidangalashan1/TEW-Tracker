import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import useSWR from '../../hooks/useApi'
import { api } from '../../api'
import { NATIONALITY_FLAGS, NATIONALITY_NAMES } from '../../modules/worker-list/nationality'
import { AREAS } from '../../modules/worker-list/regions'
import { GenderIcon, GENDER_LABELS } from '../../lib/genderIcon'
import rightIcon from '../../assets/UI icons/right.png'
import { ProfileTab } from './worker-profile/ProfileTab'
import { AgentReportTab } from './worker-profile/AgentReportTab'
import { FormTab } from './worker-profile/FormTab'
import { RadarChart } from './worker-profile/RadarChart'
import { fmtDate as libFmtDate } from '../../lib/dates'

function fmtDate(d: any): string {
  if (!d) return ''
  try { return libFmtDate(d) } catch { return String(d) }
}

export function WorkerProfile({ workerUid }: { workerUid: number }) {
  const { img, focusedFed, playerFed, gameInfo, allFeds, navigateToEntity } = useApp()
  const { data: w, error } = useSWR('worker-' + workerUid, () => api.roster.detail(workerUid))
  const [tab, setTab] = useState<'profile' | 'agent-report' | 'form'>('profile')

  const stars = useMemo(() => ({
    current: w?.current_stars || 0.5,
    potential: w?.potential_stars || 0.5,
    currentScore: w?.current_score || 0,
    potentialScore: w?.potential_score || 0,
  }), [w])

  const radarVals = useMemo(() => {
    const s = w?.skills
    if (!s || w?.non_wrestler) return null
    return [
      Math.max(Number(s.brawl?.pct ?? 0), Number(s.puroresu?.pct ?? 0), Number(s.hardcore?.pct ?? 0), Number(s.technical?.pct ?? 0), Number(s.air?.pct ?? 0)),
      [s.psych?.pct, s.experience?.pct, s.respect?.pct, s.reputation?.pct].reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / 4,
      [s.charisma?.pct, s.mic?.pct, s.acting?.pct, s.flash?.pct, s.star?.pct, s.looks?.pct, s.menace?.pct].reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / 7,
      [s.basics?.pct, s.selling?.pct, s.consistency?.pct, s.safety?.pct].reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / 4,
      [s.stamina?.pct, s.athletic?.pct, s.power?.pct, s.toughness?.pct, s.injury?.pct].reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / 5,
      w?.pop?.pct ?? 0,
    ].map(v => Math.round(v ?? 0))
  }, [w])

  if (error) return <div className="loading" style={{ color: 'var(--accent)' }}>Error loading worker</div>
  if (!w) return <div className="loading">Loading...</div>

  const picture = w.contract?.picture || w.picture
  const portraitUrl = picture ? img('People/' + picture) : ''
  const flagCode = NATIONALITY_FLAGS[w.nationality]
  const countryName = NATIONALITY_NAMES[w.nationality]
  const flagUrl = flagCode ? new URL(`../../assets/flag-icons-main/flags/4x3/${flagCode}.svg`, import.meta.url).href : ''
  const rawGender = (w as any).Gender ?? 1
  const birthday = (w as any).Birthday
  const c = w.contract

  const wageYearly = c ? c.amount * 12 : 0
  const expiryDate = c && gameInfo?.current_date ? (() => {
    const d = new Date(gameInfo.current_date)
    d.setDate(d.getDate() + c.days_left)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  })() : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div className="page-tabs">
        <span className={`page-tab${tab === 'profile' ? ' active' : ''}`} onClick={() => setTab('profile')}>Profile</span>
        <span className={`page-tab${tab === 'agent-report' ? ' active' : ''}`} onClick={() => setTab('agent-report')}>Agent Report</span>
        <span className={`page-tab${tab === 'form' ? ' active' : ''}`} onClick={() => setTab('form')}>Form</span>
      </div>

      {/* Info bar: portrait+info+logos | contract | agent's report */}
      <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '20px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
          {/* Portrait + info + logos */}
          <div style={{ flex: 1, display: 'flex', gap: 12, minWidth: 0 }}>
            {portraitUrl ? (
              <img src={portraitUrl} alt="" style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 150, height: 150, background: 'var(--bg-secondary)', borderRadius: 12, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', alignItems: 'flex-start', width: 170, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {flagUrl && <img src={flagUrl} alt="" style={{ width: 28, height: 21, objectFit: 'cover', borderRadius: 3 }} />}
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{countryName || 'Unknown'}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', minHeight: '1.5em' }}>
                  {w.age} years old{birthday ? ` (${fmtDate(birthday)})` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GenderIcon gender={rawGender} size={18} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{GENDER_LABELS[rawGender] || w.gender}</span>
                </div>
              </div>
              {radarVals && <RadarChart values={radarVals} labels={['Primary', 'Mental', 'Perf.', 'Fund.', 'Phys.', 'Pop']} tooltipLabels={['Primary', 'Mental', 'Performance', 'Fundamental', 'Physical', 'Popularity']} size={120} />}
              {(() => {
                const fedIds: number[] = (w as any).all_fed_ids || []
                if (c?.fed_uid && !fedIds.includes(c.fed_uid)) fedIds.push(c.fed_uid)
                if (fedIds.length === 0) return null
                const feds = fedIds.map(id => allFeds.find(f => f.uid === id)).filter(Boolean)
                if (feds.length === 0) return null
                const cols = Math.ceil(Math.sqrt(feds.length))
                const rows = Math.ceil(feds.length / cols)
                const logoSize = Math.floor(150 / Math.max(cols, rows))
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${logoSize}px)`, gap: 4, alignSelf: 'center' }}>
                    {feds.map(fed => {
                      const logo = fed!.logo ? img('Logos/' + fed!.logo) : ''
                      if (!logo) return null
                      return <img key={fed!.uid} src={logo} alt="" style={{ width: logoSize, height: logoSize, objectFit: 'contain', borderRadius: 4, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); navigateToEntity('fed', fed!.uid) }} />
                    })}
                  </div>
                )
              })()}
            </div>
          </div>

          <div style={{ width: 1, alignSelf: 'stretch', background: '#5a6470', margin: '0 20px', flexShrink: 0 }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>Contract</div>
            {c ? (
              <>
                <div style={{ fontSize: 13, color: '#fff' }}>
                  ${c.amount.toLocaleString()} p.m. <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(${wageYearly.toLocaleString()} p.a.)</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#fff' }}>{c.written ? 'Written' : 'Open'}{c.exclusive ? ', Exclusive' : ''} Contract</div>
                </div>
                <div style={{ fontSize: 13, color: '#fff' }}>
                  Expires {expiryDate || `${c.days_left}d`} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({c.days_left} days)</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No contract</div>
            )}
          </div>

      {tab === 'profile' && (
          <>
          <div style={{ width: 1, alignSelf: 'stretch', background: '#5a6470', margin: '0 20px', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>Agent's Report
              <span style={{ cursor: 'pointer', display: 'flex' }} onClick={() => setTab('agent-report')} title="View full scouting report">
                <img src={rightIcon} alt="" style={{ width: 12, height: 12, filter: 'brightness(0) invert(0.6)' }} />
              </span>
            </div>
            </div>
            <AgentReportTab w={w} stars={stars} compact />
          </div>
          </>
          )}
        </div>
        </div>

      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ borderRadius: 8, padding: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Biography</div>
          <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {(w as any).bio || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No biography available</span>}
          </div>
        </div>
      </div>

      {tab === 'profile' ? (
      <ProfileTab w={w} stars={stars} img={img} focusedFed={focusedFed} playerFed={playerFed} allFeds={allFeds} gameInfo={gameInfo} navigateToEntity={navigateToEntity} onViewForm={() => setTab('form')} AREAS={AREAS} />

      ) : tab === 'agent-report' ? (
      <AgentReportTab w={w} stars={stars} />

      ) : (
      <FormTab workerUid={workerUid} />
      )}
    </div>
  )
}
