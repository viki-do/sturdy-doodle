export const getCapturedPieces = (fen) => {
    const defaults = {
        p: 8, n: 2, b: 2, r: 2, q: 1,
        P: 8, N: 2, B: 2, R: 2, Q: 1
    };
    const currentOnBoard = {};
    const position = (fen || '').split(' ')[0];

    for (const char of position) {
        if (/[a-zA-Z]/.test(char)) {
            currentOnBoard[char] = (currentOnBoard[char] || 0) + 1;
        }
    }

    const captured = { whiteSide: [], blackSide: [] };
    Object.keys(defaults).forEach(piece => {
        const count = defaults[piece] - (currentOnBoard[piece] || 0);
        for (let i = 0; i < count; i++) {
            if (piece === piece.toUpperCase()) captured.blackSide.push(piece.toLowerCase());
            else captured.whiteSide.push(piece);
        }
    });

    const order = ['p', 'n', 'b', 'r', 'q'];
    captured.whiteSide.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    captured.blackSide.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return captured;
};

export const getMaterialDiff = (captured) => {
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const whiteVal = captured.whiteSide.reduce((sum, p) => sum + values[p], 0);
    const blackVal = captured.blackSide.reduce((sum, p) => sum + values[p], 0);
    return whiteVal - blackVal;
};
