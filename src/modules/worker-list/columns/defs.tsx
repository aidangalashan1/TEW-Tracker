import { Worker } from '../../../api'
import { RatingBadge } from '../../../components/RatingDisplay'
import { WorkerImg } from '../../../components/WorkerImg'
import { NavChip } from '../../../components/NavChip'
import { NATIONALITY_FLAGS } from '../nationality'
import faceIcon from '../../../assets/UI icons/face.png'
import heelIcon from '../../../assets/UI icons/heel.png'
import maleIcon from '../../../assets/UI icons/male.png'
import femaleIcon from '../../../assets/UI icons/female.png'
import nonbinaryIcon from '../../../assets/UI icons/nonbinary.png'
import transIcon from '../../../assets/UI icons/trans.png'
import wrestlerIcon from '../../../assets/UI icons/wrestleroccasional.png'
import refereeIcon from '../../../assets/UI icons/referee.png'
import announcerIcon from '../../../assets/UI icons/announcercolor.png'
import managerIcon from '../../../assets/UI icons/manager.png'
import personalityIcon from '../../../assets/UI icons/personality.png'
import roadAgentIcon from '../../../assets/UI icons/roadagent.png'
import { REGION_NAMES, AREAS } from '../regions'
import { ColumnDef } from './types'
import { StatusBadge, MoneyDisplay, conditionHeart, condPctBar, AvgCell, Last5Cell, fmtDuration, fmtDurationHm } from './renderers'
import { COLOR_MALE, COLOR_FACE, COLOR_HEEL } from '../../../lib/colors'
import { PERCEPTION_LABELS, SKILL_LABELS } from '../../../lib/labels'
import starIcon from '../../../assets/UI icons/star.png'

function StarDisplay({ stars, isWrestler: iw }: { stars: number; isWrestler: boolean }) {
  const cls = iw ? 'filter-star-gold' : 'filter-star-silver'
  return (
    <span className="inline-flex items-center gap-1px">
      {Array.from({ length: 5 }, (_, i) => {
        const remainder = stars - i
        if (remainder >= 1) return <img key={i} src={starIcon} alt="" className={`w-14 h-14 ${cls}`} />
        if (remainder >= 0.5) return (
          <span key={i} className="relative inline-block w-14 h-14">
            <img src={starIcon} alt="" className="w-14 h-14 absolute inset-0 filter-dark-30" />
            <span className="absolute inset-0 overflow-hidden flex items-center" style={{ width: '50%' }}>
              <img src={starIcon} alt="" className={`w-14 h-14 ${cls}`} />
            </span>
          </span>
        )
        return <img key={i} src={starIcon} alt="" className="w-14 h-14 filter-dark-30" />
      })}
    </span>
  )
}

