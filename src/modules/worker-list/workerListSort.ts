import { Worker, WorkerSkills } from '../../api'
import { AREAS } from './regions'


export type SortKey = string

export function sortWorkers(list: Worker[], sorts: { key: SortKey; dir: 'asc' | 'desc' }[]): Worker[] {
  if (sorts.length === 0) return list
  return [...list].sort((a, b) => {
    for (const { key, dir } of sorts) {
      let va = 0, vb = 0
      const sk = a.skills as any
      if (sk && key in sk && sk[key]?.pct !== undefined) {
        va = sk[key].pct
        vb = (b.skills as any)?.[key]?.pct ?? 0
      } else {
        switch (key) {
        case 'name': va = a.name.charCodeAt(0); vb = b.name.charCodeAt(0); break
        case 'age': va = a.age; vb = b.age; break
        case 'pop': va = a.pop.pct; vb = b.pop.pct; break
        case 'amount': va = a.contract?.amount ?? 0; vb = b.contract?.amount ?? 0; break
        case 'days_left': va = a.contract?.days_left ?? 0; vb = b.contract?.days_left ?? 0; break
        case 'dispo': va = a.contract?.face ? 0 : 1; vb = b.contract?.face ? 0 : 1; break
        case 'nat': va = a.nationality; vb = b.nationality; break
        case 'gender': va = (a as any).Gender ?? 0; vb = (b as any).Gender ?? 0; break
        case 'perception': {
          const pa = (a.contract as any)?.Perception ?? 99
          const pb = (b.contract as any)?.Perception ?? 99
          if (pa !== pb) { va = pa; vb = pb; break }
          va = (a.contract as any)?.PerceptionScore ?? 0
          vb = (b.contract as any)?.PerceptionScore ?? 0
          break
        }
        case 'role': {
          const roleOrder: Record<string, number> = { 'Wrestler': 1, 'Occasional': 2, 'Manager': 3, 'Personality': 4, 'Announcer': 5, 'Colour': 6, 'Road Agent': 7, 'Referee': 8 }
          const ar = a.positions.map(p => roleOrder[p] ?? 99)
          const br = b.positions.map(p => roleOrder[p] ?? 99)
          va = Math.min(...ar); vb = Math.min(...br)
          break
        }
        case 'condition': {
          const ca = (a.physical as any)
          const cb = (b.physical as any)
          const va2 = [ca?.condition1, ca?.condition2, ca?.condition3, ca?.condition4].map((v: any) => Number(v ?? 100))
          const vb2 = [cb?.condition1, cb?.condition2, cb?.condition3, cb?.condition4].map((v: any) => Number(v ?? 100))
          va = va2.reduce((s: number, v: number) => s + v, 0) / va2.length
          vb = vb2.reduce((s: number, v: number) => s + v, 0) / vb2.length
          break
        }
        case 'condition1': va = Number((a.physical as any)?.condition1 ?? 100); vb = Number((b.physical as any)?.condition1 ?? 100); break
        case 'condition2': va = Number((a.physical as any)?.condition2 ?? 100); vb = Number((b.physical as any)?.condition2 ?? 100); break
        case 'condition3': va = Number((a.physical as any)?.condition3 ?? 100); vb = Number((b.physical as any)?.condition3 ?? 100); break
        case 'condition4': va = Number((a.physical as any)?.condition4 ?? 100); vb = Number((b.physical as any)?.condition4 ?? 100); break
        case 'business': va = (a as any).Business ?? 0; vb = (b as any).Business ?? 0; break
        case 'booking_rep': va = (a as any).Booking_Reputation ?? 0; vb = (b as any).Booking_Reputation ?? 0; break
        case 'booking_skill': va = (a as any).Booking_Skill ?? 0; vb = (b as any).Booking_Skill ?? 0; break
        case 'region_pop': va = a.home_region_pop?.pct ?? 0; vb = b.home_region_pop?.pct ?? 0; break
        case 'total_matches': va = a.performance?.total_matches ?? 0; vb = b.performance?.total_matches ?? 0; break
        case 'total_angles': va = a.performance?.total_angles ?? 0; vb = b.performance?.total_angles ?? 0; break
        case 'total_segments': va = a.performance?.total_segments ?? 0; vb = b.performance?.total_segments ?? 0; break
        case 'avg_duration': va = a.performance?.avg_duration ?? 0; vb = b.performance?.avg_duration ?? 0; break
        case 'total_duration': va = a.performance?.total_duration ?? 0; vb = b.performance?.total_duration ?? 0; break
        case 'current_ability': va = a.current_score || 0; vb = b.current_score || 0; break
        case 'potential_ability': va = a.potential_score || 0; vb = b.potential_score || 0; break
        case 'current_usage': va = a.current_score || 0; vb = b.current_score || 0; break
        case 'potential_usage': va = a.potential_score || 0; vb = b.potential_score || 0; break
        case 'storyline_heat': va = a.storylines?.[0]?.heat?.pct ?? 0; vb = b.storylines?.[0]?.heat?.pct ?? 0; break
        case 'avg_segment': va = a.performance?.avg_segment_rating?.pct ?? 0; vb = b.performance?.avg_segment_rating?.pct ?? 0; break
        case 'avg_match': va = a.performance?.avg_match_rating?.pct ?? 0; vb = b.performance?.avg_match_rating?.pct ?? 0; break
        case 'avg_angle': va = a.performance?.avg_angle_rating?.pct ?? 0; vb = b.performance?.avg_angle_rating?.pct ?? 0; break
        case 'storyline': {
          const sa = a.storylines?.[0]?.storyline_name ?? ''
          const sb = b.storylines?.[0]?.storyline_name ?? ''
          if (sa !== sb) return dir === 'desc' ? sb.localeCompare(sa) : sa.localeCompare(sb)
          break
        }
        case 'last5_segment': {
          const s5 = (w: Worker) => { const r = w.performance?.last_5_segment_ratings; return r && r.length > 0 ? r.reduce((s, x) => s + x.rating, 0) / r.length : 0 }
          va = s5(a); vb = s5(b); break
        }
        case 'last5_match': {
          const m5 = (w: Worker) => { const r = w.performance?.last_5_match_ratings; return r && r.length > 0 ? r.reduce((s, x) => s + x.rating, 0) / r.length : 0 }
          va = m5(a); vb = m5(b); break
        }
        case 'last5_angle': {
          const a5 = (w: Worker) => { const r = w.performance?.last_5_angle_ratings; return r && r.length > 0 ? r.reduce((s, x) => s + x.rating, 0) / r.length : 0 }
          va = a5(a); vb = a5(b); break
        }
        case 'group_primary':
        case 'group_mental':
        case 'group_performance':
        case 'group_fundamental':
        case 'group_physical': {
          const groupKeys: Record<string, (keyof WorkerSkills)[]> = {
            group_primary: ['brawl','puroresu','hardcore','technical','air'],
            group_mental: ['psych','experience','respect','reputation'],
            group_performance: ['charisma','mic','acting','star','looks','menace'],
            group_fundamental: ['basics','selling','consistency','safety'],
            group_physical: ['stamina','athletic','power','toughness','injury'],
          }
          const keys = groupKeys[key] || []
          const avgW = (w: Worker) => {
            const s = w.skills as any
            if (!s) return 0
            const vals = keys.map(k => Number(s[k]?.pct ?? 0))
            if (key === 'group_primary') {
              return Math.max(...vals)
            }
            return vals.reduce((a, b) => a + b, 0) / vals.length
          }
          va = avgW(a); vb = avgW(b); break
        }
        default: {
          if (key.startsWith('pop_area_') || key.startsWith('pop_region_')) {
            const avgPop = (w: Worker) => {
              const ov = w.overness
              if (!ov || ov.length === 0) return 0
              if (key.startsWith('pop_area_')) {
                const areaName = key.replace('pop_area_', '').replace(/_/g, ' ')
                const lookup = Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k.toLowerCase(), v]))
                const ids = lookup[areaName]
                if (!ids) return 0
                const vals = ids.map(rid => Number(ov[rid - 1]?.value?.pct ?? 0))
                return vals.reduce((a, b) => a + b, 0) / vals.length
              } else {
                const regionId = parseInt(key.replace('pop_region_', ''), 10)
                return Number(ov[regionId - 1]?.value?.pct ?? 0)
              }
            }
            va = avgPop(a); vb = avgPop(b)
          } else {
            va = 0; vb = 0
          }
        }
        }
      }
      if (va !== vb) return dir === 'desc' ? vb - va : va - vb
    }
    return 0
  })
}
