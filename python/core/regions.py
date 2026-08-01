# Region-to-area mapping based on TEW IX External Editor Reference List appendix.
# Over1-Over57 in tblWorkerOver correspond to regions 1-57 in this order.

REGION_NAMES = {
    1: "Great Lakes", 2: "Mid Atlantic", 3: "Mid South", 4: "Mid West",
    5: "New England", 6: "North West", 7: "South East", 8: "South West",
    9: "Tri State", 10: "Puerto Rico", 11: "Hawaii",
    12: "The Maritimes", 13: "Quebec", 14: "Ontario", 15: "Alberta",
    16: "Saskatchewan", 17: "Manitoba", 18: "British Columbia",
    19: "Noreste", 20: "Noroccidente", 21: "Sureste", 22: "Sur",
    23: "Centro", 24: "Occidente",
    25: "Midlands", 26: "Northern England", 27: "Scotland",
    28: "Southern England", 29: "Ireland", 30: "Wales",
    31: "Tohoku", 32: "Kanto", 33: "Chubu", 34: "Kansai",
    35: "Chugoku", 36: "Shikoku", 37: "Kyushu", 38: "Hokkaido",
    39: "Western Europe", 40: "Iberia", 41: "Southern Mediterranean",
    42: "Southern Europe", 43: "Central Europe", 44: "Northern Europe",
    45: "Eastern-Central Europe", 46: "Eastern Europe",
    47: "New South Wales", 48: "Queensland", 49: "South Australia",
    50: "Victoria", 51: "Western Australia", 52: "Tasmania",
    53: "New Zealand",
    54: "Northern India", 55: "Eastern India", 56: "Southern India",
    57: "Western India",
}

AREAS = {
    "USA": list(range(1, 12)),
    "Canada": list(range(12, 19)),
    "Mexico": list(range(19, 25)),
    "British Isles": list(range(25, 31)),
    "Japan": list(range(31, 39)),
    "Europe": list(range(39, 47)),
    "Oceania": list(range(47, 54)),
    "India": list(range(54, 58)),
}

REGION_TO_AREA = {}
for area, region_ids in AREAS.items():
    for rid in region_ids:
        REGION_TO_AREA[rid] = area
