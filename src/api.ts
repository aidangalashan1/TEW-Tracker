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
  id?: string
  type: 'match' | 'angle' | 'battle-royal'
  order: number
  workers: number[]
  sides: number[][]
  description: string
  notes: string
  storyline?: string
  saved?: boolean
  linked_planned_storyline_id?: string | null
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
  title1: number
  title2: number
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

export interface DiaryLinkedShow {
  showType: string; showUid: number; showName: string; showDate: string;
}

/** How a competitor is represented in the vs.-line text — a plain name, or
 *  suppressed entirely because the worker images (governed separately by
 *  `showImages`) are doing the labeling instead. This does NOT control
 *  whether images show — that's `showImages`, independently. */
export type DiaryLabelMode = 'text' | 'image' | 'both'

/** Placeholder tokens substituted into `template` when a segment renders.
 *  Kept purely as documentation/autocomplete hints — the renderer accepts
 *  any of these appearing anywhere, any number of times, in the template. */
export const DIARY_TEMPLATE_TOKENS = ['{banner}', '{heading}', '{images}', '{vsLine}', '{rating}', '{notes}'] as const

export const DEFAULT_DIARY_TEMPLATE = '{banner}\n{heading}\n{images}\n{vsLine}\n{rating}\n{notes}'

/** Global formatting defaults for how the diary renders inserted segments.
 *  The structured fields (prefixes/suffixes, colors, separators) control
 *  what each piece of text looks like; `template` controls how those
 *  pieces are arranged — free-form, with arbitrary literal text/markup of
 *  the user's own around and between the placeholders, so nothing here
 *  locks a segment into one particular layout. Individual segments may
 *  override showImages/labelMode via their own fields; everything else
 *  applies uniformly. */
export interface DiaryStyleConfig {
  headingPrefix: string
  headingSuffix: string
  headingBold: boolean
  headingItalic: boolean
  headingUnderline: boolean
  headingColor: string   // '' = no color tag; otherwise any hex/color the user picks
  headingSize: number    // 0 = no size tag

  bodyPrefix: string
  bodySuffix: string
  bodyItalic: boolean
  bodyColor: string

  vsSeparator: string    // between sides, e.g. " vs. "
  sideSeparator: string  // between competitors on the same side, e.g. " & "

  ratingPrefix: string
  ratingSuffix: string

  autoAddWorkerImages: boolean
  showImages: boolean
  labelMode: DiaryLabelMode

  /** Free-form arrangement template using the {banner}/{heading}/{images}/
   *  {vsLine}/{rating}/{notes} placeholders — any order, any repeats, any
   *  literal text/markup mixed in. A line that's just an empty placeholder
   *  (e.g. an unused {banner}) is dropped rather than left as a gap. */
  template: string
}

export const DEFAULT_DIARY_STYLE: DiaryStyleConfig = {
  headingPrefix: '',
  headingSuffix: '',
  headingBold: true,
  headingItalic: false,
  headingUnderline: false,
  headingColor: '',
  headingSize: 0,

  bodyPrefix: '',
  bodySuffix: '',
  bodyItalic: false,
  bodyColor: '',

  vsSeparator: ' vs. ',
  sideSeparator: ' & ',

  ratingPrefix: 'Rating: ',
  ratingSuffix: '%',

  autoAddWorkerImages: false,
  showImages: false,
  labelMode: 'text',

  template: DEFAULT_DIARY_TEMPLATE,
}

/** A structured, re-editable record of a segment inserted into the diary
 *  body. The body always contains only the plain rendered text — no
 *  wrapper markup — so it's always safe to paste straight to a forum.
 *  Advanced Mode locates a segment for re-editing by its exact last-known
 *  `renderedText` rather than any inserted marker/tag. */
export interface DiarySegment {
  id: string
  heading: string
  notes: string
  vsLine: string
  rating: number
  competitors: PastShowCompetitor[]
  /** Relative image path (e.g. "Events/logo.png") for the show banner, if
   *  one was captured when this segment was inserted. */
  bannerImage: string | null
  /** Per-segment overrides of the global style; null = inherit. */
  showImages: boolean | null
  labelMode: DiaryLabelMode | null
  /** The exact text last rendered into the body for this segment — the
   *  anchor used to find and replace/remove it on a later edit. */
  renderedText: string
}

