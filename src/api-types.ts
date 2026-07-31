// Auto-generated from python/models.py � do not edit directly
// Run: py scripts/generate_types.py > src/api-types.ts

export interface RatingDisplay {
  raw: number;
  pct: number;
  grade: string;
}

export interface WorkerSkills {
  brawl: RatingDisplay;
  air: RatingDisplay;
  technical: RatingDisplay;
  power: RatingDisplay;
  athletic: RatingDisplay;
  stamina: RatingDisplay;
  psych: RatingDisplay;
  basics: RatingDisplay;
  toughness: RatingDisplay;
  selling: RatingDisplay;
  charisma: RatingDisplay;
  mic: RatingDisplay;
  menace: RatingDisplay;
  respect: RatingDisplay;
  reputation: RatingDisplay;
  safety: RatingDisplay;
  looks: RatingDisplay;
  star: RatingDisplay;
  consistency: RatingDisplay;
  acting: RatingDisplay;
  injury: RatingDisplay;
  puroresu: RatingDisplay;
  hardcore: RatingDisplay;
  flash: RatingDisplay;
  announcing: RatingDisplay;
  colour: RatingDisplay;
  refereeing: RatingDisplay;
  experience: RatingDisplay;
}

export interface WorkerPhysical {
  fatigue: RatingDisplay;
  ringrust: RatingDisplay;
  condition1: number;
  condition2: number;
  condition3: number;
  condition4: number;
}

export interface WorkerContract {
  uid: number;
  worker_uid: number;
  name: string;
  fed_uid: number;
  amount: number;
  downside: number;
  written: boolean;
  exclusive: boolean;
  days_left: number;
  length: number;
  face: boolean;
  brand: number;
  competes_in: number;
  positions: string[];
  merch: number;
  contract_momentum: RatingDisplay;
  leaving: boolean;
  on_loan: boolean;
  developmental: boolean;
  travel: number;
  picture: string;
  perception: number;
}

export interface OvernessEntry {
  region: number;
  value: RatingDisplay;
}

export interface WinLoss {
  wins: number;
  losses: number;
  draws: number;
}

export interface StorylineAssignment {
  storyline_uid: number;
  storyline_name: string;
  heat: RatingDisplay;
  major_role: boolean;
  involved_with: { uid: number; name: string; alignment: number; major_role: boolean }[];
}

export interface WorkerPerformance {
  avg_match_rating: RatingDisplay;
  avg_angle_rating: RatingDisplay;
  avg_segment_rating: RatingDisplay;
  best_match_rating: number;
  worst_match_rating: number;
  best_angle_rating: number;
  worst_angle_rating: number;
  best_segment_rating: number;
  worst_segment_rating: number;
  best_segment_info: { rating: number; log_entry: string; label: string; card: string };
  worst_segment_info: { rating: number; log_entry: string; label: string; card: string };
  best_match_info: { rating: number; log_entry: string; label: string; card: string };
  worst_match_info: { rating: number; log_entry: string; label: string; card: string };
  best_angle_info: { rating: number; log_entry: string; label: string; card: string };
  worst_angle_info: { rating: number; log_entry: string; label: string; card: string };
  last_5_match_ratings: { rating: number; label: string; card: string; log_entry: string }[];
  last_5_angle_ratings: { rating: number; label: string; card: string; log_entry: string }[];
  last_5_segment_ratings: { rating: number; label: string; card: string; log_entry: string }[];
  total_matches: number;
  total_angles: number;
  total_segments: number;
  avg_duration: number;
  total_duration: number;
}

export interface TagTeamInfo {
  name: string;
  partner_name: string;
  partner_uid: number;
  experience: number;
}

export interface TagTeam {
  uid: number;
  name: string;
  fed_uid: number;
  worker1: number;
  worker2: number;
  worker1_name: string;
  worker2_name: string;
  worker1_picture: string;
  worker2_picture: string;
  experience: number;
  pop: number;
  momentum: number;
  active?: boolean;
}

