"""Characterization tests for domains.worker.labels.usage_label's
International/Hidden detection — a worker whose skill/pop peaks in some
region other than the fed's home market shouldn't be scored down as if
they're simply unpopular."""
from models import Worker
from domains.worker.labels import usage_label


def _worker(**overrides) -> Worker:
    base = dict(uid=1, name="Test", short_name="T", age=25, positions=["Wrestler"], worker_type="Technician")
    base.update(overrides)
    return Worker(**base)


class TestInternational:
    def test_famous_abroad_and_unknown_at_home_is_international(self):
        # max_region_pop >= 70 (famous abroad) and local_pop < 40 (unknown
        # in the fed's home market) — exactly the case International exists
        # to catch: a poor home-pop score that undersells real ability.
        w = _worker(pillar_local_pop=20, pillar_max_region_pop=80, pillar_primary=50, pillar_perf=50)
        label = usage_label(w, stars=3, score=60)
        assert label == "International Technician"

    def test_famous_abroad_but_also_known_at_home_is_not_international(self):
        # Regression: the old logic only checked the foreign-vs-home *gap*
        # (max_region_pop > local_pop + 20), so a worker who's popular
        # everywhere — just even more popular abroad — used to qualify too.
        # International should require local_pop to be genuinely low, not
        # merely lower than their foreign peak.
        w = _worker(pillar_local_pop=45, pillar_max_region_pop=80, pillar_primary=50, pillar_perf=50)
        label = usage_label(w, stars=3, score=60)
        assert label != "International Technician"

    def test_unknown_everywhere_is_not_international(self):
        # local_pop is low, but so is max_region_pop — not "famous abroad",
        # just generally unknown.
        w = _worker(pillar_local_pop=20, pillar_max_region_pop=50, pillar_primary=50, pillar_perf=50)
        label = usage_label(w, stars=3, score=60)
        assert label != "International Technician"

    def test_best_region_being_the_home_region_disables_international(self):
        # Even though the raw numbers look "international" (high peak, low
        # local_pop wouldn't normally coexist with the peak region being
        # home — but a worker can be a mixed bag: only mediocre in their
        # nominal home area while still being the fed's best-known region
        # overall), the peak region being the fed's own home area means
        # there's no genuine foreign-vs-home gap.
        w = _worker(pillar_local_pop=20, pillar_max_region_pop=80, pillar_max_region_is_home=True,
                     pillar_primary=50, pillar_perf=50)
        label = usage_label(w, stars=3, score=60)
        assert label != "International Technician"

    def test_international_takes_priority_over_hidden(self):
        # Both conditions can technically overlap (a big skill/local_pop gap
        # alongside a big foreign_pop/local_pop gap); International wins.
        w = _worker(pillar_local_pop=10, pillar_max_region_pop=90, pillar_primary=90, pillar_perf=90)
        label = usage_label(w, stars=3, score=60)
        assert label == "International Technician"

    def test_hidden_is_now_hidden_gem(self):
        w = _worker(pillar_local_pop=20, pillar_primary=90, pillar_perf=90, pillar_max_region_pop=0)
        label = usage_label(w, stars=3, score=60)
        assert label == "Hidden Gem Technician"

    def test_international_complete_gets_a_noun_instead_of_reading_as_two_bare_adjectives(self):
        # "International Complete" has no noun at all — Complete/Well-Rounded
        # are compound nouns elsewhere (e.g. "Complete Midcarder"), not
        # adjectives, so stacking "International"/"Hidden Gem" in front needs
        # a standalone noun form just for this combination.
        w = _worker(worker_type="Complete", pillar_local_pop=20, pillar_max_region_pop=80, pillar_primary=50, pillar_perf=50)
        assert usage_label(w, stars=3, score=60) == "International Complete Package"

    def test_hidden_well_rounded_gets_a_noun_too(self):
        w = _worker(worker_type="Well-Rounded", pillar_local_pop=20, pillar_primary=90, pillar_perf=90, pillar_max_region_pop=0)
        assert usage_label(w, stars=3, score=60) == "Hidden Gem Well-Rounded Star"

    def test_hidden_gem_does_not_apply_to_workers_already_signed_to_the_player(self):
        # Hidden Gem is a scouting signal about talent the player hasn't
        # found yet — once they're already on the roster there's nothing
        # left to discover, regardless of the raw pop-gap numbers.
        w = _worker(pillar_local_pop=20, pillar_primary=90, pillar_perf=90, pillar_max_region_pop=0,
                     is_signed_to_player_fed=True)
        label = usage_label(w, stars=3, score=60)
        assert "Hidden Gem" not in label


