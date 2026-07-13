from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from regions import REGION_TO_AREA, REGION_NAMES

# ---------- Helper: preserve all DB columns ----------

def row_kwargs(row: dict, **typed) -> dict:
    """Return all row columns plus typed overrides, for use with extra='allow'."""
    kwargs = dict(row)
    kwargs.update(typed)
    return kwargs

# ---------- Rating conversion utilities ----------

def scale_to_pct(value: int) -> int:
    """Convert TEW 0-1000 scale to 0-100 percentage."""
    return round(value / 10)

def scale_to_grade(value: int) -> str:
    """Convert TEW 0-1000 scale to letter grade (FM-style)."""
    if value >= 950: return "A*"
    if value >= 900: return "A"
    if value >= 850: return "A-"
    if value >= 800: return "B+"
    if value >= 750: return "B"
    if value >= 700: return "B-"
    if value >= 650: return "C+"
    if value >= 600: return "C"
    if value >= 550: return "C-"
    if value >= 500: return "D+"
    if value >= 450: return "D"
    if value >= 400: return "D-"
    if value >= 350: return "E+"
    if value >= 300: return "E"
    if value >= 200: return "E-"
    if value >= 100: return "F+"
    return "F"

class RatingDisplay(BaseModel):
    raw: int = 0
    pct: int = 0
    grade: str = "F"

    @classmethod
    def from_raw(cls, value: int) -> "RatingDisplay":
        return cls(raw=value, pct=scale_to_pct(value), grade=scale_to_grade(value))


# ---------- Worker ----------

GENDER_MAP = {0: "Unchanged", 1: "Male", 2: "Male", 3: "Non-Binary", 4: "Male", 5: "Female", 6: "Trans", 7: "Non-Binary", 8: "Female"}
STYLE_MAP = {
    0: "Regular", 1: "Brawler", 2: "Technical", 3: "Puro-Joshi",
    4: "Puroresu", 5: "Cruiserweight", 6: "Luchadore", 7: "Entertainer",
    8: "Comedy", 9: "MMA", 10: "Psychopath", 11: "Hardcore",
    12: "Old School Face", 13: "Old School Heel", 14: "Manager",
    15: "Announcer", 16: "Colour", 17: "None"
}
POSITION_PREFIXES = ["Position_Wrestler", "Position_Occasional", "Position_Referee",
                     "Position_Announcer", "Position_Colour", "Position_Manager",
                     "Position_Personality", "Position_Roadagent"]

def get_positions(row: dict) -> list[str]:
    pos_names = ["Wrestler", "Occasional", "Referee", "Announcer", "Colour",
                 "Manager", "Personality", "Road Agent"]
    return [name for name, prefix in zip(pos_names, POSITION_PREFIXES) if row.get(prefix, False)]


