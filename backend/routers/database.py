from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

import models
from database import SessionLocal
from services.historical_players import HISTORICAL_PLAYERS
from .auth import get_current_user_id
from .pgn_importer import import_pgn_stream
from .r2_storage import build_pgn_object_key, get_r2_prefix_stats, upload_fileobj_to_r2

router = APIRouter(prefix="/database", tags=["Game Database"])

BEST_PLAYERS_OF_ALL_TIME = [
    {"name": "Garry Kasparov", "aliases": ["garry kasparov", "gary kasparov", "kasparov, garry"]},
    {"name": "Magnus Carlsen", "aliases": ["magnus carlsen", "carlsen, magnus"]},
    {"name": "Bobby Fischer", "aliases": ["bobby fischer", "robert james fischer", "fischer, bobby"]},
    {"name": "Jose Raul Capablanca", "aliases": ["jose raul capablanca", "capablanca, jose raul"]},
    {"name": "Anatoly Karpov", "aliases": ["anatoly karpov", "anatoly yevgenyevich karpov", "karpov, anatoly"]},
    {"name": "Mikhail Botvinnik", "aliases": ["mikhail botvinnik", "botvinnik, mikhail"]},
    {"name": "Vladimir Kramnik", "aliases": ["vladimir kramnik", "kramnik, vladimir"]},
    {"name": "Emanuel Lasker", "aliases": ["emanuel lasker", "lasker, emanuel"]},
    {"name": "Mikhail Tal", "aliases": ["mikhail tal", "tal, mikhail"]},
    {"name": "Alexander Alekhine", "aliases": ["alexander alekhine", "alekhine, alexander"]},
]

CATALOG_PLAYERS = [player["name"] for player in HISTORICAL_PLAYERS]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize_game(game):
    return {
        "id": game.id,
        "event": game.event,
        "site": game.site,
        "date": game.game_date,
        "round": game.round,
        "white": game.white,
        "black": game.black,
        "white_elo": game.white_elo,
        "black_elo": game.black_elo,
        "result": game.result,
        "eco": game.eco,
        "opening": game.opening,
        "ply_count": game.ply_count,
        "source": game.source,
        "pgn_object_key": game.pgn_object_key,
        "moves": game.moves,
    }


def player_name_variants(name: str):
    cleaned = name.strip().lower()
    variants = {cleaned}
    if " " in cleaned and "," not in cleaned:
        parts = cleaned.split()
        if len(parts) >= 2:
            variants.add(f"{parts[-1]}, {' '.join(parts[:-1])}")
    return sorted(v for v in variants if v)


def serialize_game_row(row):
    data = row._mapping
    return {
        "id": data["id"],
        "event": data["event"],
        "site": data["site"],
        "date": data["game_date"],
        "round": data["round"],
        "white": data["white"],
        "black": data["black"],
        "white_elo": data["white_elo"],
        "black_elo": data["black_elo"],
        "result": data["result"],
        "eco": data["eco"],
        "opening": data["opening"],
        "ply_count": data["ply_count"],
        "source": data["source"],
        "pgn_object_key": data["pgn_object_key"],
        "moves": data["moves"],
    }


@router.post("/import-pgn")
def import_pgn(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith((".pgn", ".txt")):
        raise HTTPException(status_code=400, detail="Only PGN or TXT files can be imported")

    imported = 0
    skipped = 0
    batch = []
    object_key = build_pgn_object_key(file.filename)

    try:
        upload_fileobj_to_r2(file.file, object_key, file.content_type or "application/x-chess-pgn")

        result = import_pgn_stream(file.file, db, pgn_object_key=object_key)
        imported = result["imported"]
        skipped = result["skipped"]

        return {"imported": imported, "skipped": skipped, "object_key": object_key}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"PGN import failed: {exc}") from exc


