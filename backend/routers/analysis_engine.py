import chess
import math

class ChessCoachEngine:
    def __init__(self):
        self.WIN_CHANCE_CONSTANT = 400.0 

    def get_win_chance(self, cp_score):
        if cp_score is None: return 0.5
        if isinstance(cp_score, str) and cp_score.startswith('M'):
            mate_val = int(cp_score[1:])
            # Matt esetén 100% vagy 0%
            return 1.0 if mate_val > 0 else 0.0
        if cp_score > 5000: return 1.0
        if cp_score < -5000: return 0.0
        return 1 / (1 + math.pow(10, -cp_score / self.WIN_CHANCE_CONSTANT))

    def get_game_phase(self, board):
        phase_score = 0
        piece_values = {chess.QUEEN: 9, chess.ROOK: 5, chess.BISHOP: 3, chess.KNIGHT: 3}
        for piece in board.piece_map().values():
            if piece.piece_type in piece_values:
                phase_score += piece_values[piece.piece_type]
        move_count = board.fullmove_number
        if phase_score > 40 and move_count <= 12: return "opening"
        elif phase_score < 14: return "endgame"
        else: return "middlegame"

    def classify_move(self, board, move, analysis_list, prev_eval, player_elo=1200, is_book=False):
        if is_book:
            return "book", prev_eval

        is_white = board.turn == chess.WHITE
        best_move_info = analysis_list[0]
        best_eval = best_move_info["score"].white().score(mate_score=10000)
        
        # Kényszerített lépés (Forced move) detektálása
        if board.legal_moves.count() == 1:
            return "best", best_eval

        actual_move_info = next((a for a in analysis_list if a["pv"][0] == move), None)
        if actual_move_info:
            move_eval = actual_move_info["score"].white().score(mate_score=10000)
        else:
            move_eval = best_eval - 150 if is_white else best_eval + 150

        p_prev = self.get_win_chance(prev_eval if is_white else -prev_eval)
        p_best = self.get_win_chance(best_eval if is_white else -best_eval)
        p_curr = self.get_win_chance(move_eval if is_white else -move_eval)
        loss = p_best - p_curr
        
        elo_buffer = max(0, (2000 - player_elo) / 18000)

        # Matt kezelés
        if board.is_checkmate() or abs(move_eval) > 9000:
            return "best", move_eval

        # MISS detektálás (Chess.com stílusú Miss)
        if p_best > p_prev + 0.12 and p_curr < p_prev + 0.02:
            return "miss", move_eval

        # BRILLIANT / GREAT
        if self.is_sacrifice(board, move) and loss < 0.02 and p_curr > 0.4:
            return "brilliant", move_eval

        if len(analysis_list) > 1:
            score_obj = analysis_list[1]["score"].white()
            p_second = self.get_win_chance(score_obj.score(mate_score=10000) if is_white else -score_obj.score(mate_score=10000))
            if (p_best - p_second) > 0.12 and loss < 0.01:
                return "great", move_eval

        # NAGY ELŐNY/HÁTRÁNY KEZELÉSE (A 3. meccsed tanulsága)
        # Ha az esély > 90% (vagy < 10%), a Chess.com szinte mindent Excellentnek vesz
        if p_prev > 0.9 or p_prev < 0.1:
            if loss < 0.10: return "excellent", move_eval
            if loss < 0.20: return "good", move_eval

        # Standard skála
        if loss < 0.005: return "best", move_eval
        if loss < 0.025 + elo_buffer: return "excellent", move_eval
        if loss < 0.06 + elo_buffer: return "good", move_eval
        if loss < 0.12 + elo_buffer: return "inaccuracy", move_eval
        if loss < 0.22 + elo_buffer: return "mistake", move_eval
        return "blunder", move_eval

    def is_sacrifice(self, board, move):
        piece_vals = {1:1, 2:3, 3:3, 4:5, 5:9, 6:0}
        mover = board.piece_at(move.from_square)
        target = board.piece_at(move.to_square)
        if not mover: return False
        val_mover = piece_vals.get(mover.piece_type, 0)
        val_target = piece_vals.get(target.piece_type, 0) if target else 0
        if val_mover > val_target and board.is_attacked_by(not board.turn, move.to_square):
            return True
        return False

    def calculate_accuracy(self, win_chance_losses, win_probs_before):
        """Szigorított, de sávosan elnéző pontosság számítás"""
        if not win_chance_losses: return 100.0
        
        move_accs = []
        for loss, p_before in zip(win_chance_losses, win_probs_before):
            # A Chess.com-nál a hiba akkor fáj a legjobban, ha kiegyenlített az állás (0.5)
            # Ha már valaki 95%-on áll, egy hiba szinte semmit nem von le.
            
            if p_before > 0.92 or p_before < 0.08:
                # Nagyon eldőlt állásban a büntetés minimális
                acc = 100 * math.exp(-1.5 * loss)
                weight = 0.3
            else:
                # Szoros állásban kemény büntetés (-7.0 szorzó)
                acc = 100 * math.exp(-7.0 * loss)
                weight = 1.0
            
            move_accs.append(acc * weight)
            
        return round(sum(move_accs) / sum([0.3 if (p > 0.92 or p < 0.08) else 1.0 for p in win_probs_before]), 1)