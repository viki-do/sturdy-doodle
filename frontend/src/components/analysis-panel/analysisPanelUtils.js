import { Chess } from 'chess.js';

export const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const getFenTurn = (fen) => {
    try {
        return new Chess(fen || DEFAULT_FEN).turn();
    } catch {
        return 'w';
    }
};

export const getFenMoveNumber = (fen) => {
    const fenParts = (fen || '').trim().split(/\s+/);
    const fullmove = Number.parseInt(fenParts[5], 10);

    if (Number.isFinite(fullmove)) return fullmove;

    try {
        return new Chess(fen || DEFAULT_FEN).moveNumber();
    } catch {
        return 1;
    }
};

export const getAnalysisColor = (label) => {
    const key = label?.toLowerCase();
    switch (key) {
        case 'brilliant': return 'text-[#1baca6]';
        case 'great': return 'text-[#5c8bb0]';
        case 'best':
        case 'excellent':
        case 'good': return 'text-[#81b64c]';
        case 'inaccuracy': return 'text-[#f0c15c]';
        case 'mistake': return 'text-[#ffa459]';
        case 'blunder': return 'text-[#fa412d]';
        case 'miss': return 'text-[#ff4b2b]';
        case 'book': return 'text-[#a88865]';
        default: return 'text-[#bab9b8]';
    }
};

export const getVariationFen = (pvUci, currentMoveData) => {
    if (!pvUci || !Array.isArray(pvUci)) return null;
    const baseFen = currentMoveData?.fen || DEFAULT_FEN;
    const tempChess = new Chess(baseFen);
    try {
        for (const uci of pvUci) {
            tempChess.move({
                from: uci.slice(0, 2),
                to: uci.slice(2, 4),
                promotion: uci[4] || 'q'
            });
        }
        return tempChess.fen();
    } catch {
        return null;
    }
};

export const getCurrentMoveData = ({ history, viewIndex, currentFen, initialAnalysis }) => {
    if (history.length === 0) {
        return initialAnalysis ? {
            fen: currentFen,
            engineLines: initialAnalysis.engineLines || [],
            engine_lines: initialAnalysis.engineLines || [],
            eval: initialAnalysis.eval
        } : { fen: currentFen, engineLines: [], engine_lines: [] };
    }

    return viewIndex === -1 ? history[history.length - 1] : history[viewIndex];
};

export const getDisplayLines = ({ history, viewIndex, initialAnalysis, currentMoveData }) => {
    if (viewIndex !== -1 && history[viewIndex]) {
        return history[viewIndex].engineLines || history[viewIndex].engine_lines || [];
    }
    if (history.length > 0 && viewIndex === -1) {
        return history[history.length - 1].engineLines || history[history.length - 1].engine_lines || [];
    }
    if (history.length === 0 && initialAnalysis) {
        return currentMoveData.engineLines || currentMoveData.engine_lines || [];
    }
    return [];
};

export const buildAnalysisMoveRows = ({ history, currentFen, resultLabel, currentMoveData }) => {
    const rows = [];
    let index = 0;

    while (index < history.length) {
        const currentMove = history[index];
        const fenBefore = currentMove?.fen_before || currentFen || DEFAULT_FEN;
        const moveTurn = getFenTurn(fenBefore);
        const displayNum = getFenMoveNumber(fenBefore);

        if (moveTurn === 'b') {
            rows.push({
                type: 'black-only',
                key: `row-${index}`,
                index,
                displayNum,
                currentMove,
            });
            index += 1;
        } else {
            const nextMove = history[index + 1];
            const canPairBlackMove = nextMove &&
                getFenTurn(nextMove.fen_before || DEFAULT_FEN) === 'b' &&
                getFenMoveNumber(nextMove.fen_before || DEFAULT_FEN) === displayNum;

            rows.push({
                type: 'pair',
                key: `row-${index}`,
                index,
                displayNum,
                currentMove,
                nextMove,
                canPairBlackMove,
            });
            index += canPairBlackMove ? 2 : 1;
        }
    }

    if (resultLabel) {
        const resultFen = currentMoveData?.fen || currentFen || DEFAULT_FEN;
        rows.push({
            type: 'result',
            key: 'result-row',
            resultTurn: getFenTurn(resultFen),
        });
    }

    return rows;
};
