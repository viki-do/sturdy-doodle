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
import json
import os
from .analysis_engine import ChessCoachEngine

router = APIRouter(tags=["Chess Game"])
coach = ChessCoachEngine()
# Globális változó a motornak
engine_singleton = None


STOCKFISH_PATH = "engine/stockfish.exe"
OPENING_BOOK = {}

def get_engine():
    global engine_singleton
    if engine_singleton is None:
        try:
            engine_singleton = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
        except Exception as e:
            print(f"Hiba a Stockfish indításakor: {e}")
            raise e
    return engine_singleton

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/analyze-full-game/{game_id}")
def analyze_full_game(game_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    game_uuid = uuid.UUID(game_id)
    
    # 1. Adatok lekérése a DB-ből
    game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
    moves = db.query(models.Move).filter(models.Move.game_id == game_uuid).order_by(models.Move.move_number.asc()).all()
    
    if not game or not moves:
        raise HTTPException(status_code=404, detail="Game or moves not found")

    # Felhasználó ELO-jának lekérése (vagy alapértelmezett 1200)
    # Ha van a user tábládban elo, itt húzd be, most fix 1200-zal számolunk
    player_elo = 1200 

    engine = get_engine()
    board = chess.Board()
    
    full_analysis = []
    phase_stats = {
        "opening": {"losses": [], "p_befores": [], "counts": {}},
        "middlegame": {"losses": [], "p_befores": [], "counts": {}},
        "endgame": {"losses": [], "p_befores": [], "counts": {}}
    }
    
    prev_eval = 30 # Kezdő érték (+0.3)
    
    # 2. LÉPÉSRŐL LÉPÉSRE ELEMZÉS
    for m in moves:
        if m.notation == "start":
            continue

        current_phase = coach.get_game_phase(board)
        
        # --- GYORSÍTÁS: BOOK MOVE ELLENŐRZÉS ---
        parts = board.fen().split()
        search_key = f"{parts[0]} {parts[1]}"
        is_book = search_key in OPENING_BOOK
        
        if is_book:
            # Ha benne van a könyvben, átugorjuk a Stockfisht
            label = "book"
            move_eval = prev_eval
            loss = 0.0
            best_move_san = m.notation
            p_before = coach.get_win_chance(prev_eval if board.turn == chess.WHITE else -prev_eval)
        else:
            # MÉLYELEMZÉS (Csak ha már nem BOOK lépés)
            analysis = engine.analyse(board, chess.engine.Limit(depth=18), multipv=3)
            
            try:
                player_move = board.parse_san(m.notation)
            except:
                player_move = board.parse_uci(m.notation)

            # Kategorizálás (ELO alapú skálázással)
            label, move_eval = coach.classify_move(board, player_move, analysis, prev_eval, player_elo)
            
            is_white = board.turn == chess.WHITE
            best_eval = analysis[0]["score"].white().score(mate_score=10000)
            
            # Win Chance számítások a statisztikához
            p_before = coach.get_win_chance(prev_eval if is_white else -prev_eval)
            wc_best = coach.get_win_chance(best_eval if is_white else -best_eval)
            wc_actual = coach.get_win_chance(move_eval if is_white else -move_eval)
            loss = max(0, wc_best - wc_actual)
            best_move_san = board.san(analysis[0]["pv"][0])

        # Statisztikák gyűjtése
        phase_stats[current_phase]["losses"].append(loss)
        phase_stats[current_phase]["p_befores"].append(p_before)
        phase_stats[current_phase]["counts"][label] = phase_stats[current_phase]["counts"].get(label, 0) + 1

        # Lépés mentése a listába
        full_analysis.append({
            "move_number": m.move_number,
            "notation": m.notation,
            "label": label,
            "eval": move_eval / 100.0 if abs(move_eval) < 5000 else f"M{int((10000-abs(move_eval))/100)}",
            "best_move": best_move_san,
            "phase": current_phase
        })

        # Tábla frissítése
        try:
            board.push_san(m.notation)
        except:
            board.push_uci(m.notation)
        prev_eval = move_eval

    # 3. ÖSSZEGZÉS GENERÁLÁSA
    summary = {}
    all_losses = []
    all_p_befores = []
    
    for phase in ["opening", "middlegame", "endgame"]:
        losses = phase_stats[phase]["losses"]
        p_befores = phase_stats[phase]["p_befores"]
        if losses:
            # Új calculate_accuracy hívás smoothing-gal
            acc = coach.calculate_accuracy(losses, p_befores)
            all_losses.extend(losses)
            all_p_befores.extend(p_befores)
            
            rating = "Best" if acc > 97 else "Great" if acc > 90 else "Excellent" if acc > 80 else "Good" if acc > 70 else "Inaccurate"
            summary[phase] = {
                "accuracy": acc,
                "rating": rating,
                "stats": phase_stats[phase]["counts"]
            }

    overall_accuracy = coach.calculate_accuracy(all_losses, all_p_befores)

    return {
        "game_id": game_id,
        "overall_accuracy": overall_accuracy,
        "summary": summary,
        "analysis": full_analysis,
        "player_color": game.player_color
    }


def get_skill_level_from_elo(elo: int) -> int:
    """Stockfish Skill Level (0-20) kiszámítása ELO alapján"""
    if elo <= 250: return 0
    if elo >= 3000: return 20
    # Skálázás 250 és 3000 között
    level = int((elo - 250) / (3000 - 250) * 20)
    return max(0, min(20, level))

def load_openings():
    global OPENING_BOOK
    # Az útvonal a data/openings mappára mutat
    base_path = os.path.join("data", "openings")
    
    for letter in ['A', 'B', 'C', 'D', 'E']:
        file_name = f"eco{letter}.json"
        full_path = os.path.join(base_path, file_name)
        
        if os.path.exists(full_path):
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    OPENING_BOOK.update(data)
            except Exception as e:
                print(f"Hiba a {file_name} betöltésekor: {e}")
    
    print(f"Sakk könyvtár kész: {len(OPENING_BOOK)} megnyitás betöltve.")

# Ez egyszer fusson le a szerver indulásakor
load_openings()

def get_opening_with_fallback(db: Session, game_id: uuid.UUID):
    # Lekérjük a lépéseket a legújabbtól a legrégebbi felé (move_number DESC)
    moves = db.query(models.Move).filter(
        models.Move.game_id == game_id
    ).order_by(models.Move.move_number.desc()).all()

    for m in moves:
        # Csak akkor nézzük meg, ha van elmentett FEN utána
        fen_to_check = m.fen_after if m.fen_after else m.fen_before
        if not fen_to_check:
            continue
            
        parts = fen_to_check.split()
        if len(parts) < 2:
            continue

        # Kulcs: pozíció és a soron következő szín
        search_key = f"{parts[0]} {parts[1]}"
        
        # 1. Gyors keresés a szótárban
        opening = OPENING_BOOK.get(search_key)
        
        # 2. Ha nincs meg, megnézzük a "startswith" módszerrel
        if not opening:
            for db_fen, info in OPENING_BOOK.items():
                if db_fen.startswith(search_key):
                    opening = info
                    break
        
        # Ha találtunk nevet, azonnal visszaadjuk (ez a legfrissebb ismert elmélet)
        if opening:
            return {
                "name": opening.get("name"),
                "eco": opening.get("eco")
            }

    return None

def rebuild_board(game_id: uuid.UUID, db: Session):
    # Csak a legutolsó lépést kérjük le (move_number alapján csökkenő sorrend, az első elem)
    last_move = db.query(models.Move).filter(
        models.Move.game_id == game_id
    ).order_by(models.Move.move_number.desc()).first()

    # Ha még nincs lépés (vagy csak a "start" sor van), alapállásból indulunk
    if not last_move or last_move.notation == "start":
        return chess.Board()

    # Ha van mentett 'fen_after', azonnal abból töltjük be a táblát
    if hasattr(last_move, 'fen_after') and last_move.fen_after:
        return chess.Board(last_move.fen_after)

    # TARTALÉK (Fallback): Ha valamiért nincs fen_after (pl. régi meccs), 
    # akkor lefut a régi lassú algoritmusod
    moves = db.query(models.Move).filter(models.Move.game_id == game_id).order_by(models.Move.move_number.asc()).all()
    board = chess.Board()
    for m in moves:
        if m.notation == "start" or not m.notation: continue
        try: board.push_san(m.notation)
        except:
            try: board.push_uci(m.notation)
            except: continue
    return board

@router.post("/create-game")
def create_game(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        u_uuid = uuid.UUID(user_id)
        chosen_color = data.get("color", "white")
        
        # --- ÚJ ADATOK FOGADÁSA ---
        bot_elo = data.get("bot_elo", 1500)
        bot_id = data.get("bot_id", "engine")
        bot_style = data.get("bot_style", "mix")
        
        # --- RANDOM SORSOLÁS (Backend oldalon) ---
        if chosen_color == "random":
            import random
            chosen_color = random.choice(["white", "black"])
        
        board = chess.Board()
        
        # --- ÚJ GAME REKORD MENTÉSE ---
        new_game = models.Game(
            white_player_id=u_uuid if chosen_color == "white" else None,
            black_player_id=u_uuid if chosen_color == "black" else None,
            player_color=chosen_color,
            bot_elo=bot_elo,
            bot_id=bot_id,
            bot_style=bot_style,
            time_category=models.GameCategory.rapid, # Alapértelmezett, vagy számold ki az időből
            base_time_sec=data.get("base_time", 600),
            status=models.GameStatus.ongoing
        )
        db.add(new_game)
        db.commit()
        db.refresh(new_game)

        # 0. lépés: Start mentése a Move táblába
        db.add(models.Move(
            game_id=new_game.id, 
            move_number=0, 
            notation="start", 
            fen_before=board.fen(), 
            fen_after=board.fen()
        ))
        db.commit()

        # --- BOT LÉPÉSE (HA A USER FEKETE, A BOT KEZD FEHÉRREL) ---
        if chosen_color == "black":
            from .stockfish_utils import get_engine # Ellenőrizd az importot!
            engine = get_engine()
            
            # Konfigurálás
            skill = get_skill_level_from_elo(bot_elo)
            engine.configure({"Skill Level": skill})
            
            # Időlimit meghatározása
            t_limit = 0.1 if bot_elo < 800 else 0.5
            
            # Bot lép
            result = engine.play(board, chess.engine.Limit(time=t_limit))
            
            move_san = board.san(result.move)
            fen_elotte = board.fen()
            board.push(result.move)
            
            # Bot első lépésének mentése
            db.add(models.Move(
                game_id=new_game.id, 
                move_number=1, 
                notation=move_san,
                fen_before=fen_elotte, 
                fen_after=board.fen()
            ))
            db.commit()

        return {
            "game_id": str(new_game.id), 
            "fen": board.fen(), 
            "player_color": chosen_color
        }
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc() # Ez kiírja a hibát a terminálba!
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

        # --- 1. ABORT / FINISH LOGIKA ---
        if is_timeout or is_resignation:
            real_moves = db.query(models.Move).filter(
                models.Move.game_id == game_uuid,
                models.Move.notation != "start"
            ).all()
            
            num_actual_moves = len(real_moves)
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

        # --- 2. USER LÉPÉSE ---
        if not move_uci or move_uci == "null":
             raise HTTPException(status_code=400, detail="Missing move data")

        try:
            user_move = chess.Move.from_uci(move_uci)
        except:
            promo_move = chess.Move.from_uci(move_uci + "q")
            if promo_move in board.legal_moves:
                user_move = promo_move
            else:
                raise HTTPException(status_code=400, detail="Invalid move format")

        if user_move not in board.legal_moves:
            raise HTTPException(status_code=400, detail="Illegal move")

        # Mentés a DB-be
        fen_elotte = board.fen()
        user_move_san = board.san(user_move)
        board.push(user_move)
        fen_utana = board.fen()

        move_count = db.query(models.Move).filter(models.Move.game_id == game_uuid).count()
        db.add(models.Move(
            game_id=game_uuid, 
            move_number=move_count, 
            notation=user_move_san, 
            fen_before=fen_elotte, 
            fen_after=fen_utana
        ))
        db.commit()

        # --- 3. BOT VÁLASZA (Személyiség és Blunder logika) ---
        bot_res = {"from": "", "to": "", "san": "", "evaluation": 0.0}
        chosen_move = None  # Alaphelyzetbe állítás a biztonság kedvéért

        if not board.is_game_over():
            import random
            engine = get_engine()
            bot_elo = game_rec.bot_elo or 1500
            bot_id = str(game_rec.bot_id).lower()
            bot_style = (game_rec.bot_style or "universal").lower()
            
            # Alap Stockfish konfiguráció az ELO alapján
            engine.configure({"Skill Level": get_skill_level_from_elo(bot_elo)})
            
            # Limit meghatározása (Beginner botok/engine rövidlátóak legyenek)
            limit_params = {"time": 0.1}
            if bot_elo < 800: 
                limit_params["nodes"] = 400
            
            # Szélesebb spektrumot kérünk (MultiPV 5), hogy legyen miből válogatni
            analysis = engine.analyse(board, chess.engine.Limit(**limit_params), multipv=5)
            
            if not analysis:
                chosen_move = list(board.legal_moves)[0]
            else:
                options = [a["pv"][0] for a in analysis]
                r = random.random()

                # --- ELÁGAZÁS: NYERS ENGINE vs. SZEMÉLYISÉGGEL RENDELKEZŐ BOT ---
                if bot_id == "engine":
                    # Az Engine mindig a legjobbat lépi, amit az adott Skill Levelen talál
                    chosen_move = options[0]
                    print(f"DEBUG: Nyers Engine lép (ELO: {bot_elo})")
                else:
                    # BOT SZEMÉLYISÉG LOGIKA
                    if bot_style == "attacker":
                        aggressive = [m for m in options if board.is_capture(m) or board.gives_check(m)]
                        chosen_move = random.choice(aggressive) if aggressive and r < 0.8 else options[0]

                    elif bot_style == "positional":
                        quiet = [m for m in options if not board.is_capture(m) and not board.gives_check(m)]
                        chosen_move = quiet[0] if quiet else options[0]

                    elif bot_style == "tactician":
                        # A taktikus 90%-ban pontos, de néha a trükkösebb 2. opciót választja
                        chosen_move = options[0] if r < 0.9 or len(options) < 2 else options[1]

                    elif bot_style == "universal":
                        chosen_move = options[0] if r < 0.7 else random.choice(options[:2])

                    elif bot_style == "prophylactic":
                        # Megelőző: kerüli az ütésbe lépést a top listából
                        safe = [m for m in options if not board.is_capture(m)]
                        chosen_move = safe[0] if safe else options[0]
                    
                    else:
                        chosen_move = options[0]

                    # --- KEZDŐ BLUNDER (Csak Botoknál, Engine-nél nem szándékos) ---
                    if bot_elo < 500 and r < 0.4 and len(options) > 1:
                        chosen_move = options[-1] 
                        print(f"DEBUG: Bot {game_rec.bot_id} szándékos hibát (blunder) vétett!")
                        
            # --- VÉGREHAJTÁS ÉS MENTÉS ---
            if chosen_move:
                print(f"DEBUG: Bot ({bot_style}) választott lépése: {chosen_move}")
                bot_res["san"] = board.san(chosen_move)
                bot_res["from"] = chess.square_name(chosen_move.from_square)
                bot_res["to"] = chess.square_name(chosen_move.to_square)
                
                # Evaluation (Mindig a legjobb lépés alapján az EvalBar-nak)
                try:
                    score = analysis[0]["score"].white()
                    bot_res["evaluation"] = f"M{score.mate()}" if score.is_mate() else score.score() / 100.0
                except:
                    bot_res["evaluation"] = 0.0

                # Tábla frissítése és mentése
                f_before = board.fen()
                board.push(chosen_move)
                f_after = board.fen()

                m_count = db.query(models.Move).filter(models.Move.game_id == game_uuid).count()
                db.add(models.Move(
                    game_id=game_uuid, 
                    move_number=m_count, 
                    notation=bot_res["san"], 
                    fen_before=f_before,
                    fen_after=f_after
                ))
                db.commit()
            else:
                print("DEBUG: Nem sikerült lépést választani!")

        # --- 4. MEGNYITÁS ÉS VÉGSZÓ ---
        opening_data = get_opening_with_fallback(db, game_uuid)

        final_status_enum, final_reason = get_game_over_details(board)
        if final_status_enum != models.GameStatus.ongoing:
            game_rec.status = final_status_enum
            db.commit()

        return {
            "new_fen": board.fen(),
            "is_game_over": final_status_enum != models.GameStatus.ongoing,
            "status": final_status_enum.value,
            "reason": final_reason,
            "bot_move": bot_res,
            "opening": opening_data,
            "evaluation": bot_res.get("evaluation", 0.0)
        }

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/game/{game_id}/history")
def get_game_history(game_id: str, db: Session = Depends(get_db)):
    try:
        game_uuid = uuid.UUID(game_id)
        game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")

        # Lépések lekérése időrendben
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
                    "fen": m.fen_before or board.fen(), 
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

        # --- AZ ÚJ, OKOS MEGNYITÁS KERESÉS ---
        # Itt is az új függvényt hívjuk, ami visszanéz a múltba, ha kell
        opening_data = get_opening_with_fallback(db, game_uuid)

        # --- PONTOS OK (REASON) MEGHATÁROZÁSA ---
        status_value = game.status.value if game.status else "ongoing"
        reason = "Match ongoing"
        
        if game.status == models.GameStatus.aborted:
            reason = "Game Aborted"
        elif game.status == models.GameStatus.resigned:
            user_color = str(game.player_color).lower()
            winner = "Black" if user_color == "white" else "White"
            reason = f"{winner} wins by resignation"
        elif game.status == models.GameStatus.checkmate:
            winner = "Black" if board.turn == chess.WHITE else "White"
            reason = f"{winner} wins by checkmate"
        elif game.status == models.GameStatus.finished:
            winner = "Black" if board.turn == chess.WHITE else "White"
            reason = f"{winner} wins on time"
        elif game.status == models.GameStatus.draw:
            if board.is_stalemate(): reason = "Draw by stalemate"
            elif board.is_insufficient_material(): reason = "Draw by insufficient material"
            elif board.can_claim_threefold_repetition(): reason = "Draw by repetition"
            elif board.can_claim_fifty_moves(): reason = "Draw by 50-move rule"
            else: reason = "Draw by agreement"

        return {
            "history": history_data,
            "status": status_value,
            "reason": reason,
            "opening": opening_data  # <--- Az intelligens adat megy vissza
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"history": [], "status": "ongoing", "reason": "Error", "opening": None}
    
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
    
    
@router.post("/offer-draw")
def offer_draw(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    game_uuid = uuid.UUID(data.get("game_id"))
    game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
    if game:
        game.status = models.GameStatus.draw
        db.commit()
        return {"status": "draw", "reason": "Draw by agreement"}
    return {"status": "not_found"}

