import chess
import math

class ChessCoachEngine:
    def __init__(self):
        # A win probability kiszámításához használt konstans
        self.WIN_CHANCE_CONSTANT = 400.0 

    def get_win_chance(self, cp_score):
        """Kiszámítja a nyerési esélyt (0.0 - 1.0) centipawn pontszámból."""
        if cp_score is None: 
            return 0.5
        # Matt kezelése: 9000+ pont Stockfishnél
        if abs(cp_score) > 9000:
            return 1.0 if cp_score > 0 else 0.0
        return 1 / (1 + math.pow(10, -cp_score / self.WIN_CHANCE_CONSTANT))

    def get_game_phase(self, board):
        """Meghatározza a játék fázisát az anyagi érték alapján."""
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
        """Áldozat detektálás: értékesebb figurát teszünk ütésbe vagy adunk el."""
        mover = board.piece_at(move.from_square)
        target = board.piece_at(move.to_square)
        if not mover: return False
        
        piece_vals = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
        val_mover = piece_vals.get(mover.piece_type, 0)
        val_target = piece_vals.get(target.piece_type, 0) if target else 0

        # Áldozat: ha értékesebb a figura, mint amit leüt, és leüthető a célmezőn
        if val_mover > val_target:
            if board.is_attacked_by(not board.turn, move.to_square):
                return True
        return False

    def classify_move(self, board, move, analysis_list, prev_eval, player_elo=1200, is_book=False):
        """Lépés osztályozása a kalibrált Chess.com algoritmus alapján."""
        if is_book:
            return "book", prev_eval

        is_white = board.turn == chess.WHITE
        best_move_info = analysis_list[0]
        best_eval = best_move_info["score"].white().score(mate_score=10000)
        
        # Kényszerített lépés kezelése
        if board.legal_moves.count() == 1:
            return "best", best_eval

        actual_move_info = next((a for a in analysis_list if a["pv"][0] == move), None)
        if actual_move_info:
            move_eval = actual_move_info["score"].white().score(mate_score=10000)
        else:
            # Ha a lépés nincs a top listában, súlyos büntetést kap
            move_eval = best_eval - 200 if is_white else best_eval + 200

        # Nyerési esélyek (az éppen lépő játékos szemszögéből)
        p_prev = self.get_win_chance(prev_eval if is_white else -prev_eval)
        p_best = self.get_win_chance(best_eval if is_white else -best_eval)
        p_curr = self.get_win_chance(move_eval if is_white else -move_eval)
        
        loss = p_best - p_curr      # Veszteség a legjobbhoz képest
        delta_prev = p_prev - p_curr # Romlás az előző állapothoz képest

        # --- CHESS.COM KALIBRÁLT PRIORITÁSI SORREND ---

        # 1. MISS (Kihagyott lehetőség)
        if p_best > p_prev + 0.18 and p_curr < p_prev + 0.01:
            return "miss", move_eval

        # 2. BLUNDER (Durva hiba)
        if delta_prev > 0.18 or loss > 0.25:
            return "blunder", move_eval

        # 3. MISTAKE (Hiba)
        if delta_prev > 0.08 or loss > 0.12:
            return "mistake", move_eval

        # 4. INACCURACY (Pontatlanság)
        if delta_prev > 0.035 or loss > 0.06:
            return "inaccuracy", move_eval

        # 5. GREAT MOVE (Kék ikon)
        if len(analysis_list) > 1:
            score_2nd = analysis_list[1]["score"].white().score(mate_score=10000)
            p_second = self.get_win_chance(score_2nd if is_white else -score_2nd)
            # Ha a legjobb és a második között nagy a szakadék, és mi a legjobbat léptük
            if (p_best - p_second) > 0.18 and loss < 0.002:
                return "great", move_eval

        # 6. BRILLIANT (Lila ikon - CSAK áldozat esetén)
        if self.is_sacrifice(board, move) and loss < 0.01 and 0.45 < p_curr < 0.92:
            mover_piece = board.piece_at(move.from_square)
            if mover_piece and mover_piece.piece_type != chess.PAWN:
                return "brilliant", move_eval

        # 7. POZITÍV CÍMKÉK (Szigorú határokkal)
        if loss < 0.002: return "best", move_eval
        if loss < 0.010: return "excellent", move_eval
        if loss < 0.035: return "good", move_eval
        
        return "inaccuracy", move_eval

    def calculate_accuracy(self, win_chance_losses, win_probs_before):
        """Chess.com-szerű hatványozott büntetés (Accuracy számítás)."""
        if not win_chance_losses: 
            return 100.0
        
        move_accs = []
        for loss in win_chance_losses:
            # A 12-es hatvány garantálja a 75% körüli eredményt hibák esetén
            acc = 100 * math.pow(1 - loss, 12) 
            move_accs.append(acc)
            
        avg_acc = sum(move_accs) / len(move_accs)
        
        # Minimum 5% pontosság, hogy ne legyen 0 közeli érték
        return round(max(avg_acc, 5.0), 1)