export function buildColumns(): ColumnDef[] {
  return [
    { id: 'img', label: '', width: 32, group: 'info', filterGroup: 'personal', render: w => <WorkerImg worker={w} className="worker-thumb" /> },
    { id: 'status', label: 'Status', width: 32, group: 'info', filterGroup: 'personal', render: w => <div className="flex-center w-full h-full"><StatusBadge status={w.status} workerUid={w.uid} /></div> },
    { id: 'name', label: 'Name', width: 250, group: 'info', filterGroup: 'personal', render: w => <NavChip type="worker" id={w.uid} label={w.name} style={{ fontWeight: 700 }} />, sortKey: 'name' },
    { id: 'gender', label: 'Gender', abbrev: 'Gen', width: 24, group: 'info', filterGroup: 'personal', sortKey: 'gender', render: w => {
      const g = (w as any).Gender ?? 1
      const icon = g === 1 || g === 4 ? maleIcon
                 : g === 5 || g === 8 ? femaleIcon
                 : g === 2 || g === 6 ? transIcon
                 : nonbinaryIcon
      const tint = g === 1 || g === 4 ? COLOR_MALE
                 : g === 2 ? '#93b4e8'
                 : g === 5 || g === 8 ? '#f472b6'
                 : g === 6 ? '#e88ab8'
                 : '#c084fc'
      return <div className="flex-center w-full h-full">
        <span className="icon-mask" style={{ width: 16, height: 16, backgroundColor: tint, mask: `url(${icon}) center/contain no-repeat`, WebkitMask: `url(${icon}) center/contain no-repeat` }} />
      </div>
    } },
    { id: 'nat', label: 'Nationality', abbrev: 'Nat', width: 28, group: 'info', filterGroup: 'personal', sortKey: 'nat', render: w => {
      const code = NATIONALITY_FLAGS[w.nationality]
      if (!code) return <span>—</span>
      const flagUrl = new URL(`../../../assets/flag-icons-main/flags/4x3/${code}.svg`, import.meta.url).href
      return <div className="flex-center h-full">
        <img src={flagUrl} alt="" className="w-20 h-15 object-cover rounded-xs" />
      </div>
    } },
    { id: 'age', label: 'Age', width: 50, group: 'info', filterGroup: 'personal', sortKey: 'age', render: w => <span style={{ background: 'var(--bg-tertiary)', color: '#fff', borderRadius: 3, padding: '0 6px', fontFamily: 'var(--font-family)', fontSize: 11, fontWeight: 700, lineHeight: '18px', display: 'inline-block' }}>{w.age}</span> },

    { id: 'perception', label: 'Perception', abbrev: 'Prc', width: 90, group: 'info', filterGroup: 'creative', sortKey: 'perception', render: w => {
      const p = (w.contract as any)?.Perception ?? 0
      const colors: Record<number, string> = { 1: '#2d7d46', 2: '#2c6b9e', 3: '#b8941e', 4: '#6b7280', 5: '#4b5563' }
      return <span style={{ background: colors[p] || 'transparent', color: '#fff', borderRadius: 3, padding: '0 6px', fontFamily: 'var(--font-family)', fontSize: 11, fontWeight: 700, lineHeight: '20px', display: 'inline-block' }}>{PERCEPTION_LABELS[p] || 'Unknown'}</span>
    } },
    { id: 'role', label: 'Role', width: 60, group: 'info', filterGroup: 'creative', sortKey: 'role', render: w => {
      const roleIcons: Record<string, string> = {
        'Wrestler': wrestlerIcon, 'Occasional': wrestlerIcon,
        'Referee': refereeIcon,
        'Announcer': announcerIcon, 'Colour': announcerIcon,
        'Manager': managerIcon, 'Personality': personalityIcon,
        'Road Agent': roadAgentIcon,
      }
      return <div className="flex-center h-full" style={{ gap: 2 }}>
        {w.positions.map(p => {
          const icon = roleIcons[p]
          if (!icon) return null
          return <span key={p} data-tooltip={p} className="role-tooltip inline-flex"><img src={icon} alt={p} className="w-18 h-18" style={{ filter: 'brightness(0) invert(0.7)' }} /></span>
        })}
        {w.positions.length === 0 && <span>—</span>}
      </div>
    } },
    { id: 'dispo', label: 'Disposition', abbrev: 'Disp', width: 70, group: 'info', filterGroup: 'creative', sortKey: 'dispo', render: w => {
      if (!w.contract) return null
      const color = w.contract.face ? COLOR_FACE : COLOR_HEEL
      const icon = w.contract.face ? faceIcon : heelIcon
      return <div className="items-center h-full gap-3px">
        <span className="icon-mask" style={{ width: 14, height: 14, backgroundColor: color, mask: `url(${icon}) center/contain no-repeat`, WebkitMask: `url(${icon}) center/contain no-repeat` }} />
      </div>
    } },
    { id: 'storyline', label: 'Storyline', abbrev: 'Story', width: 140, group: 'info', filterGroup: 'creative', sortKey: 'storyline', render: w => {
      if (!w.storylines || w.storylines.length === 0) return <span>—</span>
      return <span className="cursor-pointer" onClick={e => { e.stopPropagation() }}>{w.storylines[0].storyline_name}</span>
    } },
    { id: 'storyline_with', label: 'In Storyline With', abbrev: 'With', width: 140, group: 'info', filterGroup: 'creative', render: w => {
      if (!w.storylines || w.storylines.length === 0) return <span>—</span>
      const myAlignment = w.storylines[0].involved_with.find(i => i.uid === w.uid)?.alignment
      let names = w.storylines[0].involved_with
        .filter(i => i.uid !== w.uid && i.major_role)
        .filter(i => myAlignment === 0 || i.alignment !== myAlignment)
        .map(i => i.name).filter(Boolean).sort()
      if (names.length === 0) names = w.storylines[0].involved_with.filter(i => i.uid !== w.uid && i.major_role).map(i => i.name).filter(Boolean).sort()
      if (names.length === 0) names = w.storylines[0].involved_with.filter(i => i.uid !== w.uid).map(i => i.name).filter(Boolean).sort()
      if (names.length === 0) return <span>—</span>
      return <span className="cursor-pointer" onClick={e => { e.stopPropagation() }}>{names.join(', ')}</span>
    } },
    { id: 'storyline_heat', label: 'Storyline Heat', abbrev: 'Heat', width: 52, group: 'info', filterGroup: 'creative', sortKey: 'storyline_heat', render: w => {
      if (!w.storylines || w.storylines.length === 0) return null
      return <span className="cursor-pointer" onClick={e => { e.stopPropagation() }}><RatingBadge rating={w.storylines[0].heat} /></span>
    } },
    { id: 'momentum', label: 'Momentum', abbrev: 'Mom', width: 52, group: 'contract', filterGroup: 'creative', render: w => {
      if (!w.contract?.contract_momentum) return null
      return <RatingBadge rating={w.contract.contract_momentum} />
    } },
    { id: 'brand', label: 'Brand', abbrev: 'Brnd', width: 40, group: 'contract', filterGroup: 'creative', render: w => {
      const b = w.contract?.brand
      if (!b) return null
      const colors = ['#60a5fa', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#f472b6', '#34d399', '#fb923c']
      return <span className="brand-badge" style={{ background: colors[b % colors.length] }}>{b}</span>
    } },
    { id: 'avg_segment', label: 'Avg Segment', abbrev: 'AvgSeg', width: 52, group: 'performance', filterGroup: 'creative', sortKey: 'avg_segment', render: w => {
      if (!w.performance || w.performance.avg_segment_rating.pct === 0) return null
      return <AvgCell workerUid={w.uid} avg={w.performance.avg_segment_rating.pct}
        best={w.performance.best_segment_rating} worst={w.performance.worst_segment_rating}
        count={w.performance.total_segments}
        bestInfo={w.performance.best_segment_info} worstInfo={w.performance.worst_segment_info}
        avgDuration={w.performance.avg_duration} totalDuration={w.performance.total_duration} />
    } },
    { id: 'avg_match', label: 'Avg Match', abbrev: 'AvgMch', width: 52, group: 'performance', filterGroup: 'creative', sortKey: 'avg_match', render: w => {
      if (!w.performance || w.performance.avg_match_rating.pct === 0) return null
      return <AvgCell workerUid={w.uid} avg={w.performance.avg_match_rating.pct}
        best={w.performance.best_match_rating} worst={w.performance.worst_match_rating}
        count={w.performance.total_matches}
        bestInfo={w.performance.best_match_info} worstInfo={w.performance.worst_match_info} />
    } },
    { id: 'avg_angle', label: 'Avg Angle', abbrev: 'AvgAng', width: 52, group: 'performance', filterGroup: 'creative', sortKey: 'avg_angle', render: w => {
      if (!w.performance || w.performance.avg_angle_rating.pct === 0) return null
      return <AvgCell workerUid={w.uid} avg={w.performance.avg_angle_rating.pct}
        best={w.performance.best_angle_rating} worst={w.performance.worst_angle_rating}
        count={w.performance.total_angles}
        bestInfo={w.performance.best_angle_info} worstInfo={w.performance.worst_angle_info} />
    } },
    { id: 'last5_segment', label: 'Last 5 Segments', abbrev: 'L5Seg', width: 100, group: 'performance', filterGroup: 'creative', sortKey: 'last5_segment', render: w => {
      if (!w.performance || w.performance.last_5_segment_ratings.length === 0) return null
      return <Last5Cell items={w.performance.last_5_segment_ratings} workerUid={w.uid} />
    } },
    { id: 'last5_match', label: 'Last 5 Matches', abbrev: 'L5Mch', width: 100, group: 'performance', filterGroup: 'creative', sortKey: 'last5_match', render: w => {
      if (!w.performance || w.performance.last_5_match_ratings.length === 0) return null
      return <Last5Cell items={w.performance.last_5_match_ratings} workerUid={w.uid} />
    } },
    { id: 'last5_angle', label: 'Last 5 Angles', abbrev: 'L5Ang', width: 100, group: 'performance', filterGroup: 'creative', sortKey: 'last5_angle', render: w => {
      if (!w.performance || w.performance.last_5_angle_ratings.length === 0) return null
      return <Last5Cell items={w.performance.last_5_angle_ratings} workerUid={w.uid} />
    } },
    { id: 'total_segments', label: '# Segments', abbrev: '#Seg', width: 48, group: 'performance', filterGroup: 'creative', sortKey: 'total_segments', render: w => {
      if (!w.performance) return null
      return <span>{w.performance.total_segments}</span>
    } },
    { id: 'total_matches', label: '# Matches', abbrev: '#Mch', width: 48, group: 'performance', filterGroup: 'creative', sortKey: 'total_matches', render: w => {
      if (!w.performance) return null
      return <span>{w.performance.total_matches}</span>
    } },
    { id: 'total_angles', label: '# Angles', abbrev: '#Ang', width: 48, group: 'performance', filterGroup: 'creative', sortKey: 'total_angles', render: w => {
      if (!w.performance) return null
      return <span>{w.performance.total_angles}</span>
    } },
    { id: 'avg_duration', label: 'Avg Ring Time', abbrev: 'AvgTm', width: 56, group: 'performance', filterGroup: 'creative', sortKey: 'avg_duration', render: w => {
      if (!w.performance || !w.performance.avg_duration) return null
      return <span>{fmtDuration(w.performance.avg_duration)}</span>
    } },
    { id: 'total_duration', label: 'Total Ring Time', abbrev: 'TotTm', width: 60, group: 'performance', filterGroup: 'creative', sortKey: 'total_duration', render: w => {
      if (!w.performance || !w.performance.total_duration) return null
      return <span>{fmtDurationHm(w.performance.total_duration)}</span>
    } },
    { id: 'tag_team', label: 'Tag Team', abbrev: 'Tag', width: 110, group: 'info', filterGroup: 'creative', render: w => {
      if (!w.tag_teams || w.tag_teams.length === 0) return <span>—</span>
      return <span>{w.tag_teams.map(t => `${t.name} (${t.partner_name})`).join(', ')}</span>
    } },
    { id: 'stable', label: 'Stable', abbrev: 'Stbl', width: 100, group: 'info', filterGroup: 'creative', render: w => {
      if (!w.stables || w.stables.length === 0) return <span>—</span>
      return <span>{w.stables.map(s => s.leader ? `${s.name} (L)` : s.name).join(', ')}</span>
    } },
    { id: 'chemistry', label: 'Chemistry', abbrev: 'Chem', width: 110, group: 'info', filterGroup: 'creative', render: w => {
      if (!w.chemistry || w.chemistry.length === 0) return <span>—</span>
      // Sort strongest-first and surface the real magnitude (TEW stores it but
      // buries it), so a standout pairing reads differently from a faint one.
      const pos = w.chemistry.filter(c => c.chemistry > 0).sort((a, b) => b.chemistry - a.chemistry)
      const neg = w.chemistry.filter(c => c.chemistry < 0).sort((a, b) => a.chemistry - b.chemistry)
      const fmt = (c: { worker_name: string; chemistry: number }) =>
        `${c.worker_name} (${Math.abs(c.chemistry)})`
      return <span className="flex flex-col gap-1px">
        {pos.length > 0 && <span className="text-green">+ {pos.map(fmt).join(', ')}</span>}
        {neg.length > 0 && <span className="text-red">− {neg.map(fmt).join(', ')}</span>}
      </span>
    } },

    { id: 'wage', label: 'Wage', width: 70, group: 'contract', filterGroup: 'contract', render: w => <MoneyDisplay amount={w.contract?.amount ?? 0} />, sortKey: 'amount' },
    { id: 'contract', label: 'Contract', width: 90, group: 'contract', filterGroup: 'contract', render: w => w.contract ? <span>{w.contract.written ? 'Written' : 'Open'}{w.contract.exclusive ? '/Exclusive' : ''}</span> : <span>—</span> },
    { id: 'expiry', label: 'Expiry', width: 100, group: 'contract', filterGroup: 'contract', render: w => {
      if (!w.contract) return <span>—</span>
      const d = w.contract.days_left
      const cls = d <= 30 ? 'worker-list-expiry-critical' : d <= 90 ? 'worker-list-expiry-warning' : d <= 180 ? 'worker-list-expiry-soon' : ''
      return <span className={cls}>{`${d}d`}</span>
    }, sortKey: 'days_left' },

    { id: 'pop', label: 'Pop', abbrev: 'Pop', width: 50, group: 'performance', filterGroup: 'popularity', render: w => w.pop.pct > 0 ? <RatingBadge rating={w.pop} /> : null, sortKey: 'pop' },
    { id: 'group_primary', label: 'Primary', abbrev: 'Pri', width: 52, group: 'skills', filterGroup: 'stats',
      sortKey: 'group_primary',
      render: w => {
        const s = w.skills; if (!s) return null
        const keys = ['brawl','puroresu','hardcore','technical','air'] as const
        const vals = keys.map(k => Number(s[k]?.pct ?? 0))
        const max = Math.max(...vals)
        return <RatingBadge rating={{ raw: max * 10, pct: max, grade: '' }} />
      }
    },
    { id: 'group_mental', label: 'Mental', abbrev: 'Men', width: 52, group: 'skills', filterGroup: 'stats',
      sortKey: 'group_mental',
      render: w => {
        const s = w.skills; if (!s) return null
        const keys = ['psych','experience','respect','reputation'] as const
        const vals = keys.map(k => Number(s[k]?.pct ?? 0))
        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        return <RatingBadge rating={{ raw: avg * 10, pct: avg, grade: '' }} />
      }
    },
    { id: 'group_performance', label: 'Performance', abbrev: 'Perf', width: 52, group: 'skills', filterGroup: 'stats',
      sortKey: 'group_performance',
      render: w => {
        const s = w.skills; if (!s) return null
        const keys = ['charisma','mic','acting','star','looks','menace'] as const
        const vals = keys.map(k => Number(s[k]?.pct ?? 0))
        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        return <RatingBadge rating={{ raw: avg * 10, pct: avg, grade: '' }} />
      }
    },
    { id: 'group_fundamental', label: 'Fundamental', abbrev: 'Fund', width: 52, group: 'skills', filterGroup: 'stats',
      sortKey: 'group_fundamental',
      render: w => {
        const s = w.skills; if (!s) return null
        const keys = ['basics','selling','consistency','safety'] as const
        const vals = keys.map(k => Number(s[k]?.pct ?? 0))
        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        return <RatingBadge rating={{ raw: avg * 10, pct: avg, grade: '' }} />
      }
    },
    { id: 'group_physical', label: 'Physical', abbrev: 'Phys', width: 52, group: 'skills', filterGroup: 'stats',
      sortKey: 'group_physical',
      render: w => {
        const s = w.skills; if (!s) return null
        const keys = ['stamina','athletic','power','toughness','injury'] as const
        const vals = keys.map(k => Number(s[k]?.pct ?? 0))
        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        return <RatingBadge rating={{ raw: avg * 10, pct: avg, grade: '' }} />
      }
    },
    { id: 'brawl', label: SKILL_LABELS.brawl, abbrev: 'Brawl', width: 55, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.brawl} /> : null, sortKey: 'brawl' },
    { id: 'puro', label: SKILL_LABELS.puroresu, abbrev: 'Puro', width: 48, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.puroresu} /> : null, sortKey: 'puroresu' },
    { id: 'hard', label: SKILL_LABELS.hardcore, abbrev: 'Hard', width: 48, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.hardcore} /> : null, sortKey: 'hardcore' },
    { id: 'tech', label: SKILL_LABELS.technical, abbrev: 'Tech', width: 50, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.technical} /> : null, sortKey: 'technical' },
    { id: 'air', label: SKILL_LABELS.air, abbrev: 'Air', width: 42, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.air} /> : null, sortKey: 'air' },
    { id: 'flash', label: SKILL_LABELS.flash, abbrev: 'Flash', width: 48, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.flash} /> : null, sortKey: 'flash' },
    { id: 'psych', label: SKILL_LABELS.psych, abbrev: 'Psych', width: 52, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.psych} /> : null, sortKey: 'psych' },
    { id: 'exp', label: SKILL_LABELS.experience, abbrev: 'Exp', width: 42, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.experience} /> : null, sortKey: 'experience' },
    { id: 'respect', label: SKILL_LABELS.respect, abbrev: 'Resp', width: 44, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.respect} /> : null, sortKey: 'respect' },
    { id: 'reputation', label: SKILL_LABELS.reputation, abbrev: 'Rep', width: 40, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.reputation} /> : null, sortKey: 'reputation' },
    { id: 'char', label: SKILL_LABELS.charisma, abbrev: 'Char', width: 46, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.charisma} /> : null, sortKey: 'charisma' },
    { id: 'mic', label: SKILL_LABELS.mic, abbrev: 'Mic', width: 42, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.mic} /> : null, sortKey: 'mic' },
    { id: 'acting', label: SKILL_LABELS.acting, abbrev: 'Act', width: 42, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.acting} /> : null, sortKey: 'acting' },
    { id: 'star', label: SKILL_LABELS.star, abbrev: 'Star', width: 42, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.star} /> : null, sortKey: 'star' },
    { id: 'looks', label: SKILL_LABELS.looks, abbrev: 'Look', width: 46, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.looks} /> : null, sortKey: 'looks' },
    { id: 'menace', label: SKILL_LABELS.menace, abbrev: 'Menc', width: 46, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.menace} /> : null, sortKey: 'menace' },
    { id: 'basics', label: SKILL_LABELS.basics, abbrev: 'Bas', width: 42, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.basics} /> : null, sortKey: 'basics' },
    { id: 'sell', label: SKILL_LABELS.selling, abbrev: 'Sell', width: 42, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.selling} /> : null, sortKey: 'selling' },
    { id: 'cons', label: SKILL_LABELS.consistency, abbrev: 'Cons', width: 46, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.consistency} /> : null, sortKey: 'consistency' },
    { id: 'safe', label: SKILL_LABELS.safety, abbrev: 'Safe', width: 44, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.safety} /> : null, sortKey: 'safety' },
    { id: 'stam', label: SKILL_LABELS.stamina, abbrev: 'Stam', width: 46, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.stamina} /> : null, sortKey: 'stamina' },
    { id: 'ath', label: SKILL_LABELS.athletic, abbrev: 'Ath', width: 42, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.athletic} /> : null, sortKey: 'athletic' },
    { id: 'power', label: SKILL_LABELS.power, abbrev: 'Pwr', width: 42, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.power} /> : null, sortKey: 'power' },
    { id: 'tough', label: SKILL_LABELS.toughness, abbrev: 'Tough', width: 48, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.toughness} /> : null, sortKey: 'toughness' },
    { id: 'inj', label: SKILL_LABELS.injury, abbrev: 'Inj', width: 38, group: 'skills', filterGroup: 'stats', render: w => w.skills ? <RatingBadge rating={w.skills.injury} /> : null, sortKey: 'injury' },
    { id: 'business', label: 'Business', abbrev: 'Bus', width: 44, group: 'skills', filterGroup: 'stats', render: w => {
      const v = (w as any).Business
      return v != null ? <RatingBadge rating={{ raw: v, pct: Math.round(v / 10), grade: '' }} /> : null
    }, sortKey: 'business' },
    { id: 'booking_rep', label: 'Booking Reputation', abbrev: 'BkRep', width: 50, group: 'skills', filterGroup: 'stats', render: w => {
      const v = (w as any).Booking_Reputation
      return v != null ? <RatingBadge rating={{ raw: v, pct: Math.round(v / 10), grade: '' }} /> : null
    }, sortKey: 'booking_rep' },
    { id: 'booking_skill', label: 'Booking Skill', abbrev: 'BkSkill', width: 52, group: 'skills', filterGroup: 'stats', render: w => {
      const v = (w as any).Booking_Skill
      return v != null ? <RatingBadge rating={{ raw: v, pct: Math.round(v / 10), grade: '' }} /> : null
    }, sortKey: 'booking_skill' },

    { id: 'current_ability', label: 'Ability', abbrev: 'Abil', width: 80, group: 'performance', filterGroup: 'stats', sortKey: 'current_ability', render: w => {
      const stars = w.current_stars || 0
      if (!stars) return null
      return <StarDisplay stars={stars} isWrestler={w.is_wrestler} />
    } },
    { id: 'potential_ability', label: 'Potential', abbrev: 'Pot', width: 80, group: 'performance', filterGroup: 'stats', sortKey: 'potential_ability', render: w => {
      const stars = w.potential_stars || 0
      if (!stars) return null
      return <StarDisplay stars={stars} isWrestler={w.is_wrestler} />
    } },
    { id: 'current_usage', label: 'Usage', abbrev: 'Use', width: 140, group: 'performance', filterGroup: 'stats', sortKey: 'current_usage', render: w => {
      if (!w.current_stars) return <span>—</span>
      return <span className="truncate" title={w.usage_label}>{w.usage_label}</span>
    } },
    { id: 'potential_usage', label: 'Potential Usage', abbrev: 'PotUse', width: 140, group: 'performance', filterGroup: 'stats', sortKey: 'potential_usage', render: w => {
      if (!w.potential_stars) return <span>—</span>
      return <span className="truncate" title={w.potential_usage_label}>{w.potential_usage_label}</span>
    } },

    { id: 'condition', label: 'Condition', abbrev: 'Cond.', width: 50, group: 'info', filterGroup: 'medical', sortKey: 'condition', render: conditionHeart },
    { id: 'cond1', label: 'Head', width: 46, group: 'info', filterGroup: 'medical', sortKey: 'condition1', render: w => condPctBar(w, 1) },
    { id: 'cond2', label: 'Body', width: 46, group: 'info', filterGroup: 'medical', sortKey: 'condition2', render: w => condPctBar(w, 2) },
    { id: 'cond3', label: 'Arms', width: 46, group: 'info', filterGroup: 'medical', sortKey: 'condition3', render: w => condPctBar(w, 3) },
    { id: 'cond4', label: 'Legs', width: 46, group: 'info', filterGroup: 'medical', sortKey: 'condition4', render: w => condPctBar(w, 4) },
    { id: 'fatigue', label: 'Fatigue', abbrev: 'Fat', width: 50, group: 'info', filterGroup: 'medical', render: w => {
      const v = (w.physical as any)?.Fatigue ?? 0
      const pct = Math.round(v / 10)
      return pct > 0 ? <RatingBadge rating={{ raw: v, pct, grade: '' }} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>
    } },
    { id: 'ringrust', label: 'Ring Rust', abbrev: 'Rust', width: 44, group: 'info', filterGroup: 'medical', render: w => {
      const v = (w.physical as any)?.Ringrust ?? 0
      const pct = Math.round(v / 10)
      return pct > 0 ? <RatingBadge rating={{ raw: v, pct, grade: '' }} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>
    } },

    { id: 'win', label: 'Wins', abbrev: 'W', width: 36, group: 'record', filterGroup: 'creative', render: w => <span>{w.win_loss?.wins ?? 0}</span> },
    { id: 'loss', label: 'Losses', abbrev: 'L', width: 36, group: 'record', filterGroup: 'creative', render: w => <span>{w.win_loss?.losses ?? 0}</span> },
    { id: 'draws', label: 'Draws', abbrev: 'D', width: 36, group: 'record', filterGroup: 'creative', render: w => <span>{w.win_loss?.draws ?? 0}</span> },
    { id: 'wl_record', label: 'Record', abbrev: 'Rec', width: 80, group: 'record', filterGroup: 'creative', render: w => {
      const wl = w.win_loss
      if (!wl) return <span>—</span>
      return <span>{wl.wins}-{wl.losses}{wl.draws > 0 ? `-${wl.draws}` : ''}</span>
    }},
    { id: 'wl_pct', label: 'Win %', abbrev: 'W%', width: 48, group: 'record', filterGroup: 'creative', render: w => {
      const wl = w.win_loss
      if (!wl || wl.wins + wl.losses === 0) return <span>—</span>
      const pct = Math.round(wl.wins / (wl.wins + wl.losses) * 100)
      return <RatingBadge rating={{ raw: pct * 10, pct, grade: '' }} />
    }},
    ...Object.entries(AREAS).map(([area, regionIds]) => {
      const id = `pop_area_${area.toLowerCase().replace(/\s+/g, '_')}`
      return {
        id, label: `${area} Pop`, abbrev: area.substring(0, 3) + 'P', width: 70,
        group: 'performance', filterGroup: 'popularity',
        sortKey: id,
        render: (w: Worker) => {
          const vals = regionIds.map(rid => Number(w.overness?.[rid - 1]?.value?.pct ?? 0))
          if (vals.every(v => v === 0)) return null
          const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
          return <RatingBadge rating={{ raw: avg * 10, pct: avg, grade: '' }} />
        },
      } as ColumnDef
    }),
    ...Object.entries(REGION_NAMES).map(([idStr, name]) => {
      const id = `pop_region_${idStr}`
      return {
        id, label: `${name} Pop`, abbrev: name.substring(0, 3) + 'P', width: 70,
        group: 'performance', filterGroup: 'popularity',
        sortKey: id,
        render: (w: Worker) => {
          const v = w.overness?.[Number(idStr) - 1]?.value
          return v?.pct ? <RatingBadge rating={v} /> : null
        },
      } as ColumnDef
    }),
  ]
}