class WorkerSkills(BaseModel):
    model_config = ConfigDict(extra='allow')
    brawl: RatingDisplay = RatingDisplay()
    air: RatingDisplay = RatingDisplay()
    technical: RatingDisplay = RatingDisplay()
    power: RatingDisplay = RatingDisplay()
    athletic: RatingDisplay = RatingDisplay()
    stamina: RatingDisplay = RatingDisplay()
    psych: RatingDisplay = RatingDisplay()
    basics: RatingDisplay = RatingDisplay()
    toughness: RatingDisplay = Field(default=RatingDisplay(), alias="tough")
    selling: RatingDisplay = Field(default=RatingDisplay(), alias="sell")
    charisma: RatingDisplay = RatingDisplay()
    mic: RatingDisplay = RatingDisplay()
    menace: RatingDisplay = RatingDisplay()
    respect: RatingDisplay = RatingDisplay()
    reputation: RatingDisplay = RatingDisplay()
    safety: RatingDisplay = RatingDisplay()
    looks: RatingDisplay = RatingDisplay()
    star: RatingDisplay = RatingDisplay()
    consistency: RatingDisplay = RatingDisplay()
    acting: RatingDisplay = Field(default=RatingDisplay(), alias="act")
    injury: RatingDisplay = RatingDisplay()
    puroresu: RatingDisplay = RatingDisplay()
    hardcore: RatingDisplay = RatingDisplay()
    flash: RatingDisplay = RatingDisplay()
    announcing: RatingDisplay = RatingDisplay()
    colour: RatingDisplay = RatingDisplay()
    refereeing: RatingDisplay = RatingDisplay()
    experience: RatingDisplay = RatingDisplay()

    @classmethod
    def from_db_row(cls, row: dict) -> "WorkerSkills":
        return cls(**row_kwargs(row,
            brawl=RatingDisplay.from_raw(row.get("Brawl", 0)),
            air=RatingDisplay.from_raw(row.get("Air", 0)),
            technical=RatingDisplay.from_raw(row.get("Technical", 0)),
            power=RatingDisplay.from_raw(row.get("Power", 0)),
            athletic=RatingDisplay.from_raw(row.get("Athletic", 0)),
            stamina=RatingDisplay.from_raw(row.get("Stamina", 0)),
            psych=RatingDisplay.from_raw(row.get("Psych", 0)),
            basics=RatingDisplay.from_raw(row.get("Basics", 0)),
            tough=RatingDisplay.from_raw(row.get("Tough", 0)),
            sell=RatingDisplay.from_raw(row.get("Sell", 0)),
            charisma=RatingDisplay.from_raw(row.get("Charisma", 0)),
            mic=RatingDisplay.from_raw(row.get("Mic", 0)),
            menace=RatingDisplay.from_raw(row.get("Menace", 0)),
            respect=RatingDisplay.from_raw(row.get("Respect", 0)),
            reputation=RatingDisplay.from_raw(row.get("Reputation", 0)),
            safety=RatingDisplay.from_raw(row.get("Safety", 0)),
            looks=RatingDisplay.from_raw(row.get("Looks", 0)),
            star=RatingDisplay.from_raw(row.get("Star", 0)),
            consistency=RatingDisplay.from_raw(row.get("Consistency", 0)),
            act=RatingDisplay.from_raw(row.get("Act", 0)),
            injury=RatingDisplay.from_raw(row.get("Injury", 0)),
            puroresu=RatingDisplay.from_raw(row.get("Puroresu", 0)),
            hardcore=RatingDisplay.from_raw(row.get("Hardcore", 0)),
            flash=RatingDisplay.from_raw(row.get("Flash", 0)),
            announcing=RatingDisplay.from_raw(row.get("Announcing", 0)),
            colour=RatingDisplay.from_raw(row.get("Colour", 0)),
            refereeing=RatingDisplay.from_raw(row.get("Refereeing", 0)),
            experience=RatingDisplay.from_raw(row.get("Experience", 0)),
        ))


def _decode_condition(raw) -> int:
    if raw is None or raw == -1:
        return 100
    return max(0, raw // 10)

class WorkerPhysical(BaseModel):
    model_config = ConfigDict(extra='allow')
    fatigue: RatingDisplay = RatingDisplay()
    ringrust: RatingDisplay = RatingDisplay()
    condition1: int = 0
    condition2: int = 0
    condition3: int = 0
    condition4: int = 0

    @classmethod
    def from_db_row(cls, row: dict) -> "WorkerPhysical":
        return cls(**row_kwargs(row,
            fatigue=RatingDisplay.from_raw(row.get("Fatigue", 0)),
            ringrust=RatingDisplay.from_raw(row.get("Ringrust", 0)),
            condition1=_decode_condition(row.get("Condition1")),
            condition2=_decode_condition(row.get("Condition2")),
            condition3=_decode_condition(row.get("Condition3")),
            condition4=_decode_condition(row.get("Condition4")),
        ))


class WorkerContract(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    worker_uid: int
    name: str
    fed_uid: int
    amount: int
    downside: int = 0
    written: bool = True
    exclusive: bool = True
    days_left: int = 0
    length: int = 0
    face: bool = True
    brand: int = 0
    competes_in: int = 0
    positions: list[str] = []
    merch: int = 0
    contract_momentum: RatingDisplay = RatingDisplay()
    leaving: bool = False
    on_loan: bool = False
    developmental: bool = False
    travel: int = 0
    picture: str = ""
    perception: int = 0

    @classmethod
    def from_db_row(cls, row: dict) -> "WorkerContract":
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            worker_uid=row.get("WorkerUID", 0),
            name=row.get("Name", ""),
            fed_uid=row.get("FedUID", 0),
            amount=row.get("Amount", 0),
            downside=row.get("Downside", 0),
            written=bool(row.get("WrittenContract", True)),
            exclusive=bool(row.get("ExclusiveContract", True)),
            days_left=row.get("Daysleft", 0),
            length=row.get("Length", 0),
            face=bool(row.get("Face", True)),
            brand=row.get("Brand", 0),
            competes_in=row.get("CompetesIn", 0),
            positions=get_positions(row),
            merch=row.get("Merch", 0),
            contract_momentum=RatingDisplay.from_raw(row.get("ContractMomentum", 0)),
            leaving=bool(row.get("Leaving", False)),
            on_loan=bool(row.get("OnLoan", False)),
            developmental=bool(row.get("Developmental", False)),
            travel=row.get("Travel", 0),
            picture=row.get("Picture", ""),
            perception=row.get("Perception", 0),
        ))