class TestMainEventFlavorTiers:
    """The flat "Main Event {type}" label used to be every top guy's label
    regardless of age or title history. These tiers give the main-event
    bracket (score >= 70) genuine variety, checked most-specific/rarest
    first. age=35 ("Established") is used as the age-neutral baseline —
    neither is_young nor is_old — so each case only exercises the signal
    it's testing."""

    def test_dominant_long_reigning_champion_is_face_of_the_company(self):
        w = _worker(age=35, is_champion=True, max_title_defences=8)
        assert usage_label(w, stars=4, score=85) == "Face of the Company"

    def test_fed_ace_is_face_of_the_company_even_without_a_dominant_title_reign(self):
        # tblFed.Ace is the fed's designated figurehead, independent of the
        # current champion — this is a second route into the tier.
        w = _worker(age=35, is_champion=False, max_title_defences=0, is_fed_ace=True)
        assert usage_label(w, stars=4, score=85) == "Face of the Company"

    def test_veteran_multi_time_champion_is_a_living_legend(self):
        w = _worker(age=45, is_champion=False, title_reign_count=3)
        assert usage_label(w, stars=4, score=85) == "Living Legend"

    def test_three_time_champion_is_a_living_legend_even_when_not_old(self):
        # Regression: Living Legend/Legendary used to require is_old (age
        # >= 38) on top of the title pedigree, so a worker who racked up a
        # decorated career without yet crossing that age threshold (e.g.
        # started young and stayed on top for over a decade) fell all the
        # way through to a plain "Main Event {type}" instead — this is what
        # was actually happening to a 3x-world-champion worker reported as
        # showing "Well-Rounded Main Eventer". These tiers are about career
        # achievement, not current age.
        w = _worker(age=35, is_champion=False, title_reign_count=3)
        assert usage_label(w, stars=4, score=85) == "Living Legend"

    def test_young_elite_score_is_generational(self):
        w = _worker(age=22, is_champion=False)
        assert usage_label(w, stars=4.5, score=85) == "Generational Technician"

    def test_current_champion_without_a_long_reign_falls_through_to_plain_main_event(self):
        # "Reigning Champion" was removed as a tier — stacked with other
        # modifiers (International, Hidden Gem, Banged Up) it made labels
        # too long. A champion without a long enough reign for Face of the
        # Company just reads as an ordinary Main Eventer.
        w = _worker(age=35, is_champion=True, max_title_defences=2)
        assert usage_label(w, stars=4, score=85) == "Main Event Technician"

    def test_veteran_with_no_title_history_at_all_is_a_plain_veteran(self):
        # A veteran main eventer with zero world title reigns had a good
        # career, not a decorated or legendary one. "Elder Statesman" read
        # oddly for a working wrestler, so this fallback reuses the same
        # "Veteran {type}" wording the upper-midcard bracket uses.
        w = _worker(age=45, is_champion=False, title_reign_count=0,
                     total_title_reign_count=0, longest_primary_reign_days=0)
        assert usage_label(w, stars=4, score=75) == "Veteran Technician"

    def test_one_world_title_reign_is_decorated_not_legendary(self):
        # A Christian/Del Rio/Miz type — a genuine world champion, just not
        # a multi-reign or long-reign legend. This sits below Legendary.
        w = _worker(age=35, is_champion=False, title_reign_count=1,
                     total_title_reign_count=1, longest_primary_reign_days=100)
        assert usage_label(w, stars=4, score=75) == "Decorated Technician"

    def test_two_world_title_reigns_and_no_other_pedigree_is_decorated(self):
        # 2 world title reigns isn't enough for Legendary on its own — needs
        # one of the three explicit pedigree paths — but it's clearly more
        # than a plain veteran run, so it's Decorated rather than falling
        # all the way through.
        w = _worker(age=45, is_champion=False, title_reign_count=2,
                     total_title_reign_count=2, longest_primary_reign_days=100)
        assert usage_label(w, stars=4, score=75) == "Decorated Technician"

    def test_a_year_long_world_title_reign_is_legendary_even_when_not_old(self):
        w = _worker(age=35, is_champion=False, title_reign_count=1,
                     total_title_reign_count=1, longest_primary_reign_days=400)
        assert usage_label(w, stars=4, score=75) == "Legendary Technician"

    def test_six_total_reigns_and_two_world_titles_is_legendary_even_when_not_old(self):
        # A long, decorated career (6+ reigns across every title level)
        # counts too, as long as at least 2 of those were world titles.
        w = _worker(age=35, is_champion=False, title_reign_count=2,
                     total_title_reign_count=6, longest_primary_reign_days=100)
        assert usage_label(w, stars=4, score=75) == "Legendary Technician"

    def test_six_total_reigns_with_only_one_world_title_is_decorated_not_legendary(self):
        w = _worker(age=45, is_champion=False, title_reign_count=1,
                     total_title_reign_count=6, longest_primary_reign_days=100)
        assert usage_label(w, stars=4, score=75) == "Decorated Technician"

    def test_veteran_type_plain_veteran_fallback_does_not_duplicate_the_word(self):
        w = _worker(worker_type="Veteran", age=45, is_champion=False, title_reign_count=0,
                     total_title_reign_count=0, longest_primary_reign_days=0)
        label = usage_label(w, stars=4, score=75)
        assert label == "Veteran Main Eventer"


