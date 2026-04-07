from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, Float
from sqlalchemy.dialects.postgresql import UUID
import sqlalchemy.sql.functions as func
from database import Base
import uuid
import enum
from datetime import datetime, timezone

class GameCategory(enum.Enum):
    bullet = "bullet"
    blitz = "blitz"
    rapid = "rapid"
    daily = "daily"
    custom = "custom"

class GameStatus(enum.Enum):
    ongoing = "ongoing"
    finished = "finished"
    draw = "draw"
    aborted = "aborted"
    resigned = "resigned"
    checkmate = "checkmate"

# --- 2. TÁBLÁK (MODELLEK) ---
class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=True) 
    provider = Column(String(20), default="local") 
    
class Game(Base):
    __tablename__ = "games"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    white_player_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    black_player_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    time_category = Column(Enum(GameCategory), nullable=False)
    base_time_sec = Column(Integer, nullable=False)
    # Most már látni fogja a GameStatus-t:
    status = Column(Enum(GameStatus), default=GameStatus.ongoing)
    pgn = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    player_color = Column(String(10), default="white")


class Move(Base):
    __tablename__ = "moves"
    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(UUID(as_uuid=True), ForeignKey("games.id"))
    move_number = Column(Integer, nullable=False)
    notation = Column(String(20), nullable=False)
    fen_before = Column(Text, nullable=False)
    fen_after = Column(Text, nullable=True)  # Az állás a lépés megtétele után
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))