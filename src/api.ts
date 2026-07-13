// Re-export all generated model types
export type * from './api-types'
// Backward compat alias
export type RatingData = import('./api-types').RatingDisplay

// In the packaged app, Electron negotiates a free backend port and exposes the
// resulting base via preload (window.electronAPI.apiBase). Fall back to the
// build-time env override, then the default dev port.
const API_BASE =
  (typeof window !== 'undefined' && (window as any).electronAPI?.apiBase) ||
  import.meta.env.VITE_API_BASE ||
  'http://127.0.0.1:8567/api'

/** Error thrown by the API client. `status` is 0 for network failures; `code`
 *  is the backend's machine-readable error code (or 'network_error'). */
export class ApiError extends Error {
  status: number
  code: string
  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  let lastError: Error | null = null
  const maxRetries = 2
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, opts)
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        // Parse the structured `{ error: { code, message } }` envelope if present.
        let code = 'http_error'
        let message = `API ${res.status} ${res.statusText}`
        try {
          const parsed = JSON.parse(body)
          if (parsed?.error?.message) {
            message = parsed.error.message
            code = parsed.error.code || code
          } else if (body) {
            message += ': ' + body.slice(0, 200)
          }
        } catch {
          if (body) message += ': ' + body.slice(0, 200)
        }
        throw new ApiError(message, res.status, code)
      }
      return res.json()
    } catch (e: any) {
      lastError = e
      // Only retry transient network errors (fetch throws TypeError); HTTP
      // errors are structured and returned to the caller as-is.
      if (e instanceof TypeError && attempt < maxRetries) {
        const delay = 500 * Math.pow(2, attempt)
        console.warn(`[API] Retry ${attempt + 1}/${maxRetries} ${path} after ${delay}ms:`, e.message)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      if (e instanceof ApiError) throw e
      break
    }
  }
  console.error(`[API] Failed ${path}:`, lastError)
  throw new ApiError(`Request failed: ${path} — ${lastError?.message || 'unknown error'}`, 0, 'network_error')
}

// ── Custom types (not generated from Pydantic models) ──

export interface FinanceSubLine {
  key: string
  label: string
  value: number
}

export interface FinanceLine extends FinanceSubLine {
  pct: number
  children: FinanceSubLine[]
}

export interface FinancePeriod {
  period: number
  income: number
  expense: number
  net: number
  balance: number
}

export interface WageEarner {
  uid: number
  name: string
  amount: number
  picture: string
  position: string
  days_left: number
}

export interface WageBill {
  total: number
  count: number
  top: WageEarner[]
  pct_of_income: number
  avg_wage: number
}

export interface FinanceStandingPeer {
  rank: number
  fed_uid: number
  name: string
  logo: string
  income: number
  is_player: boolean
}

export interface FinanceStanding {
  rank: number
  total: number
  metric: string
  peers: FinanceStandingPeer[]
}

/** Lightweight cross-module KPIs — powers the Finance Summary tile only.
 *  The full wage/standing detail lives in WageBill / FinanceStanding below. */
export interface FinanceSummary {
  balance: number
  current: {
    total_income: number
    total_expense: number
    net: number
    margin: number
  }
  wage_bill: {
    total: number
    count: number
    pct_of_income: number
  }
  standing: {
    rank: number
    total: number
  }
}

export interface FinanceHistory {
  history: FinancePeriod[]
}

export interface FinanceBreakdown {
  income: FinanceLine[]
  expense: FinanceLine[]
}

export interface ViewSummary {
  id: string; name: string; description: string;
  created: string; updated: string; pageCount: number;
}

export interface ViewPage {
  id: string; label: string;
  layout: { i: string; moduleId: string; x: number; y: number; w: number; h: number; config?: any }[];
  moduleConfigs: Record<string, any>;
}

export interface View {
  id: string; name: string; description: string;
  created: string; updated: string;
  pages: ViewPage[];
}

export interface UpcomingShow {
  type: 'tv' | 'event'
  name: string
  date: string
  showday?: number
  dayLabel?: string
  length: number
  lengthMin: number
  bShow?: boolean
  tvUid?: number
  importance?: number
  cardUid?: number
  logo?: string
  showIntent?: number
  finale?: boolean
}

