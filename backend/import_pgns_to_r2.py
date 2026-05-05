import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from database import SessionLocal, engine
import models
from routers.pgn_importer import import_pgn_path
from routers.r2_storage import build_pgn_object_key, r2_object_exists, upload_path_to_r2


LOCK_PATH = Path(__file__).with_suffix(".lock")


def acquire_lock():
    try:
        fd = os.open(LOCK_PATH, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode("ascii"))
        os.close(fd)
        return True
    except FileExistsError:
        print(f"Import lock exists: {LOCK_PATH}", flush=True)
        print("Another import may already be running. Delete the lock only if you are sure it stopped.", flush=True)
        return False


def release_lock():
    try:
        LOCK_PATH.unlink()
    except FileNotFoundError:
        pass


def iter_pgn_files(input_path):
    path = Path(input_path)
    if path.is_file():
        yield path
        return

    yield from sorted(path.glob("*.pgn"))


def format_size(size):
    units = ["B", "KB", "MB", "GB", "TB"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.2f} {unit}"
        value /= 1024


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


def main():
    if not acquire_lock():
        sys.exit(1)

    parser = argparse.ArgumentParser(description="Upload PGNs to Cloudflare R2 and index games into the database.")
    parser.add_argument("input", help="A PGN file or a folder containing .pgn files")
    parser.add_argument("--collection", default="lumbras", help="R2 collection folder under pgn-imports/")
    parser.add_argument("--skip-r2", action="store_true", help="Only index the PGN locally; do not upload to R2")
    args = parser.parse_args()

    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        files = list(iter_pgn_files(args.input))
        total_size = sum(path.stat().st_size for path in files)
        print(f"Found {len(files)} PGN file(s), total size {format_size(total_size)}.", flush=True)

        for index, path in enumerate(files, start=1):
            if not path.exists():
                print(f"\n[{index}/{len(files)}] File no longer exists, skipping: {path}", flush=True)
                continue

            object_key = build_pgn_object_key(path.name, collection=args.collection)
            print(f"\n[{index}/{len(files)}] Importing {path} ({format_size(path.stat().st_size)})", flush=True)
            print(f"R2 key: {object_key}", flush=True)

            record = ensure_import_record(db, object_key, path)
            indexed_count = count_indexed_games(db, object_key)

            if record.status == "complete" and indexed_count > 0:
                print(f"Already complete with {indexed_count} indexed games, skipping.", flush=True)
                continue

            if indexed_count > 0:
                print(f"Found partial index ({indexed_count} games). Deleting partial rows before retry...", flush=True)
                deleted = delete_indexed_games(db, object_key)
                print(f"Deleted {deleted} partial rows.", flush=True)

            record.status = "running"
            record.games_imported = 0
            record.games_skipped = 0
            record.error = None
            record.started_at = datetime.now(timezone.utc)
            record.completed_at = None
            db.commit()

            if not args.skip_r2:
                if r2_object_exists(object_key):
                    print("R2 object already exists, skipping upload. Indexing PGN...", flush=True)
                else:
                    print("Uploading to R2...", flush=True)
                    upload_path_to_r2(path, object_key)
                    print("Upload complete. Indexing PGN...", flush=True)

            try:
                result = import_pgn_path(path, db, pgn_object_key=object_key)
                record.status = "complete"
                record.games_imported = result["imported"]
                record.games_skipped = result["skipped"]
                record.completed_at = datetime.now(timezone.utc)
                db.commit()
                print(f"Indexed {result['imported']} games, skipped {result['skipped']}.", flush=True)
            except Exception as exc:
                db.rollback()
                record = get_import_record(db, object_key)
                if record:
                    record.status = "failed"
                    record.error = str(exc)
                    db.commit()
                raise
    finally:
        db.close()
        release_lock()


if __name__ == "__main__":
    main()
