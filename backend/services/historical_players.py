import re
import unicodedata


HISTORICAL_PLAYERS = [
    {
        "name": "Garry Kasparov",
        "aliases": ["garry kasparov", "gary kasparov", "kasparov garry", "kasparov g"],
    },
    {
        "name": "Magnus Carlsen",
        "aliases": ["magnus carlsen", "magnuscarlsen", "carlsen magnus", "carlsen m"],
    },
    {
        "name": "Bobby Fischer",
        "aliases": [
            "bobby fischer",
            "robert james fischer",
            "robert j fischer",
            "robert fischer",
            "fischer",
            "fischer bobby",
            "fischer robert",
            "fischer robert james",
            "fischer robert j",
            "fischer r",
        ],
    },
    {
        "name": "Jose Raul Capablanca",
        "aliases": ["jose raul capablanca", "capablanca jose raul", "capablanca j r", "capablanca jr"],
    },
    {
        "name": "Paul Morphy",
        "aliases": ["paul morphy", "morphy paul", "morphy p"],
    },
    {
        "name": "Anatoly Karpov",
        "aliases": ["anatoly karpov", "karpov anatoly", "karpov a", "karpov ana"],
    },
    {
        "name": "Mikhail Botvinnik",
        "aliases": ["mikhail botvinnik", "botvinnik mikhail", "botvinnik m", "botvinnik mikhail2"],
    },
    {
        "name": "Vladimir Kramnik",
        "aliases": [
            "vladimir kramnik",
            "vladimirkramnik",
            "kramnik vladimir",
            "kramnikvladimir",
            "kramnik v",
        ],
    },
    {
        "name": "Emanuel Lasker",
        "aliases": ["emanuel lasker", "emmanuel lasker", "lasker emanuel", "lasker e"],
    },
    {
        "name": "Mikhail Tal",
        "aliases": ["mikhail tal", "mihail tal", "tal mikhail", "tal m"],
    },
    {
        "name": "Alexander Alekhine",
        "aliases": ["alexander alekhine", "alexandre alekhine", "alekhine alexander", "alekhine a"],
    },
]


def normalize_for_match(value):
    if not value:
        return ""
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"\([^)]*\)", " ", text)
    text = text.replace(",", " ")
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text)
    return " ".join(text.lower().split())


def normalize_player_name(name):
    normalized = normalize_for_match(name)
    if not normalized:
        return name

    for player in HISTORICAL_PLAYERS:
        for alias in player["aliases"]:
            if normalize_for_match(alias) == normalized:
                return player["name"]

    for player in HISTORICAL_PLAYERS:
        canonical_parts = normalize_for_match(player["name"]).split()
        if canonical_parts and all(part in normalized.split() for part in canonical_parts):
            return player["name"]

    return name