export interface DiarySummary {
  id: string; fedUid: number; title: string; date: string;
  format: 'bbcode' | 'markdown';
  linkedShows: DiaryLinkedShow[]; updated: string;
}

export interface DiaryEntry extends DiarySummary {
  body: string; created: string;
  styleConfig?: DiaryStyleConfig;
  segments?: DiarySegment[];
}

export type CollateralCategory = 'fed_logo' | 'show_logos' | 'roster' | 'custom'
export interface CollateralItem { name: string; path: string }
export type CollateralListing = Record<CollateralCategory, CollateralItem[]>

export interface ScheduleData {
  upcoming: UpcomingShow[]
  currentDate: string
}

export interface ShowRef {
  kind: 'past' | 'upcoming'
  ref_uid: number
  show_type: string
  show_date: string
  show_name: string
  show_logo?: string
}

export interface PlannedStoryline {
  id: string
  name: string
  workers: number[]
  notes: string
  start_show?: ShowRef | null
  end_show?: ShowRef | null
  archived?: boolean
  created: string
  updated: string
}

export interface PlannedStorylineLinks {
  arcs: { worker_uid: number; field: string; item_id: string; text: string }[]
  segments: LinkedSegment[]
}

export function imageUrl(relativePath: string): string {
  if (!relativePath) return ''
  const parts = relativePath.replace(/\\/g, '/').split('/')
  const encoded = parts.map(p => encodeURIComponent(p)).join('/')
  return `${API_BASE}/images/${encoded}`
}

/** `path` is a "category/filename" pair as returned by api.collateral.list(). */
export function collateralFileUrl(path: string): string {
  if (!path) return ''
  const parts = path.split('/')
  const encoded = parts.map(p => encodeURIComponent(p)).join('/')
  return `${API_BASE}/collateral/file/${encoded}`
}

