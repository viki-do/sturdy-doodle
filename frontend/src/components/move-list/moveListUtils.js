export const buildMoveRows = (history = []) => {
    const movesOnly = history.filter(m => m.m !== "start");
    const rows = [];

    for (let i = 0; i < movesOnly.length; i += 2) {
        rows.push({
            moveNumber: Math.floor(i / 2) + 1,
            white: movesOnly[i],
            black: movesOnly[i + 1] || null
        });
    }

    return rows;
};

export const getHistoryIndex = (history, moveObj) => (
    moveObj ? history.findIndex(h => h.num === moveObj.num) : -1
);

export const getFinalResult = ({ isOngoing, isGameOver, result, status, reason }) => {
    if (isOngoing || !isGameOver) return null;
    if (result) return result;

    if (status === "aborted" || (reason && reason.toLowerCase().includes("aborted"))) {
        return { score: "½-½", winnerText: "Game Aborted", reasonText: "Too few moves" };
    }

    if (reason) {
        const rLower = reason.toLowerCase();

        if (rLower.includes("white wins")) {
            let detail = "by Checkmate";
            if (rLower.includes("resignation")) detail = "by Resignation";
            if (rLower.includes("on time")) detail = "on Time";
            if (rLower.includes("stalemate")) detail = "by Stalemate";
            return { score: "1-0", winnerText: "White Won", reasonText: detail };
        }

        if (rLower.includes("black wins")) {
            let detail = "by Checkmate";
            if (rLower.includes("resignation")) detail = "by Resignation";
            if (rLower.includes("on time")) detail = "on Time";
            if (rLower.includes("stalemate")) detail = "by Stalemate";
            return { score: "0-1", winnerText: "Black Won", reasonText: detail };
        }

        if (rLower.includes("draw")) {
            const reasonDetail = reason.replace(/Draw\s+/i, "");
            return { score: "½-½", winnerText: "Draw", reasonText: reasonDetail || "by Rule" };
        }
    }

    return null;
};

export const buildAnalysisCsv = (rows) => {
    let csvContent = "Move,White Notation,White Eval,W Label,White Time,Black Notation,Black Eval,B Label,Black Time\n";

    rows.forEach(row => {
        const wM = row.white ? row.white.m : "";
        const wE = row.white && row.white.eval !== undefined ? (row.white.eval > 0 ? `+${row.white.eval}` : row.white.eval) : "";
        const wL = row.white?.analysisLabel ? row.white.analysisLabel.toUpperCase() : "GOOD";
        const wT = row.white && row.white.t !== undefined ? row.white.t : "0.0";

        const bM = row.black ? row.black.m : "";
        const bE = row.black && row.black.eval !== undefined ? (row.black.eval > 0 ? `+${row.black.eval}` : row.black.eval) : "";
        const bL = row.black?.analysisLabel ? row.black.analysisLabel.toUpperCase() : (row.black ? "GOOD" : "");
        const bT = row.black && row.black.t !== undefined ? row.black.t : "0.0";

        csvContent += `${row.moveNumber},${wM},${wE},${wL},${wT}s,${bM},${bE},${bL},${bT}s\n`;
    });

    return csvContent;
};
