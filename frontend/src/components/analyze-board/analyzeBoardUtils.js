import { Chess } from 'chess.js';

export const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const getPieceName = (piece) => {
    const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
    return names[piece.toLowerCase()];
};

export const getSandboxGameState = (fen) => {
    try {
        const board = new Chess(fen || DEFAULT_FEN);

        if (board.isCheckmate()) {
            const winner = board.turn() === 'w' ? 'Black' : 'White';
            return { status: 'checkmate', reason: `${winner} wins by checkmate` };
        }

        if (board.isStalemate()) {
            return { status: 'draw', reason: 'Draw by stalemate' };
        }

        if (board.isInsufficientMaterial()) {
            return { status: 'draw', reason: 'Draw by insufficient material' };
        }

        if (board.isThreefoldRepetition()) {
            return { status: 'draw', reason: 'Draw by repetition' };
        }

        if (board.isDrawByFiftyMoves()) {
            return { status: 'draw', reason: 'Draw by 50-move rule' };
        }

        if (board.isDraw()) {
            return { status: 'draw', reason: 'Draw' };
        }

        return { status: 'ongoing', reason: '' };
    } catch {
        return { status: 'ongoing', reason: '' };
    }
};

export const getResultLabel = (sandboxStatus, sandboxFen) => {
    if (sandboxStatus === 'draw') return '1/2-1/2';

    if (sandboxStatus === 'checkmate') {
        try {
            const board = new Chess(sandboxFen || DEFAULT_FEN);
            return board.turn() === 'w' ? '0-1' : '1-0';
        } catch {
            return null;
        }
    }

    return null;
};
