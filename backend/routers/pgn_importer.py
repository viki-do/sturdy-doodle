import io
import time

import chess.pgn
from sqlalchemy.exc import OperationalError

import models


def clean_tag(value, default=None):
    if value in (None, "", "?"):
        return default
    return str(value).strip()


def int_tag(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def build_imported_game(game, pgn_object_key=None):
    headers = game.headers
    exporter = chess.pgn.StringExporter(headers=False, variations=False, comments=False)
    moves = game.accept(exporter).strip()

    eco = clean_tag(headers.get("ECO"))
    opening = (
        clean_tag(headers.get("Opening")) or
        clean_tag(headers.get("Variation")) or
        eco or
        "Unknown"
    )

    return models.ImportedGame(
        event=clean_tag(headers.get("Event")),
        site=clean_tag(headers.get("Site")),
        game_date=clean_tag(headers.get("Date")),
        round=clean_tag(headers.get("Round")),
        white=clean_tag(headers.get("White"), "Unknown"),
        black=clean_tag(headers.get("Black"), "Unknown"),
        result=clean_tag(headers.get("Result")),
        eco=eco,
        opening=opening,
        ply_count=int_tag(headers.get("PlyCount")),
        source=clean_tag(headers.get("Source")),
        pgn_object_key=pgn_object_key,
        moves=moves,
        pgn=None,
    )


def save_batch(db, batch, retries=3):
    for attempt in range(1, retries + 1):
        try:
            db.bulk_save_objects(batch)
            db.commit()
            return len(batch)
        except OperationalError:
            db.rollback()
            if attempt == retries:
                raise
            try:
                db.get_bind().dispose()
            except Exception:
                pass
            time.sleep(attempt * 2)
    return 0


def import_pgn_stream(file_obj, db, pgn_object_key=None, batch_size=100):
    imported = 0
    skipped = 0
    batch = []

    text_file = io.TextIOWrapper(file_obj, encoding="utf-8", errors="replace", newline="")

    while True:
        game = chess.pgn.read_game(text_file)
        if game is None:
            break

        try:
            batch.append(build_imported_game(game, pgn_object_key=pgn_object_key))
        except Exception:
            skipped += 1
            continue

        if len(batch) >= batch_size:
            imported += save_batch(db, batch)
            batch.clear()

            if imported and imported % 10000 == 0:
                print(f"Indexed {imported} games from current file...", flush=True)

    if batch:
        imported += save_batch(db, batch)

    return {"imported": imported, "skipped": skipped}


def import_pgn_path(path, db, pgn_object_key=None, batch_size=100):
    with open(path, "rb") as file_obj:
        return import_pgn_stream(file_obj, db, pgn_object_key=pgn_object_key, batch_size=batch_size)
