from domains.show.schedule import get_schedule


class FakeStore:
    def __init__(self, feds, tv_shows, broadcaster_slots):
        self.feds = feds
        self.tv_shows = tv_shows
        self.cards = {}
        self.broadcaster_slots = broadcaster_slots
        self.game_info = {}

    def preload_groups(self, *groups):
        pass


def _store_with_tv_for_fed(fed_uid: int) -> FakeStore:
    return FakeStore(
        feds={1: {"Name": "Player Fed"}, fed_uid: {"Name": "Rival Fed"}},
        tv_shows={10: {"UID": 10, "Fed": fed_uid, "Name": "Rival TV", "Showday": 0, "Length": 2}},
        broadcaster_slots=[{"TVShow": 10, "FedUID": fed_uid, "Active": True, "DaysLeft": 30}],
    )


def test_get_schedule_honors_a_non_controlled_fed_uid(monkeypatch):
    store = _store_with_tv_for_fed(99)
    monkeypatch.setattr("domains.show.schedule.get_store", lambda: store)
    monkeypatch.setattr("domains.company.relative.get_controlled_fed_uids", lambda: [1])

    result = get_schedule(99)

    assert len(result["upcoming"]) > 0
    assert all(s["name"] == "Rival TV" for s in result["upcoming"])


def test_get_schedule_falls_back_to_controlled_fed_when_none_given(monkeypatch):
    store = _store_with_tv_for_fed(99)
    monkeypatch.setattr("domains.show.schedule.get_store", lambda: store)
    monkeypatch.setattr("domains.company.relative.get_controlled_fed_uids", lambda: [1])

    result = get_schedule(None)

    assert result["upcoming"] == []


def test_get_schedule_falls_back_when_fed_uid_does_not_exist(monkeypatch):
    store = _store_with_tv_for_fed(99)
    monkeypatch.setattr("domains.show.schedule.get_store", lambda: store)
    monkeypatch.setattr("domains.company.relative.get_controlled_fed_uids", lambda: [1])

    result = get_schedule(12345)

    assert result["upcoming"] == []
