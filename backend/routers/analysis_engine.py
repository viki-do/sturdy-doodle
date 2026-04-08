import chess
import math

class ChessCoachEngine:
    def __init__(self):
        # A logisztikai görbe meredeksége (Chess.com/Lichess standard)
        self.WIN_CHANCE_CONSTANT = 400.0 

    def get_win_chance(self, cp_score):
        """Centipawn (vagy Mate) -> Win Chance (0.0 - 1.0)"""
        if cp_score is None: return 0.5
        # Mate kezelése: Mate pontszámok (pl. 10000 felettiek)
        if cp_score > 5000: return 1.0
        if cp_score < -5000: return 0.0
        return 1 / (1 + math.pow(10, -cp_score / self.WIN_CHANCE_CONSTANT))

    def get_game_phase(self, board):
        """Meghatározza a játék szakaszát a bábuk értéke és a lépésszám alapján."""
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

    def classify_move(self, board, move, analysis_list, prev_eval):
        """
        A projekt lelke: részletes kategorizálás.
        analysis_list: Stockfish MultiPV eredmények (a legjobb lépések listája)
        """
        is_white = board.turn == chess.WHITE
        
        # 1. A legjobb elméleti lépés adatai
        best_move_info = analysis_list[0]
        best_eval = best_move_info["score"].white().score(mate_score=10000)
        
        # 2. A játékos által megtett lépés értékelése
        # Megkeressük a listában a játékos lépését, ha nincs benne, az nagyon rossz
        actual_move_info = next((a for a in analysis_list if a["pv"][0] == move), None)
        
        if actual_move_info:
            move_eval = actual_move_info["score"].white().score(mate_score=10000)
        else:
            # Ha nincs a top MultiPV-ben, egy gyors külön elemzés kellene, 
            # de egyszerűsítve: legyen sokkal rosszabb
            move_eval = best_eval - 150 if is_white else best_eval + 150

        # Win Chance számítások
        p_prev = self.get_win_chance(prev_eval if is_white else -prev_eval)
        p_curr = self.get_win_chance(move_eval if is_white else -move_eval)
        p_best = self.get_win_chance(best_eval if is_white else -best_eval)
        
        loss = p_best - p_curr
        
        # --- SPECIÁLIS KATEGÓRIÁK ---

        # 1. BRILLIANT (!!) - Áldozat, ami Best vagy Excellent
        if loss < 0.02 and self.is_sacrifice(board, move):
            return "brilliant", move_eval

        # 2. GREAT (!) - Az egyetlen jó lépés a táblán
        if len(analysis_list) > 1:
            second_best_eval = analysis_list[1]["score"].white().score(mate_score=10000)
            p_second = self.get_win_chance(second_best_eval if is_white else -second_best_eval)
            if (p_best - p_second) > 0.15 and loss < 0.01:
                return "great", move_eval

        # 3. MISS (X) - Nem büntetett hiba
        if p_best > p_prev + 0.18 and p_curr < p_prev + 0.05:
            return "miss", move_eval

        # --- STANDARD SKÁLA ---
        if loss < 0.008: return "best", move_eval
        if loss < 0.035: return "excellent", move_eval
        if loss < 0.075: return "good", move_eval
        if loss < 0.15:  return "dubious", move_eval
        if loss < 0.25:  return "mistake", move_eval
        return "blunder", move_eval

    def is_sacrifice(self, board, move):
        """Egyszerűsített anyagi áldozat detektálás."""
        captured = board.piece_at(move.to_square)
        mover = board.piece_at(move.from_square)
        if not mover: return False

        piece_vals = {1:1, 2:3, 3:3, 4:5, 5:9, 6:0}
        val_mover = piece_vals.get(mover.piece_type, 0)
        val_cap = piece_vals.get(captured.piece_type, 0) if captured else 0

        # Ha értékesebb bábuval ütünk olcsóbbat, vagy üres mezőre lépünk, 
        # ahol leüthetnek, de a motor szerint jó.
        if val_mover > val_cap and board.is_attacked_by(not board.turn, move.to_square):
            return True
        return False

    def calculate_accuracy(self, win_chance_losses):
        """Chess.com-nál pontosabb Accuracy formula."""
        if not win_chance_losses: return 100.0
        avg_loss = sum(win_chance_losses) / len(win_chance_losses)
        # Exponenciális büntetés a hibákra
        accuracy = 100 * math.exp(-2.5 * avg_loss)
        return round(max(0, min(100, accuracy)), 1)