class OvernessEntry(BaseModel):
    region: int
    value: RatingDisplay = RatingDisplay()


class WinLoss(BaseModel):
    model_config = ConfigDict(extra='allow')
    wins: int = 0
    losses: int = 0
    draws: int = 0


class StorylineAssignment(BaseModel):
    model_config = ConfigDict(extra='allow')
    storyline_uid: int = 0
    storyline_name: str = ""
    heat: RatingDisplay = RatingDisplay()
    major_role: bool = False
    involved_with: list[dict] = []


class WorkerPerformance(BaseModel):
    model_config = ConfigDict(extra='allow')
    avg_match_rating: RatingDisplay = RatingDisplay()
    avg_angle_rating: RatingDisplay = RatingDisplay()
    avg_segment_rating: RatingDisplay = RatingDisplay()
    best_match_rating: int = 0
    worst_match_rating: int = 0
    best_angle_rating: int = 0
    worst_angle_rating: int = 0
    best_segment_rating: int = 0
    worst_segment_rating: int = 0
    best_segment_info: dict = {}
    worst_segment_info: dict = {}
    best_match_info: dict = {}
    worst_match_info: dict = {}
    best_angle_info: dict = {}
    worst_angle_info: dict = {}
    last_5_match_ratings: list[dict] = []
    last_5_angle_ratings: list[dict] = []
    last_5_segment_ratings: list[dict] = []
    total_matches: int = 0
    total_angles: int = 0
    total_segments: int = 0
    avg_duration: int = 0
    total_duration: int = 0


class TagTeamInfo(BaseModel):
    model_config = ConfigDict(extra='allow')
    name: str = ""
    partner_name: str = ""
    partner_uid: int = 0
    experience: int = 0


class TagTeam(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    name: str
    fed_uid: int = 0
    worker1: int = 0
    worker2: int = 0
    worker1_name: str = ""
    worker2_name: str = ""
    worker1_picture: str = ""
    worker2_picture: str = ""
    experience: int = 0
    pop: int = 0
    momentum: int = 0

    @classmethod
    def from_db_row(cls, row: dict) -> "TagTeam":
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            name=row.get("Name", ""),
            fed_uid=row.get("Fed", 0),
            worker1=row.get("Worker1", 0),
            worker2=row.get("Worker2", 0),
            experience=row.get("Experience", 0),
        ))


class StableInfo(BaseModel):
    model_config = ConfigDict(extra='allow')
    name: str = ""
    leader: bool = False


class ChemistryInfo(BaseModel):
    model_config = ConfigDict(extra='allow')
    worker_name: str = ""
    worker_uid: int = 0
    chemistry: int = 0  # 1=positive, -1=negative


class Worker(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    name: str
    short_name: str
    gender: str = "Male"
    style: str = "Regular"
    active: bool = True
    non_wrestler: bool = False
    freelance: bool = False
    age: int = 0
    nationality: int = 0
    based_in: int = 0
    positions: list[str] = []
    skills: Optional[WorkerSkills] = None
    physical: Optional[WorkerPhysical] = None
    contract: Optional[WorkerContract] = None
    overness: list[OvernessEntry] = []
    pop: RatingDisplay = RatingDisplay()
    home_area: str = ""
    home_region: str = ""
    win_loss: WinLoss = WinLoss()
    loyalty: Optional[str] = None
    dead: bool = False
    retired: bool = False
    mask: bool = False
    career_goal: int = 0
    picture: str = ""
    status: list[str] = []
    storylines: list[StorylineAssignment] = []
    performance: Optional[WorkerPerformance] = None
    tag_teams: list[TagTeamInfo] = []
    stables: list[StableInfo] = []
    chemistry: list[ChemistryInfo] = []
    injury_count: int = 0
    contract_status: str = "none"
    contract_expiry_days: int = 0
    company_area_pop: int = 0
    roster_avg_primary: int = 0
    roster_avg_ent: int = 0
    roster_avg_psych: int = 0
    roster_avg_fund: int = 0
    roster_avg_stamina: int = 0
    roster_avg_pop: int = 0
    belt_history: list[dict] = []
    moves: list[dict] = []

    @classmethod
    def from_db_row(cls, row: dict) -> "Worker":
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            name=row.get("Name", ""),
            short_name=row.get("Shortname", ""),
            gender=GENDER_MAP.get(row.get("Gender", 1), "Male"),
            style=STYLE_MAP.get(row.get("Style", 0), "Regular"),
            active=bool(row.get("Active", True)),
            non_wrestler=bool(row.get("NonWrestler", False)),
            freelance=bool(row.get("Freelance", False)),
            age=row.get("Age_Matures", 0),
            nationality=row.get("Nationality", 0),
            based_in=row.get("Based_In", 0),
            positions=get_positions(row),
            loyalty=str(row.get("Loyalty")) if row.get("Loyalty") and row["Loyalty"] != -1 else None,
            dead=bool(row.get("Dead", False)),
            retired=bool(row.get("Retired", False)),
            mask=bool(row.get("Mask", False)),
            career_goal=row.get("CareerGoal", 0),
            picture=row.get("Picture", ""),
        ))


