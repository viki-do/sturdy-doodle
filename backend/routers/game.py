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
        
        # --- RANDOM SORSOLÁS ---
        if chosen_color == "random":
            import random
            chosen_color = random.choice(["white", "black"])
        
        board = chess.Board()
        
        # A sorsolt szín alapján rendeljük hozzá a User ID-t
        white_id = u_uuid if chosen_color == "white" else None
        black_id = u_uuid if chosen_color == "black" else None

        new_game = models.Game(
            white_player_id=white_id,
            black_player_id=black_id,
            player_color=chosen_color, # Itt már a sorsolt szín lesz!
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
    

def get_game_over_details(b: chess.Board):
    """Meghatározza a játék végének pontos okát és státuszát."""
    
    # 1. Matt ellenőrzése
    if b.is_checkmate():
        # b.turn: Aki jönne. Ha b.turn == WHITE (True), akkor a Sötét mattolt.
        winner = "Black" if b.turn == chess.WHITE else "White"
        return models.GameStatus.checkmate, f"{winner} wins by checkmate"
    
    # 2. Patt ellenőrzése
    if b.is_stalemate():
        return models.GameStatus.draw, "Draw by stalemate"
    
    # 3. Anyaghiány
    if b.is_insufficient_material():
        return models.GameStatus.draw, "Draw by insufficient material"
    
    # 4. Állásismétlés
    if b.can_claim_threefold_repetition() or b.is_fivefold_repetition():
        return models.GameStatus.draw, "Draw by repetition"
    
    # 5. 50/75 lépéses szabály
    if b.can_claim_fifty_moves() or b.is_seventyfive_moves():
        return models.GameStatus.draw, "Draw by 50-move rule"

    # 6. Biztonsági háló
    if b.is_game_over():
        return models.GameStatus.draw, "Draw"

    return models.GameStatus.ongoing, None


# 1. SEGÉDFÜGGVÉNY - Ez teljesen külön álljon
def get_game_over_details(b: chess.Board):
    """Meghatározza a játék végének pontos okát és státuszát."""
    if b.is_checkmate():
        winner = "Black" if b.turn == chess.WHITE else "White"
        return models.GameStatus.checkmate, f"{winner} wins by checkmate"
    
    if b.is_stalemate():
        return models.GameStatus.draw, "Draw by stalemate"
    
    if b.is_insufficient_material():
        return models.GameStatus.draw, "Draw by insufficient material"
    
    if b.can_claim_threefold_repetition() or b.is_fivefold_repetition():
        return models.GameStatus.draw, "Draw by repetition"
    
    if b.can_claim_fifty_moves() or b.is_seventyfive_moves():
        return models.GameStatus.draw, "Draw by 50-move rule"

    if b.is_game_over():
        return models.GameStatus.draw, "Draw"

    return models.GameStatus.ongoing, None


# 2. A MOVE VÉGPONT - Ez következzen utána
@router.post("/move")
def make_move(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    game_uuid = uuid.UUID(data.get("game_id"))
    move_uci = data.get("move")
    is_timeout = data.get("timeout", False)
    is_resignation = data.get("resigned", False)

    try:
        game_rec = db.query(models.Game).filter(models.Game.id == game_uuid).first()
        if not game_rec:
            raise HTTPException(status_code=404, detail="Game not found")
        
        if game_rec.status != models.GameStatus.ongoing:
            return {"status": game_rec.status.value, "is_game_over": True}

        board = rebuild_board(game_uuid, db)
        user_color = chess.WHITE if str(game_rec.white_player_id) == user_id else chess.BLACK

        # --- 1. ABORT / FINISH LOGIKA (TIMEOUT VAGY FELADÁS) ---
        # Ha ezek közül bármelyik True, akkor itt megállunk és visszatérünk
        if is_timeout or is_resignation:
            real_moves = db.query(models.Move).filter(
                models.Move.game_id == game_uuid,
                models.Move.notation != "start"
            ).all()
            
            num_actual_moves = len(real_moves)
            # Fehérnél a 3. fél-lépés az ő 2. lépése, Feketénél a 4. fél-lépés az ő 2. lépése.
            limit = 3 if user_color == chess.WHITE else 4

            if num_actual_moves < limit:
                game_rec.status = models.GameStatus.aborted
                reason = "Game Aborted"
            else:
                game_rec.status = models.GameStatus.finished
                if is_timeout:
                    winner = "Black" if board.turn == chess.WHITE else "White"
                    reason = f"{winner} wins on time"
                else:
                    winner = "Black" if user_color == chess.WHITE else "White"
                    reason = f"{winner} wins by resignation"

            db.commit()
            return {
                "status": game_rec.status.value, 
                "reason": reason, 
                "is_game_over": True, 
                "new_fen": board.fen()
            }

        # --- 2. NORMÁL LÉPÉS KEZELÉSE ---
        # Csak akkor jutunk ide, ha NEM feladás és NEM timeout történt
        if not move_uci or move_uci == "null":
             raise HTTPException(status_code=400, detail="Missing move data")

        try:
            user_move = chess.Move.from_uci(move_uci)
        except:
            # Automatikus promotion, ha szükséges
            promo_move = chess.Move.from_uci(move_uci + "q")
            if promo_move in board.legal_moves:
                user_move = promo_move
            else:
                raise HTTPException(status_code=400, detail="Invalid move format")

        if user_move not in board.legal_moves:
            raise HTTPException(status_code=400, detail="Illegal move")

        # Lépés végrehajtása
        user_move_san = board.san(user_move)
        board.push(user_move)
        
        # Játékos lépésének mentése
        move_count = db.query(models.Move).filter(models.Move.game_id == game_uuid).count()
        db.add(models.Move(game_id=game_uuid, move_number=move_count, notation=user_move_san, fen_before=board.fen()))
        db.commit()

        # --- 3. BOT VÁLASZA ---
        bot_res = {"from": "", "to": "", "san": "", "is_capture": False}
        if not board.is_game_over():
            engine_proc = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
            result = engine_proc.play(board, chess.engine.Limit(time=0.4))
            
            bot_res["from"] = chess.square_name(result.move.from_square)
            bot_res["to"] = chess.square_name(result.move.to_square)
            bot_res["san"] = board.san(result.move)
            
            board.push(result.move)
            engine_proc.quit()

            db.add(models.Move(
                game_id=game_uuid, 
                move_number=move_count + 1, 
                notation=bot_res["san"], 
                fen_before=board.fen()
            ))
            db.commit()

        # Végső státusz (Matt, Patt...)
        final_status_enum, final_reason = get_game_over_details(board)
        if final_status_enum != models.GameStatus.ongoing:
            game_rec.status = final_status_enum
            db.commit()

        return {
            "new_fen": board.fen(),
            "is_game_over": final_status_enum != models.GameStatus.ongoing,
            "status": final_status_enum.value,
            "reason": final_reason,
            "bot_move": bot_res
        }

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/game/{game_id}/history")
def get_game_history(game_id: str, db: Session = Depends(get_db)):
    try:
        game_uuid = uuid.UUID(game_id)
        game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")

        moves = db.query(models.Move).filter(models.Move.game_id == game_uuid).order_by(models.Move.move_number.asc()).all()
        
        history_data = []
        board = chess.Board()
        
        # Feldolgozzuk a lépéseket a FEN és idő kiszámításához
        for i, m in enumerate(moves):
            duration = 0
            if i > 0 and m.created_at and moves[i-1].created_at:
                diff = m.created_at - moves[i-1].created_at
                duration = diff.total_seconds()
            
            if m.notation == "start":
                history_data.append({
                    "num": 0, 
                    "m": "start", 
                    "fen": m.fen_before, 
                    "from": None, 
                    "to": None, 
                    "t": 0
                })
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
        
        # 1. Megszakított játék (Aborted) - Ez volt a hiányzó láncszem!
        if game.status == models.GameStatus.aborted:
            reason = "Game Aborted"
        
        # 2. Feladás (Resigned)
        elif game.status == models.GameStatus.resigned:
            user_color = str(game.player_color).lower()
            winner = "Black" if user_color == "white" else "White"
            reason = f"{winner} wins by resignation"
        
        # 3. Matt (Checkmate)
        elif game.status == models.GameStatus.checkmate:
            winner = "Black" if board.turn == chess.WHITE else "White"
            reason = f"{winner} wins by checkmate"
            
        # 4. Időlejárás vagy egyéb befejezés (Finished)
        elif game.status == models.GameStatus.finished:
            # Megnézzük, kinek az ideje járt le (aki épp jönne)
            winner = "Black" if board.turn == chess.WHITE else "White"
            reason = f"{winner} wins on time"

        # 5. Döntetlenek (Draw)
        elif game.status == models.GameStatus.draw:
            if board.is_stalemate():
                reason = "Draw by stalemate"
            elif board.is_insufficient_material():
                reason = "Draw by insufficient material"
            elif board.can_claim_threefold_repetition() or board.is_fivefold_repetition():
                reason = "Draw by repetition"
            elif board.can_claim_fifty_moves() or board.is_seventyfive_moves():
                reason = "Draw by 50-move rule"
            else:
                reason = "Draw by agreement"

        return {
            "history": history_data,
            "status": status_value,
            "reason": reason
        }

    except Exception as e:
        print(f"Error in history: {e}")
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
        if not game: return {"status": "not_found"}

        # Megszámoljuk a valódi lépéseket
        real_moves = db.query(models.Move).filter(
            models.Move.game_id == game_uuid, 
            models.Move.notation != "start"
        ).count()

        # Ha a user fehérrel van és < 3 lépés történt (vagy feketével és < 4)
        # Egyszerűsítve: ha nem történt meg a fehér 2. lépése (ami a 3. fél-lépés)
        if real_moves < 3:
            game.status = models.GameStatus.aborted
            db.commit()
            return {"status": "aborted", "reason": "Game Aborted"}

        # Normál feladás
        user_color = str(game.player_color).lower()
        winner = "Black" if user_color == "white" else "White"
        game.status = models.GameStatus.resigned 
        db.commit()
        
        return {"status": "resigned", "reason": f"{winner} wins by resignation"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/handle-timeout")
def handle_timeout(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        game_uuid = uuid.UUID(str(data.get("game_id")))
        lost_color = data.get("color") # 'white' vagy 'black'
        game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
        
        if not game:
            return {"status": "not_found"}

        move_count = db.query(models.Move).filter(models.Move.game_id == game_uuid).count()

        # Ha az idő lejár, de még nem volt meg a 2. lépés
        if move_count <= 2:
            game.status = models.GameStatus.aborted
            db.commit()
            return {
                "status": "aborted",
                "reason": "Game Aborted"
            }

        # Időlejárás miatti győzelem (a vesztes szín ellenkezője nyer)
        winner = "Black" if lost_color == "white" else "White"
        game.status = models.GameStatus.finished # Vagy létrehozhatsz models.GameStatus.timeout-ot
        db.commit()

        return {
            "status": "finished",
            "reason": f"{winner} wins on time"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/move")
def make_move(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    game_uuid = uuid.UUID(data.get("game_id"))
    move_uci = data.get("move")
    is_timeout = data.get("timeout", False)
    is_resignation = data.get("resigned", False) # Feltételezve, hogy a frontend küldheti ezt is

    try:
        game_rec = db.query(models.Game).filter(models.Game.id == game_uuid).first()
        if not game_rec or game_rec.status != models.GameStatus.ongoing:
            return {"status": game_rec.status.value if game_rec else "not_found", "is_game_over": True}

        board = rebuild_board(game_uuid, db)
        
        # Meghatározzuk a felhasználó színét (Ha ő a 'white_player_id', akkor WHITE, különben BLACK)
        user_color = chess.WHITE if str(game_rec.white_player_id) == user_id else chess.BLACK

        # --- 1. ABORT / FINISH LOGIKA (TIMEOUT VAGY FELADÁS) ---
        if is_timeout or is_resignation:
            real_moves = db.query(models.Move).filter(
                models.Move.game_id == game_uuid,
                models.Move.notation != "start"
            ).all()
            
            num_actual_moves = len(real_moves)
            
            # SZABÁLY: A meccs akkor hivatalos, ha a felhasználó megtette a MÁSODIK lépését.
            # Ha Fehér (User): 1. lépés (1. ply), Bot válaszol (2. ply). A 3. ply lenne a User 2. lépése.
            # -> Kell legalább 3 fél-lépés az adatbázisban, hogy a 2. lépését megkezdhesse.
            
            # Ha Fekete (User): Bot kezd (1. ply), User 1. lépés (2. ply), Bot 2. lépés (3. ply).
            # -> Kell legalább 4 fél-lépés, hogy a User a 2. lépését megtegye.
            
            limit = 3 if user_color == chess.WHITE else 4

            if num_actual_moves < limit:
                game_rec.status = models.GameStatus.aborted
                reason = "Game Aborted"
            else:
                game_rec.status = models.GameStatus.finished
                if is_timeout:
                    # Aki épp jönne, annak járt le az ideje
                    winner = "Black" if board.turn == chess.WHITE else "White"
                    reason = f"{winner} wins on time"
                else:
                    # Feladásnál aki feladta, az veszít
                    winner = "Black" if user_color == chess.WHITE else "White"
                    reason = f"{winner} wins by resignation"

            db.commit()
            return {"status": game_rec.status.value, "reason": reason, "is_game_over": True, "new_fen": board.fen()}

        # --- 2. NORMÁL LÉPÉS KEZELÉSE ---
        user_move = chess.Move.from_uci(move_uci)
        if user_move not in board.legal_moves:
            # Auto-promotion Queen
            promo_move = chess.Move.from_uci(move_uci + "q")
            if promo_move in board.legal_moves:
                user_move = promo_move
            else:
                raise HTTPException(status_code=400, detail="Illegal move")

        user_move_san = board.san(user_move)
        board.push(user_move)
        
        # Mentés
        move_count = db.query(models.Move).filter(models.Move.game_id == game_uuid).count()
        db.add(models.Move(game_id=game_uuid, move_number=move_count, notation=user_move_san, fen_before=board.fen()))
        db.commit()

        # --- 3. BOT VÁLASZA (Csak ha a User lépése után nincs vége) ---
        bot_res = {"from": "", "to": "", "san": "", "is_capture": False}
        if not board.is_game_over():
            engine_proc = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
            result = engine_proc.play(board, chess.engine.Limit(time=0.4))
            
            bot_res["from"] = chess.square_name(result.move.from_square)
            bot_res["to"] = chess.square_name(result.move.to_square)
            bot_res["san"] = board.san(result.move)
            
            board.push(result.move)
            engine_proc.quit()

            db.add(models.Move(
                game_id=game_uuid, 
                move_number=move_count + 1, 
                notation=bot_res["san"], 
                fen_before=board.fen()
            ))
            db.commit()

        # Végső ellenőrzés (Matt, Patt, stb.)
        final_status_enum, final_reason = get_game_over_details(board)
        if final_status_enum != models.GameStatus.ongoing:
            game_rec.status = final_status_enum
            db.commit()

        return {
            "new_fen": board.fen(),
            "is_game_over": final_status_enum != models.GameStatus.ongoing,
            "status": final_status_enum.value,
            "reason": final_reason,
            "bot_move": bot_res
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    
@router.post("/offer-draw")
def offer_draw(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    game_uuid = uuid.UUID(data.get("game_id"))
    game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
    if game:
        game.status = models.GameStatus.draw
        db.commit()
        return {"status": "draw", "reason": "Draw by agreement"}
    return {"status": "not_found"}