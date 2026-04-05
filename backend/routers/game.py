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
import time

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
        chosen_color = data.get("color", "white") 
        board = chess.Board()
        
        white_id = u_uuid if chosen_color == "white" else None
        black_id = u_uuid if chosen_color == "black" else None

        new_game = models.Game(
            white_player_id=white_id,
            black_player_id=black_id,
            player_color=chosen_color,
            time_category=data.get("time_category", "rapid"),
            base_time_sec=data.get("base_time", 600),
            status=models.GameStatus.ongoing
        )
        db.add(new_game)
        db.commit()
        db.refresh(new_game)

        # 0. lépés: Start állapot mentése
        db.add(models.Move(game_id=new_game.id, move_number=0, notation="start", fen_before=board.fen()))
        db.commit()

        # --- BOT LÉPÉSE, HA A USER FEKETE ---
        if chosen_color == "black":
            engine_proc = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
            result = engine_proc.play(board, chess.engine.Limit(time=0.5))
            
            move_san = board.san(result.move)
            bot_move = models.Move(
                game_id=new_game.id,
                move_number=1,
                notation=move_san,
                fen_before=board.fen()
            )
            board.push(result.move) # Most már az e4 pozíció van a board-on
            db.add(bot_move)
            db.commit()
            engine_proc.quit()

        return {
            "game_id": str(new_game.id), 
            "fen": board.fen(), 
            "player_color": chosen_color
        }
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
    
    def get_game_over_details(b):
        """Meghatározza a játék végének pontos okát és státuszát."""
        if b.is_checkmate():
            # Aki lépett, az nyert (tehát ha most WHITE jönne, akkor BLACK nyert)
            winner = "Black" if b.turn == chess.WHITE else "White"
            return models.GameStatus.checkmate, f"{winner} wins by checkmate"
        
        if b.is_stalemate():
            return models.GameStatus.draw, "Draw by stalemate"
        
        if b.is_insufficient_material():
            return models.GameStatus.draw, "Draw by insufficient material"
        
        if b.can_claim_threefold_repetition():
            return models.GameStatus.draw, "Draw by threefold repetition"
        
        if b.can_claim_fifty_moves():
            return models.GameStatus.draw, "Draw by 50-move rule"
            
        if b.is_fivefold_repetition():
            return models.GameStatus.draw, "Draw by fivefold repetition"
            
        if b.is_seventyfive_moves():
            return models.GameStatus.draw, "Draw by 75-move rule"

        return models.GameStatus.ongoing, None

    try:
        # --- 1. JÁTÉKOS LÉPÉSE ---
        user_move = chess.Move.from_uci(move_uci)
        user_move_san = board.san(user_move)
        user_is_capture = board.is_capture(user_move)
        
        board.push(user_move)
        user_is_check = board.is_check()
        
        # Játékos lépésének mentése
        user_move_record = models.Move(
            game_id=game_uuid, 
            move_number=db.query(models.Move).filter(models.Move.game_id == game_uuid).count(), 
            notation=user_move_san, 
            fen_before=board.fen()
        )
        db.add(user_move_record)
        db.commit()

        # --- 2. BOT VÁLASZA (Csak ha nincs még vége) ---
        stock_san, m_from, m_to = "", "", ""
        bot_is_capture = False
        bot_is_check = False
        
        if not board.is_game_over():
            engine_proc = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
            result = engine_proc.play(board, chess.engine.Limit(time=1.0)) # Rövidítettem az időn a teszteléshez
            
            m_from = chess.square_name(result.move.from_square)
            m_to = chess.square_name(result.move.to_square)
            stock_san = board.san(result.move)
            bot_is_capture = board.is_capture(result.move)
            
            board.push(result.move)
            bot_is_check = board.is_check()
            engine_proc.quit()

            # Bot lépésének mentése
            bot_move_record = models.Move(
                game_id=game_uuid, 
                move_number=db.query(models.Move).filter(models.Move.game_id == game_uuid).count(), 
                notation=stock_san, 
                fen_before=board.fen()
            )
            db.add(bot_move_record)
            db.commit()

        # --- 3. VÉGSŐ STÁTUSZ ELLENŐRZÉS ÉS MENTÉS ---
        final_status, reason = get_game_over_details(board)
        
        if final_status != models.GameStatus.ongoing:
            game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
            if game:
                game.status = final_status
                db.commit()

        return {
            "new_fen": board.fen(),
            "is_game_over": final_status != models.GameStatus.ongoing,
            "status": final_status.value,
            "reason": reason,
            "user_move": {"is_capture": user_is_capture, "is_check": user_is_check},
            "bot_move": {
                "from": m_from, "to": m_to, 
                "is_capture": bot_is_capture, "is_check": bot_is_check
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    
@router.post("/resign-game")
def resign_game(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    game_uuid = uuid.UUID(data.get("game_id"))
    game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
    if game:
        # JAVÍTÁS: models.GameStatus.resigned használata a finished helyett
        game.status = models.GameStatus.resigned 
        db.commit()
        return {"status": "resigned"}
    return {"status": "not_found"}

@router.get("/game/{game_id}/history")
def get_game_history(game_id: str, db: Session = Depends(get_db)):
    try:
        game_uuid = uuid.UUID(game_id)
        game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
        moves = db.query(models.Move).filter(models.Move.game_id == game_uuid).order_by(models.Move.move_number.asc()).all()
        
        history_data = []
        board = chess.Board()
        
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")

        if not moves:
            return {
                "history": [{"num": 0, "m": "start", "fen": board.fen(), "from": None, "to": None, "t": 0}],
                "status": game.status.value if game.status else "ongoing",
                "reason": "Match ongoing"
            }
            
        for i, m in enumerate(moves):
            duration = 0
            if i > 0 and m.created_at and moves[i-1].created_at:
                diff = m.created_at - moves[i-1].created_at
                duration = diff.total_seconds()
            
            if m.notation == "start":
                history_data.append({"num": 0, "m": "start", "fen": m.fen_before, "from": None, "to": None, "t": 0})
                continue

            try:
                mv = board.push_san(m.notation)
                history_data.append({
                    "num": m.move_number, 
                    "m": m.notation, 
                    "fen": board.fen(), 
                    "from": chess.square_name(mv.from_square), 
                    "to": chess.square_name(mv.to_square),
                    "t": round(duration, 1) 
                })
            except:
                continue
        
        # --- PONTOS OK (REASON) MEGHATÁROZÁSA ---
        status_value = game.status.value if game.status else "ongoing"
        reason = "Match ongoing"

        if game.status == models.GameStatus.resigned:
            # Fehér (user) adta fel, tehát Fekete (bot) nyert
            reason = "Black wins by resignation"
        
        elif game.status == models.GameStatus.checkmate:
            winner = "Black" if board.turn == chess.WHITE else "White"
            reason = f"{winner} wins by checkmate"
            
        elif game.status in [models.GameStatus.draw, models.GameStatus.finished]:
            # Itt ellenőrizzük az összes létező döntetlen típust
            if board.is_stalemate():
                reason = "Draw by stalemate"
            elif board.is_insufficient_material():
                reason = "Draw by insufficient material"
            elif board.can_claim_threefold_repetition() or board.is_fivefold_repetition():
                reason = "Draw by repetition"
            elif board.can_claim_fifty_moves() or board.is_seventyfive_moves():
                reason = "Draw by 50-move rule"
            else:
                reason = "Draw"

        return {
            "history": history_data,
            "status": status_value,
            "reason": reason
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"history": [], "status": "ongoing", "reason": "Error"}

@router.get("/get-active-game")
def get_active_game(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    u_uuid = uuid.UUID(user_id)
    # Keressük a játékot, ahol a user vagy fehér, vagy fekete bábukkal van
    active_game = db.query(models.Game).filter(
        ((models.Game.white_player_id == u_uuid) | (models.Game.black_player_id == u_uuid)),
        models.Game.status == models.GameStatus.ongoing
    ).order_by(models.Game.created_at.desc()).first()

    if active_game:
        return {
            "game_id": str(active_game.id),
            "player_color": active_game.player_color
        }
    return {"game_id": None}

@router.post("/resign-game")
def resign_game(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        game_uuid = uuid.UUID(str(data.get("game_id")))
        game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
        
        if game:
            # Aki NEM a player_color, az nyert
            winner = "Black" if game.player_color == "white" else "White"
            
            # Ha a PostgreSQL hibát dob a 'resigned'-re, használd a 'finished'-et ideiglenesen
            game.status = models.GameStatus.resigned 
            db.commit()
            
            return {
                "status": "resigned", 
                "reason": f"{winner} wins by resignation"
            }
        return {"status": "not_found"}
    except Exception as e:
        db.rollback()
        # Visszaküldjük a hiba okát a konzolba
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/move")
def make_move(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    game_uuid = uuid.UUID(data.get("game_id"))
    board = rebuild_board(game_uuid, db)
    move_uci = data.get("move") # Például: "e2e4" vagy promótálásnál "e7e8q"
    
    def get_game_over_details(b):
        """Meghatározza a játék végének pontos okát és státuszát."""
        if b.is_checkmate():
            # JAVÍTÁS: Ha matt van, az a játékos vesztett, akinek a köre jönne (b.turn).
            # Ha b.turn == chess.WHITE (True), akkor a Fehér kapott mattot -> Fekete nyert.
            winner = "Black" if b.turn == chess.WHITE else "White"
            return models.GameStatus.checkmate, f"{winner} wins by checkmate"
        
        if b.is_stalemate():
            return models.GameStatus.draw, "Draw by stalemate"
        
        if b.is_insufficient_material():
            return models.GameStatus.draw, "Draw by insufficient material"
        
        if b.can_claim_threefold_repetition():
            return models.GameStatus.draw, "Draw by threefold repetition"
        
        if b.can_claim_fifty_moves():
            return models.GameStatus.draw, "Draw by 50-move rule"
            
        if b.is_fivefold_repetition():
            return models.GameStatus.draw, "Draw by fivefold repetition"
            
        if b.is_seventyfive_moves():
            return models.GameStatus.draw, "Draw by 75-move rule"

        return models.GameStatus.ongoing, None

    try:
        # --- 1. JÁTÉKOS LÉPÉSE ---
        # A Move.from_uci automatikusan kezeli a 4 és 5 karakteres kódokat is.
        user_move = chess.Move.from_uci(move_uci)
        
        # Ellenőrizzük, hogy a lépés szabályos-e
        if user_move not in board.legal_moves:
            # Speciális eset: Ha a frontend elfelejtette a promóció jelet, de a lépés csak úgy lenne szabályos
            promo_move = chess.Move.from_uci(move_uci + "q")
            if promo_move in board.legal_moves:
                user_move = promo_move
            else:
                raise HTTPException(status_code=400, detail="Illegal move")

        user_move_san = board.san(user_move)
        user_is_capture = board.is_capture(user_move)
        user_is_en_passant = board.is_en_passant(user_move)
        
        board.push(user_move)
        user_is_check = board.is_check()
        
        # Játékos lépésének mentése az adatbázisba
        user_move_record = models.Move(
            game_id=game_uuid, 
            move_number=db.query(models.Move).filter(models.Move.game_id == game_uuid).count(), 
            notation=user_move_san, 
            fen_before=board.fen()
        )
        db.add(user_move_record)
        db.commit()

        # --- 2. BOT VÁLASZA (Csak ha a játékos lépése után nem lett vége) ---
        stock_san, m_from, m_to = "", "", ""
        bot_is_capture = False
        bot_is_check = False
        
        if not board.is_game_over():
            engine_proc = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
            result = engine_proc.play(board, chess.engine.Limit(time=1.0))
            
            m_from = chess.square_name(result.move.from_square)
            m_to = chess.square_name(result.move.to_square)
            stock_san = board.san(result.move)
            bot_is_capture = board.is_capture(result.move)
            
            board.push(result.move)
            bot_is_check = board.is_check()
            engine_proc.quit()

            # Bot lépésének mentése az adatbázisba
            bot_move_record = models.Move(
                game_id=game_uuid, 
                move_number=db.query(models.Move).filter(models.Move.game_id == game_uuid).count(), 
                notation=stock_san, 
                fen_before=board.fen()
            )
            db.add(bot_move_record)
            db.commit()

        # --- 3. VÉGSŐ ÁLLAPOT ELLENŐRZÉSE ---
        final_status, reason = get_game_over_details(board)
        
        # Ha vége a játéknak, frissítjük a Game táblát is
        if final_status != models.GameStatus.ongoing:
            game_record = db.query(models.Game).filter(models.Game.id == game_uuid).first()
            if game_record:
                game_record.status = final_status
                db.commit()

        return {
            "new_fen": board.fen(),
            "is_game_over": final_status != models.GameStatus.ongoing,
            "status": final_status.value,
            "reason": reason,
            "user_move": {
                "is_capture": user_is_capture, 
                "is_check": user_is_check,
                "is_en_passant": user_is_en_passant
            },
            "bot_move": {
                "from": m_from, 
                "to": m_to, 
                "is_capture": bot_is_capture, 
                "is_check": bot_is_check
            }
        }
        
    except Exception as e:
        db.rollback()
        print(f"Hiba a move végponton: {e}")
        raise HTTPException(status_code=400, detail=str(e))