export interface CardSegment {
  type: 'match' | 'angle' | 'battle-royal'
  order: number
  workers: number[]
  sides: number[][]
  description: string
  notes: string
  storyline?: string
  saved?: boolean
}

export interface FormSegmentPerson {
  uid: number
  name: string
  picture: string
}

export interface FormSegment {
  match_log_uid: number
  date: string
  length: number | null
  fed_uid: number
  fed_name: string
  card_uid: number
  card: string
  is_tv: boolean
  is_angle: boolean
  rating: number
  label: string
  log_entry: string
  is_title_match: boolean
  won: boolean
  lost: boolean
  allies: FormSegmentPerson[]
  opponents: FormSegmentPerson[]
}

export interface FormSummary {
  total_segments: number
  total_matches: number
  total_angles: number
  avg_rating: number
  avg_match_rating: number
  avg_angle_rating: number
  best_rating: number
  worst_rating: number
  wins: number
  losses: number
  title_matches: number
}

export interface WorkerForm {
  summary: FormSummary | null
  segments: FormSegment[]
}

export interface RosterFormEntry {
  uid: number
  name: string
  picture: string
  face: boolean
  summary: FormSummary
  recent_ratings: number[]
}

export interface RosterForm {
  fed_uid: number
  workers: RosterFormEntry[]
}

/** A free agent is a full Worker record with no contract, plus an optional
 *  form_summary if they have any logged match/angle history. */
export type FreeAgent = import('./api-types').Worker & { form_summary?: FormSummary }

export interface FreeAgentsResponse {
  count: number
  workers: FreeAgent[]
}

export interface ShortlistEntry {
  worker_uid: number
  notes: string
  added: string
  name: string
  picture: string
  found: boolean
}

export interface ShortlistResponse {
  entries: ShortlistEntry[]
}

export interface ShowCard {
  id: string
  showType: string
  showUid: number
  showName: string
  showDate: string
  fedUid: number
  segments: CardSegment[]
  notes: string
  created: string
  updated: string
}

export interface CardSummary {
  id: string; showType: string; showUid: number;
  showName: string; showDate: string;
  segmentCount: number; updated: string;
}

export interface PastShowCompetitor {
  worker_uid: number; name: string; picture: string;
  side: number; performance: number; limited: boolean;
}

export interface PastShowMatch {
  uid: number; log_entry: string; rating: number;
  match_type: number; victor: number;
  title1: number; title2: number;
  extra_notes: string; pre_show: boolean; post_show: boolean;
  competitors: PastShowCompetitor[];
}

export interface PastShow {
  uid: number; name: string; fed_uid: number;
  is_tv: boolean; date: string;
  overall_rating: number; attendance: number;
  ppv_rating: number; tv_rating: number; viewers: number;
  sell_out: boolean; highlights: boolean; cancelled: boolean;
  logo: string; matches: PastShowMatch[];
}

export interface ScheduleData {
  upcoming: UpcomingShow[]
  tvShows: any[]
  events: any[]
  slots: any[]
  currentDate: string
}

export interface PlannedStoryline {
  id: string
  name: string
  workers: number[]
  notes: string
  created: string
  updated: string
}

export function imageUrl(relativePath: string): string {
  if (!relativePath) return ''
  const parts = relativePath.replace(/\\/g, '/').split('/')
  const encoded = parts.map(p => encodeURIComponent(p)).join('/')
  return `${API_BASE}/images/${encoded}`
}

