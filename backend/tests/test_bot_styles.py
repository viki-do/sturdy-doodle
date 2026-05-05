import os
import sys
import unittest
from unittest.mock import patch

import chess

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from routers import game


def analysis_for(*moves):
    return [{"pv": [chess.Move.from_uci(move)]} for move in moves]


class BotStyleTests(unittest.TestCase):
    def test_stockfish_style_always_uses_top_engine_move(self):
        board = chess.Board("4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1")

        move = game.choose_styled_bot_move(
            board,
            analysis_for("e2a2", "e2e7"),
            bot_style="stockfish",
            bot_elo=1500,
        )

        self.assertEqual(move, chess.Move.from_uci("e2a2"))

    def test_attacker_prefers_forcing_check_when_available(self):
        board = chess.Board("4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1")

        with patch.object(game.random, "random", return_value=0.5), patch.object(
            game.random, "choice", side_effect=lambda moves: moves[0]
        ):
            move = game.choose_styled_bot_move(
                board,
                analysis_for("e2a2", "e2e7"),
                bot_style="attacker",
                bot_elo=1200,
            )

        self.assertEqual(move, chess.Move.from_uci("e2e7"))
        self.assertTrue(board.gives_check(move))

    def test_defensive_prefers_quiet_move_over_forcing_move(self):
        board = chess.Board("4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1")

        with patch.object(game.random, "random", return_value=0.5):
            move = game.choose_styled_bot_move(
                board,
                analysis_for("e2e7", "e2a2"),
                bot_style="defensive",
                bot_elo=1200,
            )

        self.assertEqual(move, chess.Move.from_uci("e2a2"))
        self.assertFalse(board.is_capture(move))
        self.assertFalse(board.gives_check(move))

    def test_low_elo_bot_can_blunder_to_worst_engine_option(self):
        board = chess.Board("4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1")

        with patch.object(game.random, "random", return_value=0.2):
            move = game.choose_styled_bot_move(
                board,
                analysis_for("e2a2", "e2e7", "e1d1"),
                bot_style="universal",
                bot_elo=400,
            )

        self.assertEqual(move, chess.Move.from_uci("e1d1"))

    def test_elo_is_mapped_to_stockfish_skill_level(self):
        self.assertEqual(game.get_skill_level_from_elo(250), 0)
        self.assertEqual(game.get_skill_level_from_elo(1500), 9)
        self.assertEqual(game.get_skill_level_from_elo(3000), 20)


if __name__ == "__main__":
    unittest.main()