class TestIconTier:
    def test_ninety_plus_pop_is_icon(self):
        w = _worker(age=35, pop={"pct": 92})
        assert usage_label(w, stars=4, score=75) == "Icon"

    def test_below_ninety_pop_is_not_icon(self):
        w = _worker(age=35, pop={"pct": 89})
        label = usage_label(w, stars=4, score=75)
        assert "Icon" not in label

    def test_icon_outranks_legendary_pedigree(self):
        w = _worker(age=45, pop={"pct": 95}, title_reign_count=3)
        assert usage_label(w, stars=4, score=85) == "Icon"

    def test_face_of_the_company_still_outranks_icon(self):
        w = _worker(age=35, pop={"pct": 95}, is_champion=True, max_title_defences=8)
        assert usage_label(w, stars=4, score=85) == "Face of the Company"

    def test_icon_with_a_detected_style_still_reads_bare(self):
        w = _worker(age=35, worker_type="Complete", pop={"pct": 92})
        assert usage_label(w, stars=4, score=75) == "Icon"

    def test_young_but_not_elite_enough_is_breakout(self):
        w = _worker(age=22, is_champion=False)
        assert usage_label(w, stars=4, score=72) == "Breakout Technician"

    def test_breakout_workers_potential_label_is_the_established_version_not_breakout_again(self):
        # "Breakout" describes a young talent's current trajectory — showing
        # the same "Breakout" tag for their *potential* reads like they'll
        # forever be breaking out. The potential label should read as the
        # established worker they'd be once they get there.
        w = _worker(age=22, is_champion=False)
        current = usage_label(w, stars=4, score=72, is_potential=False)
        potential = usage_label(w, stars=4, score=72, is_potential=True)
        assert current == "Breakout Technician"
        assert potential == "Main Event Technician"
        assert "Breakout" not in potential

    def test_breakout_workers_potential_label_is_generational_when_score_is_high_enough(self):
        # At s >= 85 a young worker qualifies for Generational regardless of
        # is_potential — that's an even more established-reading label than
        # Breakout, so no separate handling is needed for this range.
        w = _worker(age=22, is_champion=False)
        potential = usage_label(w, stars=5, score=92, is_potential=True)
        assert potential == "Generational Technician"

    def test_prime_age_elite_score_non_champion_is_elite(self):
        w = _worker(age=35, is_champion=False)
        assert usage_label(w, stars=5, score=92) == "Elite Technician"

    def test_prime_age_ordinary_main_eventer_keeps_the_plain_label(self):
        w = _worker(age=35, is_champion=False)
        assert usage_label(w, stars=4, score=72) == "Main Event Technician"

    def test_face_of_the_company_takes_priority_over_every_other_signal(self):
        # Young, champion, long reign, elite score all at once — the rarest/
        # most prestigious tier wins, not the first-checked young/champion one.
        w = _worker(age=22, is_champion=True, max_title_defences=10, title_reign_count=1)
        assert usage_label(w, stars=5, score=95) == "Face of the Company"


class TestBangedUpIsAModifierNotAnOverride:
    # Regression: "Banged Up" used to fully replace the label with a flat
    # "Banged Up {type}" — an aging legend with a decorated title history
    # (e.g. a Tommy Cornell-style character) who's simply currently injured
    # would lose their Living Legend/Face of the Company status entirely and
    # just read as "Banged Up Technician", every time they were banged up.

    def test_banged_up_living_legend_keeps_the_living_legend_tier(self):
        w = _worker(age=45, is_champion=False, title_reign_count=3, is_banged_up=True)
        assert usage_label(w, stars=4, score=85) == "Banged Up Living Legend"

    def test_banged_up_ordinary_main_eventer_still_gets_the_prefix(self):
        w = _worker(age=35, is_champion=False, is_banged_up=True)
        assert usage_label(w, stars=4, score=72) == "Banged Up Main Event Technician"

    def test_not_banged_up_has_no_prefix(self):
        w = _worker(age=45, is_champion=False, title_reign_count=3, is_banged_up=False)
        assert usage_label(w, stars=4, score=85) == "Living Legend"