export const api = {
  health: () => request<{status: string}>('/health'),

  game: {
    info: () => request<import('./api-types').GameInfo>('/game/info'),
    version: () => request<{version: number}>('/game/version'),
    refresh: () => request<{ok: boolean}>('/game/refresh', {method: 'POST'}),
  },

  roster: {
    list: (fed_uid?: number) =>
      request<{fed_uid: number; count: number; workers: import('./api-types').Worker[]}>(
        `/roster${fed_uid ? `?fed_uid=${fed_uid}` : ''}`
      ),
    detail: (uid: number) => request<import('./api-types').Worker>(`/roster/${uid}`),
    form: (uid: number) => request<WorkerForm>(`/roster/${uid}/form`),
    rosterForm: (fed_uid?: number) => request<RosterForm>(`/roster/form${fed_uid ? `?fed_uid=${fed_uid}` : ''}`),
  },

  freeAgents: {
    list: (fed_uid?: number) => request<FreeAgentsResponse>(`/free-agents${fed_uid ? `?fed_uid=${fed_uid}` : ''}`),
  },

  shortlist: {
    list: () => request<ShortlistResponse>('/shortlist'),
    add: (worker_uid: number, notes = '') =>
      request<ShortlistResponse>('/shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_uid, notes }),
      }),
    updateNotes: (worker_uid: number, notes: string) =>
      request<ShortlistResponse>(`/shortlist/${worker_uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      }),
    remove: (worker_uid: number) =>
      request<ShortlistResponse>(`/shortlist/${worker_uid}`, { method: 'DELETE' }),
  },

  fed: {
    player: () => request<import('./api-types').Federation>('/fed/player'),
    detail: (uid: number) => request<import('./api-types').Federation>(`/fed/${uid}`),
    all: () => request<{feds: import('./api-types').Federation[]}>('/feds'),
    belts: (uid: number) => request<{belts: import('./api-types').Belt[]}>(`/fed/${uid}/belts`),
    storylines: (uid: number) =>
      request<{storylines: import('./api-types').Storyline[]}>(`/fed/${uid}/storylines`),
    finances: (uid: number) => request<Record<string, number>>(`/fed/${uid}/finances`),
    overview: (uid: number) =>
      request<{fed: import('./api-types').Federation; belts: import('./api-types').Belt[]; storylines: import('./api-types').Storyline[]; finances: Record<string, number>}>(
        `/fed/${uid}/overview`
      ),
  },

  db: {
    status: () => request<{
      connected: boolean; path: string; filename: string;
      image_path: string; image_configured: boolean;
    }>('/database/status'),
    connect: (path: string) =>
      request<{ok: boolean; path: string}>('/database/connect', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path}),
      }),
    browse: () => request<{path: string | null; cancelled: boolean}>('/database/browse', {
      method: 'POST',
    }),
    disconnect: () => request<{ok: boolean}>('/database/disconnect', {method: 'POST'}),
  },

  images: {
    status: () => request<{configured: boolean; path: string}>('/images/status'),
    setPath: (path: string) =>
      request<{ok: boolean; path: string}>('/images/path', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path}),
      }),
    auto: (mdbPath?: string) =>
      request<{ok: boolean; path: string | null; error?: string}>(
        `/images/auto${mdbPath ? `?mdb_path=${encodeURIComponent(mdbPath)}` : ''}`
      ),
    browse: () => request<{path: string | null; cancelled: boolean}>('/images/browse', {
      method: 'POST',
    }),
  },
  tagteams: {
    list: (fed_uid?: number) =>
      request<{fed_uid: number; count: number; teams: import('./api-types').TagTeam[]}>(
        `/tagteams${fed_uid ? `?fed_uid=${fed_uid}` : ''}`
      ),
  },
  stables: {
    list: (fed_uid?: number) =>
      request<{fed_uid: number; count: number; stables: import('./api-types').Stable[]}>(
        `/stables${fed_uid ? `?fed_uid=${fed_uid}` : ''}`
      ),
  },
  finance: {
    summary: (fed_uid?: number) =>
      request<FinanceSummary>(`/finance/summary${fed_uid ? `?fed_uid=${fed_uid}` : ''}`),
    history: (fed_uid?: number) =>
      request<FinanceHistory>(`/finance/history${fed_uid ? `?fed_uid=${fed_uid}` : ''}`),
    breakdown: (fed_uid?: number) =>
      request<FinanceBreakdown>(`/finance/breakdown${fed_uid ? `?fed_uid=${fed_uid}` : ''}`),
    wages: (fed_uid?: number) =>
      request<WageBill>(`/finance/wages${fed_uid ? `?fed_uid=${fed_uid}` : ''}`),
    standing: (fed_uid?: number) =>
      request<FinanceStanding>(`/finance/standing${fed_uid ? `?fed_uid=${fed_uid}` : ''}`),
  },
  views: {
    list: () => request<{views: ViewSummary[]}>('/views'),
    get: (id: string) => request<View>(`/views/${encodeURIComponent(id)}`),
    create: (name: string, description = '') =>
      request<{ok: boolean; view: View}>('/views', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, description}),
      }),
    update: (id: string, data: {name?: string; description?: string; pages?: ViewPage[]}) =>
      request<{ok: boolean; view: View}>(`/views/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ok: boolean}>(`/views/${encodeURIComponent(id)}`, {method: 'DELETE'}),
  },
  schedule: {
    list: (fed_uid?: number, weeks = 13) =>
      request<ScheduleData>(`/schedule?weeks=${weeks}${fed_uid ? `&fed_uid=${fed_uid}` : ''}`),
  },
  cards: {
    list: (fed_uid?: number) =>
      request<{cards: CardSummary[]}>(`/cards${fed_uid ? `?fed_uid=${fed_uid}` : ''}`),
    get: (id: string) => request<ShowCard>(`/cards/${encodeURIComponent(id)}`),
    getByShow: (showType: string, showUid: number, showDate: string) =>
      request<ShowCard | null>(`/cards/by-show?show_type=${showType}&show_uid=${showUid}&show_date=${encodeURIComponent(showDate)}`),
    create: (data: {showType: string; showUid: number; showName: string; showDate: string; fedUid: number}) =>
      request<{ok: boolean; card: ShowCard}>('/cards', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
      }),
    update: (id: string, data: {segments?: CardSegment[]; notes?: string}) =>
      request<{ok: boolean; card: ShowCard}>(`/cards/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ok: boolean}>(`/cards/${encodeURIComponent(id)}`, {method: 'DELETE'}),
  },
  show_history: {
    list: (fed_uid?: number, limit = 50) =>
      request<{shows: PastShow[]; count: number}>(`/show_history?limit=${limit}${fed_uid ? `&fed_uid=${fed_uid}` : ''}`),
  },
  plannedStorylines: {
    list: () => request<{storylines: PlannedStoryline[]}>('/storylines/planned'),
    get: (id: string) => request<PlannedStoryline>(`/storylines/planned/${encodeURIComponent(id)}`),
    create: (name: string, notes = '') =>
      request<{ok: boolean; storyline: PlannedStoryline}>('/storylines/planned', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, notes}),
      }),
    update: (id: string, data: {name?: string; notes?: string; workers?: number[]}) =>
      request<{ok: boolean; storyline: PlannedStoryline}>(`/storylines/planned/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ok: boolean}>(`/storylines/planned/${encodeURIComponent(id)}`, {method: 'DELETE'}),
  },
  workspace: {
    get: () => request<{pages: {id: string; label: string}[]; layouts: Record<string, any>}>('/workspace'),
    save: (pages: {id: string; label: string}[], layouts: Record<string, any>) =>
      request<{ok: boolean}>('/workspace', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({pages, layouts}),
      }),
  },
  profiles: {
    list: () => request<{profiles: {id: string; name: string; mdbPath: string; imagePath: string}[]}>('/profiles'),
    create: (name: string, mdbPath: string, imagePath = '') =>
      request<{ok: boolean; profile: any}>('/profiles', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, mdbPath, imagePath}),
      }),
    delete: (id: string) =>
      request<{ok: boolean}>(`/profiles/${encodeURIComponent(id)}`, {method: 'DELETE'}),
    switch: (id: string) =>
      request<{ok: boolean; path: string; imagePath: string}>(`/profiles/${encodeURIComponent(id)}/switch`, {method: 'POST'}),
  },
  storylines: {
    cross: (fed_uid?: number) =>
      request<StorylinesCrossData>(`/storylines/cross${fed_uid ? `?fed_uid=${fed_uid}` : ''}`),
  },
}

export interface StorylinesCrossData {
  storylines: StorylineCol[]
  shows: StorylineShowRow[]
}

export interface StorylineCol {
  uid: number; name: string; heat: number; description: string; furthered: boolean
  workers: { uid: number; name: string; picture: string; major: boolean; alignment: number }[]
}

export interface StorylineShowRow {
  uid: string; type: string; show_uid?: number; name: string; date: string
  logo: string; is_upcoming: boolean; is_tv?: boolean; overall_rating?: number
  segments?: { uid: number; log_entry: string; rating: number; match_type: number; worker_uids: number[]; storyline_uids: number[]; pre_show: boolean }[]
}
