import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import models
from database import SessionLocal, engine
from routers.pgn_importer import import_pgn_path
from routers.r2_storage import r2_object_exists, safe_object_name, upload_path_to_r2
from services.import_stats import ensure_import_stat_tables, refresh_import_stats
from sqlalchemy import text


def iter_pgn_files(input_path):
    path = Path(input_path)
    if path.is_file():
        yield path
        return
    yield from sorted(path.glob("*.pgn"), key=lambda item: item.name.lower())


def build_historical_object_key(player_slug, filename):
    return str(PurePosixPath(
        "pgn-imports",
        "historical",
        safe_object_name(player_slug),
        safe_object_name(filename),
    ))


def get_import_record(db, object_key):
    return db.query(models.ImportedPgnFile).filter(
        models.ImportedPgnFile.object_key == object_key
    ).first()


def count_indexed_games(db, object_key):
    return db.query(models.ImportedGame).filter(
        models.ImportedGame.pgn_object_key == object_key
    ).count()


def delete_indexed_games(db, object_key):
    deleted = db.query(models.ImportedGame).filter(
        models.ImportedGame.pgn_object_key == object_key
    ).delete(synchronize_session=False)
    db.commit()
    return deleted


def ensure_import_record(db, object_key, path):
    record = get_import_record(db, object_key)
    if record:
        return record

    record = models.ImportedPgnFile(
        object_key=object_key,
        filename=path.name,
        size_bytes=path.stat().st_size,
        status="pending",
    )
    db.add(record)
    db.commit()
    return record


def reset_import_tables(db):
    bind = db.get_bind()
    tables = ["imported_games", "imported_player_stats", "imported_pgn_files", "imported_opening_stats"]
    if bind.dialect.name == "postgresql":
        for table in tables:
            db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY"))
    else:
        for table in tables:
            db.execute(text(f"DELETE FROM {table}"))
    db.commit()


def ensure_imported_game_columns(db):
    if db.get_bind().dialect.name == "postgresql":
        db.execute(text("ALTER TABLE imported_games ADD COLUMN IF NOT EXISTS white_elo INTEGER"))
        db.execute(text("ALTER TABLE imported_games ADD COLUMN IF NOT EXISTS black_elo INTEGER"))
        db.commit()


def main():
    parser = argparse.ArgumentParser(description="Import a curated historical PGN file/folder into R2 and the database.")
    parser.add_argument("input", help="A PGN file or folder containing PGN files")
    parser.add_argument("--player-slug", required=True, help="Stable folder slug, for example jose-raul-capablanca")
    parser.add_argument("--skip-r2", action="store_true", help="Only index locally; do not upload PGNs to R2")
    parser.add_argument("--force", action="store_true", help="Re-index files even if already marked complete")
    parser.add_argument("--reset-imported", action="store_true", help="Clear imported_* tables before importing")
    parser.add_argument("--no-refresh-stats", action="store_true", help="Do not rebuild player/opening stats at the end")
    args = parser.parse_args()

    models.Base.metadata.create_all(bind=engine)
    ensure_import_stat_tables(engine)
    db = SessionLocal()

    try:
        ensure_imported_game_columns(db)
        if args.reset_imported:
            reset_import_tables(db)
            print("Cleared imported tables.", flush=True)

        files = list(iter_pgn_files(args.input))
        print(f"Found {len(files)} PGN file(s).", flush=True)

        total_imported = 0
        total_skipped = 0
        total_duplicates = 0

        for index, path in enumerate(files, start=1):
            object_key = build_historical_object_key(args.player_slug, path.name)
            indexed_count = count_indexed_games(db, object_key)
            record = get_import_record(db, object_key)

            print(f"\n[{index}/{len(files)}] {path.name}", flush=True)
            print(f"R2 key: {object_key}", flush=True)

            if not args.force and record and record.status == "complete" and indexed_count > 0:
                print(f"Already complete with {indexed_count} indexed games, skipping.", flush=True)
                continue

            if indexed_count > 0:
                deleted = delete_indexed_games(db, object_key)
                print(f"Deleted {deleted} existing indexed rows for this file.", flush=True)

            record = ensure_import_record(db, object_key, path)
            record.status = "running"
            record.games_imported = 0
            record.games_skipped = 0
            record.error = None
            record.started_at = datetime.now(timezone.utc)
            record.completed_at = None
            db.commit()

            try:
                if not args.skip_r2:
                    if r2_object_exists(object_key):
                        print("R2 object exists, keeping it.", flush=True)
                    else:
                        upload_path_to_r2(path, object_key)
                        print("Uploaded to R2.", flush=True)

                result = import_pgn_path(
                    path,
                    db,
                    pgn_object_key=object_key,
                    batch_size=500,
                    dedupe_by_site=True,
                )
                record.status = "complete"
                record.games_imported = result["imported"]
                record.games_skipped = result["skipped"]
                record.completed_at = datetime.now(timezone.utc)
                db.commit()

                total_imported += result["imported"]
                total_skipped += result["skipped"]
                total_duplicates += result.get("duplicates", 0)
                print(f"Indexed {result['imported']}, skipped {result['skipped']}, duplicates {result.get('duplicates', 0)}.", flush=True)
            except Exception as exc:
                db.rollback()
                record = get_import_record(db, object_key)
                if record:
                    record.status = "failed"
                    record.error = str(exc)
                    db.commit()
                raise

        if not args.no_refresh_stats:
            print("\nRefreshing imported player/opening stats...", flush=True)
            refresh_import_stats(db)

        print("\nDone.", flush=True)
        print(f"Imported games: {total_imported}", flush=True)
        print(f"Skipped games: {total_skipped}", flush=True)
        print(f"Duplicate games skipped: {total_duplicates}", flush=True)
    finally:
        db.close()


if __name__ == "__main__":
    main()