class TestCompleteWellRoundedTrailingNounForm:
    """Complete/Well-Rounded are compound nouns (used elsewhere as "Complete
    Midcarder"), not bare adjectives — trailing them directly after a prefix
    word with no noun of their own used to read as two stacked adjectives
    with nothing left to modify ("Generational Complete")."""

    def test_generational_complete_gets_a_noun(self):
        w = _worker(worker_type="Complete", age=22, is_champion=False)
        assert usage_label(w, stars=4.5, score=85) == "Generational Complete Package"

    def test_legendary_well_rounded_gets_a_noun(self):
        # Living Legend/Icon/Face of the Company stand alone with no style
        # suffix (see TestTopTiersStandAlone) — Legendary is one tier below
        # that and still keeps the trailing-noun-form fix.
        w = _worker(worker_type="Well-Rounded", age=45, is_champion=False,
                     title_reign_count=1, total_title_reign_count=1, longest_primary_reign_days=400)
        assert usage_label(w, stars=4, score=85) == "Legendary Well-Rounded Star"


class TestUndercardReplacesPreliminaryAndCurtainJerker:
    def test_low_score_young_or_prime_worker_is_undercard(self):
        w = _worker(age=35, worker_type="")
        label = usage_label(w, stars=1, score=25)
        assert label == "Undercard"
        assert "Preliminary" not in label
        assert "Curtain Jerker" not in label

    def test_undercard_with_a_type_gets_the_trailing_noun_form_too(self):
        w = _worker(worker_type="Complete", age=35)
        assert usage_label(w, stars=1, score=25) == "Undercard Complete Package"

    def test_undercard_reads_fine_with_a_monster_style(self):
        w = _worker(worker_type="Monster", age=35)
        assert usage_label(w, stars=1, score=25) == "Undercard Monster"


class TestVeteranTypeDoesNotDuplicate:
    # Regression: worker_type "Veteran" (a detect_style archetype, only ever
    # assigned when age >= 38) always coincides with the age-based is_old
    # check, which used to produce a literal "Veteran Veteran" in the
    # upper-midcard bracket.
    def test_veteran_type_upper_midcarder_does_not_repeat_the_word(self):
        w = _worker(worker_type="Veteran", age=45)
        label = usage_label(w, stars=3, score=60)
        assert label == "Veteran Upper Midcarder"
        assert label.split() != ["Veteran", "Veteran"]


class TestEnforcerAndAllRounderWording:
    def test_veteran_enforcer_reads_naturally(self):
        w = _worker(worker_type="Enforcer", age=45)
        assert usage_label(w, stars=3, score=60) == "Veteran Enforcer"

    def test_all_round_veteran_not_all_rounding(self):
        w = _worker(worker_type="All-Rounder", age=45)
        assert usage_label(w, stars=3, score=60) == "All-Round Veteran"


class TestSolidHandLeadsAsANoun:
    def test_main_event_solid_hand_reads_as_a_noun_phrase(self):
        w = _worker(worker_type="Solid Hand", age=35)
        assert usage_label(w, stars=4, score=72) == "Solid Hand Main Eventer"


class TestFadingTalentReplacesDeadwood:
    def test_low_score_older_worker_is_fading_talent_not_deadwood(self):
        w = _worker(worker_type="", age=32, potential_stars=1.0)
        label = usage_label(w, stars=0.5, score=10)
        assert "Deadwood" not in label
        assert label == "Fading Talent"


class TestInternationalHiddenGemWithoutADetectedStyle:
    # Regression: the overlay used to be gated on `st` being truthy, so a
    # worker with no detected style archetype silently never showed
    # International/Hidden Gem even when the underlying pop-gap conditions
    # were met.
    def test_international_applies_even_with_no_detected_style(self):
        w = _worker(worker_type="", pillar_local_pop=20, pillar_max_region_pop=80,
                     pillar_primary=50, pillar_perf=50)
        assert usage_label(w, stars=3, score=60) == "International Worker"

    def test_hidden_gem_applies_even_with_no_detected_style(self):
        w = _worker(worker_type="", pillar_local_pop=20, pillar_primary=90,
                     pillar_perf=90, pillar_max_region_pop=0)
        assert usage_label(w, stars=3, score=60) == "Hidden Gem"


class TestNonWrestlerRoleWording:
    def test_personality_role_reads_as_a_job_title_not_a_personal_insult(self):
        w = _worker(positions=["Personality"], age=35)
        w.worker_type = ""
        label = usage_label(w, stars=1, score=25)
        assert label == "Average TV Personality"
        assert "Personality" not in label.replace("TV Personality", "")

    def test_lowest_tier_uses_weak_not_ineffective(self):
        w = _worker(positions=["Referee"], age=35)
        w.worker_type = ""
        assert usage_label(w, stars=0, score=2) == "Weak Referee"
