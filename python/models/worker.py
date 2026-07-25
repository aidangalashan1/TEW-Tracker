"""The Worker aggregate and its component models (skills, contract,
performance, tag/stable/chemistry/storyline sub-objects)."""
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from .base import RatingDisplay, WorkerPhysical, OvernessEntry, WinLoss, row_kwargs

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


class StableInfo(BaseModel):
    model_config = ConfigDict(extra='allow')
    name: str = ""
    leader: bool = False


class ChemistryInfo(BaseModel):
    model_config = ConfigDict(extra='allow')
    worker_name: str = ""
    worker_uid: int = 0
    chemistry: int = 0  # signed strength: >0 = good chemistry, <0 = bad


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
    current_score: int = 0
    potential_score: int = 0
    current_stars: float = 0.5
    potential_stars: float = 0.5
    worker_type: str = ""
    usage_label: str = ""
    potential_usage_label: str = ""
    age_prefix: str = ""
    is_banged_up: bool = False
    is_wrestler: bool = False
    pillar_primary: int = 0
    pillar_perf: int = 0
    pillar_pop: int = 0
    perf_score: int = 0
    belt_history: list[dict] = []
    moves: list[dict] = []
    bio: str = ""

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