@router.get("/summary")
def database_summary(
    db: Session = Depends(get_db),
):
    try:
        indexed_games = int(db.query(func.count(models.ImportedGame.id)).scalar() or 0)
        imported_file_games = int(db.query(func.sum(models.ImportedPgnFile.games_imported)).filter(
            models.ImportedPgnFile.status == "complete"
        ).scalar() or 0)
        total_games = indexed_games or imported_file_games
        r2_archive = {"prefix": "pgn-imports/lumbras/", "object_count": 0, "size_bytes": 0, "available": False}
        if total_games == 0:
            try:
                r2_archive = {**get_r2_prefix_stats(), "available": True}
            except Exception:
                pass
        top_players = get_top_players(db, limit=5)

        top_openings = db.execute(text("""
            SELECT opening, games
            FROM imported_opening_stats
            ORDER BY games DESC
            LIMIT 8
        """)).all()

        return {
            "total_games": total_games,
            "indexed_games": indexed_games,
            "imported_file_games": imported_file_games,
            "r2_archive": r2_archive,
            "top_players": top_players,
            "best_players": get_best_players_of_all_time(db),
            "top_openings": [
                {"opening": opening or "Unknown", "games": int(games or 0)}
                for opening, games in top_openings
            ],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/players")
def players(
    limit: int = Query(24, ge=1, le=100),
    page: int = Query(1, ge=1),
    search: str = "",
    sort: str = "name",
    db: Session = Depends(get_db),
):
    safe_sort = sort if sort in {"name", "games"} else "name"
    return get_players(db, page=page, page_size=limit, search=search, sort=safe_sort)


@router.get("/player-profile")
def player_profile(
    name: str,
    db: Session = Depends(get_db),
):
    variants = player_name_variants(name)
    if not variants:
        raise HTTPException(status_code=400, detail="Missing player name")

    variant_params = {f"name_{index}": value for index, value in enumerate(variants)}
    placeholders = ", ".join(f":name_{index}" for index in range(len(variants)))

    total_games = int(db.execute(text(f"""
        SELECT COALESCE(SUM(games), 0)
        FROM imported_player_stats
        WHERE lower(name) IN ({placeholders})
    """), variant_params).scalar() or 0)

    row = db.execute(text(f"""
        SELECT
            COUNT(*) FILTER (WHERE lower(white) IN ({placeholders})) AS as_white,
            COUNT(*) FILTER (WHERE lower(black) IN ({placeholders})) AS as_black,
            COUNT(*) FILTER (
                WHERE (lower(white) IN ({placeholders}) AND result = '1-0')
                   OR (lower(black) IN ({placeholders}) AND result = '0-1')
            ) AS wins,
            COUNT(*) FILTER (WHERE result IN ('1/2-1/2', '1/2', '½-½')) AS draws,
            COUNT(*) FILTER (
                WHERE (lower(white) IN ({placeholders}) AND result = '0-1')
                   OR (lower(black) IN ({placeholders}) AND result = '1-0')
            ) AS losses,
            COUNT(*) FILTER (WHERE lower(white) IN ({placeholders}) AND result = '1-0') AS white_wins,
            COUNT(*) FILTER (WHERE lower(white) IN ({placeholders}) AND result IN ('1/2-1/2', '1/2', '½-½')) AS white_draws,
            COUNT(*) FILTER (WHERE lower(white) IN ({placeholders}) AND result = '0-1') AS white_losses,
            COUNT(*) FILTER (WHERE lower(black) IN ({placeholders}) AND result = '0-1') AS black_wins,
            COUNT(*) FILTER (WHERE lower(black) IN ({placeholders}) AND result IN ('1/2-1/2', '1/2', '½-½')) AS black_draws,
            COUNT(*) FILTER (WHERE lower(black) IN ({placeholders}) AND result = '1-0') AS black_losses
        FROM imported_games
        WHERE lower(white) IN ({placeholders}) OR lower(black) IN ({placeholders})
    """), variant_params).first()

    data = row._mapping if row else {}
    return {
        "name": name,
        "games": total_games,
        "as_white": int(data.get("as_white") or 0),
        "as_black": int(data.get("as_black") or 0),
        "wins": int(data.get("wins") or 0),
        "draws": int(data.get("draws") or 0),
        "losses": int(data.get("losses") or 0),
        "white_wins": int(data.get("white_wins") or 0),
        "white_draws": int(data.get("white_draws") or 0),
        "white_losses": int(data.get("white_losses") or 0),
        "black_wins": int(data.get("black_wins") or 0),
        "black_draws": int(data.get("black_draws") or 0),
        "black_losses": int(data.get("black_losses") or 0),
    }


@router.get("/games")
def games(
    opening: str = "",
    player1: str = "",
    player2: str = "",
    fixed_colors: bool = False,
    sort: str = "year_desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    try:
        if player1.strip() and not player2.strip() and not opening.strip():
            variants = player_name_variants(player1)
            variant_params = {f"name_{index}": value for index, value in enumerate(variants)}
            placeholders = ", ".join(f":name_{index}" for index in range(len(variants)))
            where_clause = f"(lower(white) IN ({placeholders}) OR lower(black) IN ({placeholders}))"

            total = int(db.execute(text(f"""
                SELECT COUNT(*)
                FROM imported_games
                WHERE {where_clause}
            """), variant_params).scalar() or 0)

            rows = db.execute(text(f"""
                SELECT id, event, site, game_date, round, white, black, white_elo, black_elo, result, eco, opening,
                       ply_count, source, pgn_object_key, moves
                FROM imported_games
                WHERE {where_clause}
                ORDER BY {get_games_order_sql(sort)}
                LIMIT :limit OFFSET :offset
            """), {
                **variant_params,
                "limit": page_size,
                "offset": (page - 1) * page_size,
            }).all()

            return {
                "total": total,
                "page": page,
                "page_size": page_size,
                "games": [serialize_game_row(row) for row in rows],
            }

        query = db.query(models.ImportedGame)

        if opening.strip():
            needle = f"%{opening.strip().lower()}%"
            query = query.filter(or_(
                func.lower(models.ImportedGame.opening).like(needle),
                func.lower(models.ImportedGame.eco).like(needle),
            ))

        p1 = player1.strip().lower()
        p2 = player2.strip().lower()

        if p1 and p2:
            p1_like = f"%{p1}%"
            p2_like = f"%{p2}%"
            if fixed_colors:
                query = query.filter(
                    func.lower(models.ImportedGame.white).like(p1_like),
                    func.lower(models.ImportedGame.black).like(p2_like),
                )
            else:
                query = query.filter(or_(
                    (
                        func.lower(models.ImportedGame.white).like(p1_like) &
                        func.lower(models.ImportedGame.black).like(p2_like)
                    ),
                    (
                        func.lower(models.ImportedGame.white).like(p2_like) &
                        func.lower(models.ImportedGame.black).like(p1_like)
                    ),
                ))
        elif p1:
            p1_like = f"%{p1}%"
            query = query.filter(or_(
                func.lower(models.ImportedGame.white).like(p1_like),
                func.lower(models.ImportedGame.black).like(p1_like),
            ))

        total = query.count()
        rows = (
            query.order_by(*get_games_order_by(sort))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "games": [serialize_game(game) for game in rows],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def get_games_order_sql(sort: str):
    return {
        "rating_white": "white_elo DESC NULLS LAST, id DESC",
        "rating_black": "black_elo DESC NULLS LAST, id DESC",
        "year_desc": "game_date DESC NULLS LAST, id DESC",
        "year_asc": "game_date ASC NULLS LAST, id ASC",
        "moves_desc": "ply_count DESC NULLS LAST, id DESC",
        "moves_asc": "ply_count ASC NULLS LAST, id ASC",
    }.get(sort, "game_date DESC NULLS LAST, id DESC")


def get_games_order_by(sort: str):
    return {
        "rating_white": [models.ImportedGame.white_elo.desc().nullslast(), models.ImportedGame.id.desc()],
        "rating_black": [models.ImportedGame.black_elo.desc().nullslast(), models.ImportedGame.id.desc()],
        "year_desc": [models.ImportedGame.game_date.desc().nullslast(), models.ImportedGame.id.desc()],
        "year_asc": [models.ImportedGame.game_date.asc().nullslast(), models.ImportedGame.id.asc()],
        "moves_desc": [models.ImportedGame.ply_count.desc().nullslast(), models.ImportedGame.id.desc()],
        "moves_asc": [models.ImportedGame.ply_count.asc().nullslast(), models.ImportedGame.id.asc()],
    }.get(sort, [models.ImportedGame.game_date.desc().nullslast(), models.ImportedGame.id.desc()])


def get_top_players(db: Session, limit=5):
    names = get_catalog_player_names()
    if not names:
        return []

    name_params = {f"name_{index}": value for index, value in enumerate(names)}
    placeholders = ", ".join(f":name_{index}" for index in range(len(names)))
    rows = db.execute(text(f"""
        SELECT name, games
        FROM imported_player_stats
        WHERE name IN ({placeholders})
        ORDER BY games DESC, lower(name) ASC
        LIMIT :limit
    """), {**name_params, "limit": limit}).all()

    return [{"name": row.name or "Unknown", "games": int(row.games or 0)} for row in rows]


def get_player_count_union(db: Session, search: str = ""):
    white_counts = (
        db.query(models.ImportedGame.white.label("name"), func.count(models.ImportedGame.id).label("games"))
        .filter(models.ImportedGame.white.isnot(None), models.ImportedGame.white != "")
        .group_by(models.ImportedGame.white)
    )
    black_counts = (
        db.query(models.ImportedGame.black.label("name"), func.count(models.ImportedGame.id).label("games"))
        .filter(models.ImportedGame.black.isnot(None), models.ImportedGame.black != "")
        .group_by(models.ImportedGame.black)
    )

    if search.strip():
        needle = f"%{search.strip().lower()}%"
        white_counts = white_counts.filter(func.lower(models.ImportedGame.white).like(needle))
        black_counts = black_counts.filter(func.lower(models.ImportedGame.black).like(needle))

    return white_counts.union_all(black_counts).subquery()


def get_players(db: Session, page: int = 1, page_size: int = 24, search: str = "", sort: str = "name"):
    catalog_names = get_catalog_player_names()
    if not catalog_names:
        return {"players": [], "total": 0, "page": page, "page_size": page_size}

    needle = f"%{search.strip().lower()}%"
    has_search = bool(search.strip())
    order_by = "games DESC, lower(name) ASC" if sort == "games" else "lower(name) ASC"
    name_params = {f"name_{index}": value for index, value in enumerate(catalog_names)}
    placeholders = ", ".join(f":name_{index}" for index in range(len(catalog_names)))
    where_sql = f"WHERE name IN ({placeholders}) AND (:has_search = false OR lower(name) LIKE :needle)"

    total = int(db.execute(text(f"SELECT COUNT(*) FROM imported_player_stats {where_sql}"), {
        **name_params,
        "has_search": has_search,
        "needle": needle,
    }).scalar() or 0)

    rows = db.execute(text(f"""
        SELECT name, games
        FROM imported_player_stats
        {where_sql}
        ORDER BY {order_by}
        LIMIT :limit OFFSET :offset
    """), {
        **name_params,
        "has_search": has_search,
        "needle": needle,
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }).all()

    return {
        "players": [{"name": row.name or "Unknown", "games": int(row.games or 0)} for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_catalog_player_names():
    return sorted(set(CATALOG_PLAYERS))


def get_best_players_of_all_time(db: Session):
    all_aliases = sorted({alias for player in BEST_PLAYERS_OF_ALL_TIME for alias in player["aliases"]})
    if not all_aliases:
        return []

    alias_params = {f"name_{index}": value for index, value in enumerate(all_aliases)}
    placeholders = ", ".join(f":name_{index}" for index in range(len(all_aliases)))
    rows = db.execute(text(f"""
        SELECT lower(name) AS name, games
        FROM imported_player_stats
        WHERE lower(name) IN ({placeholders})
    """), alias_params).all()
    counts_by_alias = {row.name: int(row.games or 0) for row in rows}

    return [
        {
            "name": player["name"],
            "games": sum(counts_by_alias.get(alias, 0) for alias in player["aliases"]),
        }
        for player in BEST_PLAYERS_OF_ALL_TIME
    ]
