import uuid
import chess
import chess.engine
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from database import SessionLocal
# Importáljuk az auth segédfüggvényt
from .auth import get_current_user_id

router = APIRouter(tags=["Chess Game"])

STOCKFISH_PATH = "engine/stockfish.exe"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def rebuild_board(game_id: uuid.UUID, db: Session):
    moves = db.query(models.Move).filter(models.Move.game_id == game_id).order_by(models.Move.move_number.asc()).all()
    board = chess.Board()
    for m in moves:
        if m.notation == "start" or not m.notation: continue
        parts = m.notation.split()
        for p in parts:
            try: board.push_san(p)
            except:
                try: board.push_uci(p)
                except: continue
    return board

@router.post("/create-game")
def create_game(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        u_uuid = uuid.UUID(user_id)
        time_cat = data.get("time_category", "rapid")
        base_time = data.get("base_time", 600) 
        board = chess.Board()
        
        new_game = models.Game(
            white_player_id=u_uuid,
            time_category=time_cat,      
            base_time_sec=base_time,     
            status=models.GameStatus.ongoing,
            created_at=datetime.utcnow()
        )
        db.add(new_game)
        db.commit()
        db.refresh(new_game)
        
        start_move = models.Move(
            game_id=new_game.id,
            move_number=0,
            notation="start",
            fen_before=board.fen()
        )
        db.add(start_move)
        db.commit()
        return {"game_id": str(new_game.id), "fen": board.fen()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/get-valid-moves")
def get_valid_moves(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    game_id_str = data.get("game_id")
    if not game_id_str or game_id_str == "null": 
        return {"valid_moves": [], "is_in_check": False}
    try:
        board = rebuild_board(uuid.UUID(game_id_str), db)
        is_in_check = board.is_check()
        from_sq_str = data.get("square")
        if not from_sq_str:
            return {"valid_moves": [], "is_in_check": is_in_check}
        from_sq = chess.parse_square(from_sq_str)
        valid_moves = [chess.square_name(m.to_square) for m in board.legal_moves if m.from_square == from_sq]
        return {"valid_moves": valid_moves, "is_in_check": is_in_check}
    except Exception as e:
        return {"valid_moves": [], "is_in_check": False}

@router.post("/move")
def make_move(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    game_uuid = uuid.UUID(data.get("game_id"))
    board = rebuild_board(game_uuid, db)
    move_uci = data.get("move")
    
    try:
        # 1. Játékos lépése
        user_move = chess.Move.from_uci(move_uci)
        user_move_san = board.san(user_move)
        
        # Ellenőrizzük, hogy a játékos ütött-e
        user_is_capture = board.is_capture(user_move)
        
        board.push(user_move)
        user_is_check = board.is_check()
        
        # 2. Bot válasza (Stockfish)
        stock_san, m_from, m_to = "", "", ""
        bot_is_capture = False
        bot_is_check = False
        
        if not board.is_game_over():
            engine_proc = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
            result = engine_proc.play(board, chess.engine.Limit(time=0.9)) # Rövidebb idő a gyorsabb válaszért
            
            m_from = chess.square_name(result.move.from_square)
            m_to = chess.square_name(result.move.to_square)
            stock_san = board.san(result.move)
            bot_is_capture = board.is_capture(result.move) # Bot ütött-e?
            
            board.push(result.move)
            bot_is_check = board.is_check() # Bot sakkot adott-e?
            engine_proc.quit()
        
        # Mentés
        new_move = models.Move(
            game_id=game_uuid, 
            move_number=db.query(models.Move).filter(models.Move.game_id == game_uuid).count(), 
            notation=f"{user_move_san} {stock_san}".strip(), 
            fen_before=board.fen()
        )
        db.add(new_move)
        db.commit()
        
        # Visszaküldünk minden infót a hangokhoz
        return {
            "new_fen": board.fen(),
            "is_checkmate": board.is_checkmate(),
            "user_move": {
                "is_capture": user_is_capture,
                "is_check": user_is_check
            },
            "bot_move": {
                "from": m_from,
                "to": m_to,
                "is_capture": bot_is_capture,
                "is_check": bot_is_check
            }
        }
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail="Lépési hiba")
    
@router.get("/game/{game_id}/history")
def get_game_history(game_id: str, db: Session = Depends(get_db)):
    try:
        game_uuid = uuid.UUID(game_id)
        moves = db.query(models.Move).filter(models.Move.game_id == game_uuid).order_by(models.Move.move_number.asc()).all()
        history_data = []
        board = chess.Board()
        if not moves:
            return {"history": [{"num": 0, "m": "start", "fen": board.fen(), "from": None, "to": None}]}
        for m in moves:
            if m.notation == "start":
                history_data.append({"num": 0, "m": "start", "fen": m.fen_before, "from": None, "to": None})
                continue
            try:
                parts = m.notation.split()
                f, t = None, None
                for p in parts:
                    mv = board.push_san(p)
                    f, t = chess.square_name(mv.from_square), chess.square_name(mv.to_square)
                history_data.append({"num": m.move_number, "m": m.notation, "fen": board.fen(), "from": f, "to": t})
            except: continue
        return {"history": history_data}
    except:
        return {"history": [{"num": 0, "m": "start", "fen": chess.STARTING_FEN, "from": None, "to": None}]}

@router.get("/get-active-game")
def get_active_game(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    active_game = db.query(models.Game).filter(models.Game.white_player_id == uuid.UUID(user_id), models.Game.status == models.GameStatus.ongoing).order_by(models.Game.created_at.desc()).first()
    if active_game:
        move_exists = db.query(models.Move).filter(models.Move.game_id == active_game.id).first()
        if not move_exists:
            db.add(models.Move(game_id=active_game.id, move_number=0, notation="start", fen_before=chess.STARTING_FEN))
            db.commit()
        return {"game_id": str(active_game.id)}
    return {"game_id": None}

@router.post("/resign-game")
def resign_game(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        game_uuid = uuid.UUID(data.get("game_id"))
        game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
        if game:
            game.status = models.GameStatus.finished
            db.commit()
            return {"status": "resigned"}
        return {"status": "not_found"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))