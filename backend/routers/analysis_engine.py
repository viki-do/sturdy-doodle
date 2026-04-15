import chess
import math
import chess.polyglot
import os

class ChessCoachEngine:
    def __init__(self, book_bin_path="data/titans.bin"):
        # A win probability kiszámításához használt konstans
        self.WIN_CHANCE_CONSTANT = 400.0 
        self.book_bin_path = book_bin_path

    def get_win_chance(self, cp_score):
        """Kiszámítja a nyerési esélyt (0.0 - 1.0) centipawn pontszámból."""
        if cp_score is None: 
            return 0.5
        # Matt kezelése: 9000+ pont Stockfishnél
        if abs(cp_score) > 9000:
            return 1.0 if cp_score > 0 else 0.0
        return 1 / (1 + math.pow(10, -cp_score / self.WIN_CHANCE_CONSTANT))

    def analyze_position_deep(self, board, engine, depth=20, multipv=3):
        """Mélyelemzés variációkkal a Sandboxhoz és a Review-hoz."""
        book_move = None
        if os.path.exists(self.book_bin_path):
            try:
                with chess.polyglot.open_reader(self.book_bin_path) as reader:
                    entry = reader.find(board)
                    book_move = entry.move.uci()
            except:
                pass

        # Stockfish mélyelemzés
        
        # ChessCoachEngine.py-ban módosítsd:
        analysis = engine.analyse(board, chess.engine.Limit(nodes=1000000), multipv=multipv)
        lines = []
        for entry in analysis:
            score = entry["score"].white().score(mate_score=10000)
            # Győződjünk meg róla, hogy a PV listában Move objektumok vannak
            pv_moves = entry.get("pv", [])
            
            # analysis_engine.py részlet
            lines.append({
                "eval": score / 100.0 if abs(score) < 5000 else f"M{int((10000-abs(score))/100)}",
                "raw_eval": score,
                # Itt módosítsd 20-ra, hogy 10 teljes lépés legyen!
                "continuation": board.variation_san(entry["pv"][:30]), 
                "pv_uci": [m.uci() for m in entry["pv"][:30]],
                "first_move_san": board.san(entry["pv"][0])
            })

        return {
            "is_book": book_move is not None,
            "book_move": book_move,
            "engine_lines": lines,
            "best_move": lines[0]["first_move_san"] if lines else None,
            "raw_analysis": analysis
        }
    def get_game_phase(self, board):
        phase_score = 0
        piece_values = {chess.QUEEN: 9, chess.ROOK: 5, chess.BISHOP: 3, chess.KNIGHT: 3}
        for piece in board.piece_map().values():
            if piece.piece_type in piece_values:
                phase_score += piece_values[piece.piece_type]
        
        move_count = board.fullmove_number
        if phase_score > 40 and move_count <= 12: 
            return "opening"
        elif phase_score < 14: 
            return "endgame"
        else: 
            return "middlegame"

    def is_sacrifice(self, board, move):
        mover = board.piece_at(move.from_square)
        target = board.piece_at(move.to_square)
        if not mover: return False
        
        piece_vals = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
        val_mover = piece_vals.get(mover.piece_type, 0)
        val_target = piece_vals.get(target.piece_type, 0) if target else 0

        if val_mover > val_target:
            if board.is_attacked_by(not board.turn, move.to_square):
                return True
        return False

    def classify_move(self, board, move, analysis_list, prev_eval, player_elo=1200, is_book=False):
        if is_book:
            return "book", prev_eval

        is_white = board.turn == chess.WHITE
        best_move_info = analysis_list[0]
        best_eval = best_move_info["score"].white().score(mate_score=10000)
        
        if board.legal_moves.count() == 1:
            return "best", best_eval

        actual_move_info = next((a for a in analysis_list if a["pv"][0] == move), None)
        if actual_move_info:
            move_eval = actual_move_info["score"].white().score(mate_score=10000)
        else:
            # Ha a lépés nincs a Multi-PV listában, akkor az rosszabb, mint a 3. legjobb.
            # Itt egy fix büntetés helyett érdemes a 3. PV értéke alá lőni egy kicsivel.
            move_eval = best_eval - 200 if is_white else best_eval + 200

        p_prev = self.get_win_chance(prev_eval if is_white else -prev_eval)
        p_best = self.get_win_chance(best_eval if is_white else -best_eval)
        p_curr = self.get_win_chance(move_eval if is_white else -move_eval)
        
        loss = p_best - p_curr
        delta_prev = p_prev - p_curr 

        # --- STABILIZÁLT PRIORITÁSOK ---
        # Brilliant: Csak ha tényleges áldozat ÉS a motor stabilan jónak látja
        if self.is_sacrifice(board, move) and loss < 0.015 and 0.40 < p_curr < 0.95:
            mover_piece = board.piece_at(move.from_square)
            if mover_piece and mover_piece.piece_type != chess.PAWN:
                return "brilliant", move_eval

        # Great: Ha sokkal jobb, mint a 2. legjobb lehetőség
        if len(analysis_list) > 1:
            score_2nd = analysis_list[1]["score"].white().score(mate_score=10000)
            p_second = self.get_win_chance(score_2nd if is_white else -score_2nd)
            if (p_best - p_second) > 0.15 and loss < 0.005: 
                return "great", move_eval

        # Hibák besorolása (kicsit megemelt küszöbök a stabilitásért)
        if p_best > p_prev + 0.20 and p_curr < p_prev + 0.02: return "miss", move_eval
        if delta_prev > 0.20 or loss > 0.30: return "blunder", move_eval
        if delta_prev > 0.10 or loss > 0.15: return "mistake", move_eval
        if delta_prev > 0.04 or loss > 0.08: return "inaccuracy", move_eval

        # Pozitív címkék
        if loss < 0.003: return "best", move_eval       # Nagyon szigorú 'best'
        if loss < 0.015: return "excellent", move_eval  # Megengedőbb 'excellent'
        if loss < 0.045: return "good", move_eval
        
        return "inaccuracy", move_eval

    def calculate_accuracy(self, win_chance_losses, win_probs_before):
        if not win_chance_losses: return 100.0
        move_accs = [100 * math.pow(1 - loss, 12) for loss in win_chance_losses]
        avg_acc = sum(move_accs) / len(move_accs)
        return round(max(avg_acc, 5.0), 1)