# ---------- Federation ----------

SIZE_MAP = {1: "Local", 2: "Small", 3: "Medium", 4: "Large", 5: "National",
            6: "International", 7: "Global", 8: "Cult", 9: "Regional", 10: "Tiny", 11: "Failed"}

class Federation(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    name: str
    initials: str
    size: int
    size_label: str = ""
    money: int = 0
    prestige: RatingDisplay = RatingDisplay()
    influence: int = 0
    momentum: RatingDisplay = RatingDisplay()
    user_controlled: bool = False
    based_in: int = 0
    home_area: str = ""
    ranking: int = 0
    ranking_rating: int = 0
    worker_count: int = 0
    logo: str = ""

    @classmethod
    def from_db_row(cls, row: dict) -> "Federation":
        s = row.get("Size", 1)
        bi = row.get("Based_In", 0)
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            name=row.get("Name", ""),
            initials=row.get("Initials", ""),
            size=s,
            size_label=SIZE_MAP.get(s, f"Size {s}"),
            money=row.get("Money", 0),
            prestige=RatingDisplay.from_raw(row.get("Prestige", 0)),
            influence=row.get("Influence", 0),
            momentum=RatingDisplay.from_raw(row.get("Momentum", 0)),
            user_controlled=bool(row.get("User_Controlled", False)),
            based_in=bi,
            home_area=REGION_TO_AREA.get(bi, ""),
            ranking=row.get("Ranking", 0),
            ranking_rating=row.get("RankingRating", 0),
            logo=row.get("Logo", ""),
        ))


class Stable(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    name: str
    fed_uid: int = 0
    active: bool = True
    members: list[dict] = []

    @classmethod
    def from_db_row(cls, row: dict) -> "Stable":
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            name=row.get("Name", ""),
            fed_uid=row.get("Fed", 0),
            active=bool(row.get("Active", True)),
        ))


# ---------- Belt ----------

BELT_STYLE_MAP = {1: "Singles", 2: "Tag Team", 3: "Trios"}
BELT_LEVEL_MAP = {1: "World", 2: "Midcard", 3: "Lower Card", 4: "Divisional"}

class Belt(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    name: str
    fed_uid: int
    style: str = "Singles"
    level: str = "World"
    prestige: RatingDisplay = RatingDisplay()
    active: bool = True
    holder1: int = 0
    holder2: int = 0
    brand: int = 0
    defences: int = 0
    belt_level: int = 0
    picture: str = ""

    @classmethod
    def from_db_row(cls, row: dict) -> "Belt":
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            name=row.get("Name", ""),
            fed_uid=row.get("Fed", 0),
            style=BELT_STYLE_MAP.get(row.get("Style", 1), "Singles"),
            level=BELT_LEVEL_MAP.get(row.get("BeltLevel", 1), "World"),
            prestige=RatingDisplay.from_raw(row.get("Prestige", 0)),
            active=bool(row.get("Active", True)),
            holder1=row.get("Holder1", 0),
            holder2=row.get("Holder2", 0),
            brand=row.get("Brand", 0),
            defences=row.get("Defences", 0),
            belt_level=row.get("BeltLevel", 1),
            picture=row.get("Picture", ""),
        ))


# ---------- Game Info ----------

class GameInfo(BaseModel):
    model_config = ConfigDict(extra='allow')
    current_date: Optional[str] = None
    start_date: Optional[str] = None
    turn: int = 0
    player_fed_uid: int = 0
    player_worker_uid: int = 0
    stage: int = 0


# ---------- Narrative ----------

class Narrative(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    importance: int = 0


# ---------- Storyline ----------

class Storyline(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    fed_uid: int
    name: str
    heat: RatingDisplay = RatingDisplay()
    start_date: Optional[str] = None
    furthered: bool = False
    analysis: bool = False

    @classmethod
    def from_db_row(cls, row: dict) -> "Storyline":
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            fed_uid=row.get("FedUID", 0),
            name=row.get("Name", ""),
            heat=RatingDisplay.from_raw(row.get("Heat", 0)),
            start_date=str(row.get("StoryStartDate")) if row.get("StoryStartDate") else None,
            furthered=bool(row.get("Furthered", False)),
            analysis=bool(row.get("Analysis", False)),
        ))