export interface StableInfo {
  name: string;
  leader: boolean;
}

export interface ChemistryInfo {
  worker_name: string;
  worker_uid: number;
  chemistry: number;
}

export interface Worker {
  uid: number;
  name: string;
  short_name: string;
  gender: string;
  style: string;
  active: boolean;
  non_wrestler: boolean;
  freelance: boolean;
  age: number;
  nationality: number;
  based_in: number;
  positions: string[];
  skills?: WorkerSkills | null;
  physical?: WorkerPhysical | null;
  contract?: WorkerContract | null;
  overness: OvernessEntry[];
  pop: RatingDisplay;
  home_area: string;
  home_region: string;
  win_loss: WinLoss;
  loyalty?: string | null;
  dead: boolean;
  retired: boolean;
  mask: boolean;
  career_goal: number;
  picture: string;
  status: string[];
  storylines: StorylineAssignment[];
  performance?: WorkerPerformance | null;
  tag_teams: TagTeamInfo[];
  stables: StableInfo[];
  chemistry: ChemistryInfo[];
  injury_count: number;
  contract_status: string;
  current_score: number;
  potential_score: number;
  current_stars: number;
  potential_stars: number;
  worker_type: string;
  usage_label: string;
  potential_usage_label: string;
  age_prefix: string;
  is_banged_up: boolean;
  is_wrestler: boolean;
  pillar_primary: number;
  pillar_perf: number;
  pillar_pop: number;
  pillar_max_region_pop: number;
  pillar_local_pop: number;
  perf_score: number;
  contract_expiry_days: number;
  player_fed_uid: number;
  company_area_pop: number;
  roster_avg_primary: number;
  roster_avg_ent: number;
  roster_avg_psych: number;
  roster_avg_fund: number;
  roster_avg_stamina: number;
  roster_avg_pop: number;
  belt_history: { belt_uid: number; belt_name: string; belt_picture: string; captured: string; lost: string; defences: number }[];
  moves: { name: string; desc: string; level: number }[];
  bio?: string;
  home_region_pop?: RatingDisplay;
  Gender?: number;
  all_fed_ids?: number[];
  attributes?: number[];
  Business?: number;
  Booking_Reputation?: number;
  Booking_Skill?: number;
}

export interface Federation {
  uid: number;
  name: string;
  initials: string;
  size: number;
  size_label: string;
  money: number;
  prestige: RatingDisplay;
  influence: number;
  momentum: RatingDisplay;
  user_controlled: boolean;
  based_in: number;
  home_area: string;
  ranking: number;
  ranking_rating: number;
  worker_count: number;
  logo: string;
}

export interface Stable {
  uid: number;
  name: string;
  fed_uid: number;
  active: boolean;
  members: { uid: number; name: string; picture: string; leader: boolean }[];
}

export interface Belt {
  uid: number;
  name: string;
  fed_uid: number;
  style: string;
  level: string;
  prestige: RatingDisplay;
  active: boolean;
  holder1: number;
  holder2: number;
  holder3?: number;
  brand: number;
  defences: number;
  belt_level: number;
  picture: string;
  bio?: string;
  belt_captured?: string;
  prestige_history?: number[];
}

export interface BeltHistoryEntry {
  holders: { uid: number; name: string; picture: string }[];
  captured: string;
  lost: string;
  defences?: number;
  team_name?: string;
}

export interface BeltHistoryGroup {
  belt_uid: number;
  belt_name: string;
  belt_picture: string;
  entries: BeltHistoryEntry[];
}

export interface GameInfo {
  current_date?: string | null;
  start_date?: string | null;
  turn: number;
  player_fed_uid: number;
  player_worker_uid: number;
  stage: number;
}

export interface Narrative {
  uid: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  importance: number;
}

export interface Storyline {
  uid: number;
  fed_uid: number;
  name: string;
  heat: RatingDisplay;
  start_date?: string | null;
  furthered: boolean;
  analysis: boolean;
}