export const api = {
  health: () => request<{status: string}>('/health'),

  game: {
    info: () => request<import('./api-types').GameInfo>('/game/info'),
    version: () => request<{version: number}>('/game/version'),
    refresh: () => request<{ok: boolean}>('/game/refresh', {method: 'POST'}),
  },

  roster: {
    all: (page = 1, limit = 200) =>
      request<{count: number; total: number; page: number; limit: number; workers: import('./api-types').Worker[]}>(
        `/roster/all?page=${page}&limit=${limit}`
      ),
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

  columns: {
    export: (data: string) =>
      request<{ok: boolean; cancelled: boolean; path?: string}>('/columns/export', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({data}),
      }),
    import: () =>
      request<{ok: boolean; cancelled: boolean; data?: string}>('/columns/import', {method: 'POST'}),
  },

  filters: {
    export: (data: string) =>
      request<{ok: boolean; cancelled: boolean; path?: string}>('/filters/export', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({data}),
      }),
    import: () =>
      request<{ok: boolean; cancelled: boolean; data?: string}>('/filters/import', {method: 'POST'}),
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
    player: () => request<import('./api-types').Federation | null>('/fed/player'),
    detail: (uid: number) => request<import('./api-types').Federation>(`/fed/${uid}`),
    all: () => request<{feds: import('./api-types').Federation[]}>('/feds'),
    belts: (uid: number) => request<{belts: import('./api-types').Belt[]}>(`/fed/${uid}/belts`),
    beltHistory: (uid: number, limit?: number) =>
      request<{history: import('./api-types').BeltHistoryGroup[]}>(`/fed/${uid}/belt-history${limit != null ? `?limit=${limit}` : ''}`),
    storylines: (uid: number) =>
      request<{storylines: import('./api-types').Storyline[]}>(`/fed/${uid}/storylines`),
    finances: (uid: number) => request<Record<string, number>>(`/fed/${uid}/finances`),
    overview: (uid: number) =>
      request<{fed: import('./api-types').Federation; belts: import('./api-types').Belt[]; storylines: import('./api-types').Storyline[]; finances: Record<string, number>}>(
        `/fed/${uid}/overview`
      ),
  },

  belt: {
    detail: (uid: number) => request<import('./api-types').Belt>(`/belt/${uid}`),
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
    tvDetail: (tvUid: number) => request<any>(`/schedule/tv/${tvUid}`),
    eventDetail: (cardUid: number) => request<any>(`/schedule/event/${cardUid}`),
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
    detail: (uid: number) => request<PastShow>(`/show_history/${uid}`),
  },
  diary: {
    list: (fed_uid?: number) =>
      request<{entries: DiarySummary[]}>(`/diary${fed_uid ? `?fed_uid=${fed_uid}` : ''}`),
    get: (id: string) => request<DiaryEntry>(`/diary/${encodeURIComponent(id)}`),
    create: (data: {fedUid: number; title?: string; date?: string; format?: string}) =>
      request<{ok: boolean; entry: DiaryEntry}>('/diary', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
      }),
    update: (id: string, data: {title?: string; date?: string; format?: string; body?: string; linkedShows?: DiaryLinkedShow[]; styleConfig?: DiaryStyleConfig; segments?: DiarySegment[]}) =>
      request<{ok: boolean; entry: DiaryEntry}>(`/diary/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ok: boolean}>(`/diary/${encodeURIComponent(id)}`, {method: 'DELETE'}),
  },
  collateral: {
    list: () => request<CollateralListing>('/collateral'),
    sync: (fedUid: number) =>
      request<{ok: boolean; copied: Record<string, number>}>(`/collateral/sync?fed_uid=${fedUid}`, { method: 'POST' }),
    reveal: (path: string) =>
      request<{ok: boolean}>('/collateral/reveal', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ path }),
      }),
    openFolder: (category: CollateralCategory) =>
      request<{ok: boolean}>(`/collateral/open-folder/${category}`, { method: 'POST' }),
  },
  plannedStorylines: {
    list: () => request<{storylines: PlannedStoryline[]}>('/storylines/planned'),
    get: (id: string) => request<PlannedStoryline>(`/storylines/planned/${encodeURIComponent(id)}`),
    links: (id: string) => request<PlannedStorylineLinks>(`/storylines/planned/${encodeURIComponent(id)}/links`),
    pastSegments: (id: string) => request<{segments: {date: string; show: string; text: string; rating?: number}[]}>(`/storylines/planned/${encodeURIComponent(id)}/past-segments`),
    create: (name: string, notes = '') =>
      request<{ok: boolean; storyline: PlannedStoryline}>('/storylines/planned', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, notes}),
      }),
    update: (id: string, data: {name?: string; notes?: string; workers?: number[]; start_show?: ShowRef | null; end_show?: ShowRef | null; archived?: boolean}) =>
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
    detail: (uid: number, fed_uid?: number) =>
      request<any>(`/storylines/${uid}${fed_uid ? `?fed_uid=${fed_uid}` : ''}`),
    ideas: (fed_uid?: number, worker_uid?: number) =>
      request<{feuds: StorylineIdea[]; alliances: StorylineIdea[]}>(`/storylines/ideas${fed_uid ? `?fed_uid=${fed_uid}` : ''}${worker_uid ? `&worker_uid=${worker_uid}` : ''}`),
  },
  arcs: {
    list: () => request<{arcs: Record<string, ArcData>}>('/arcs'),
    get: (worker_uid: number) => request<ArcData>(`/arcs/${worker_uid}`),
    update: (worker_uid: number, data: Partial<ArcData>) =>
      request<{ok: boolean; arc: ArcData}>(`/arcs/${worker_uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },
  system: {
    shutdown: () => request<{ok: boolean}>('/system/shutdown', {method: 'POST'}),
  },
}

export interface StorylinesCrossData {
  storylines: StorylineCol[]
  shows: StorylineShowRow[]
}

export interface StorylineIdea {
  worker_uid: number; name: string; picture: string; score: number; reasons: string[]
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

export type ArcStatus = 'planned' | 'in_progress' | 'done' | 'shelved'

export interface ArcItem {
  id: string
  text: string
  description?: string
  status: ArcStatus
  linked_belt_uid?: number | null
  linked_worker_uids: number[]
  linked_planned_storyline_ids: string[]
  linked_storyline_uids: number[]
  linked_segments: LinkedSegment[]
}

export interface LinkedSegment {
  card_id: string
  segment_id: string
}

export interface ArcData {
  character_profile?: string
  arcs?: ArcItem[]
  goals?: ArcItem[]
}
