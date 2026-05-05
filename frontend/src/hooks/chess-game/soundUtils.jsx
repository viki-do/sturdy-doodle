export const getMoveSoundName = (san) => {
    if (!san) return null;
    if (san.includes('#')) return 'checkmate';
    if (san.includes('=')) return 'promote';
    if (san.includes('O-O')) return 'castle';
    if (san.includes('+')) return 'move-check';
    if (san.includes('x')) return 'capture';
    return 'move';
};

export const getMoveAttemptSoundName = (chess, moveAttempt) => {
    if (chess.isCheckmate()) return 'checkmate';
    if (chess.isStalemate() || chess.isDraw() || chess.isThreefoldRepetition()) return 'stalemate';
    if (moveAttempt.flags.includes('p') || moveAttempt.flags.includes('cp')) return 'promote';
    if (moveAttempt.flags.includes('k') || moveAttempt.flags.includes('q')) return 'castle';
    if (chess.isCheck()) return 'move-check';
    if (moveAttempt.captured || moveAttempt.flags.includes('e')) return 'capture';
    return 'move';
};

export const renderNotationText = (text) => {
    if (!text || text === "start") return "";
    const icons = { 'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘' };
    const firstChar = text[0];
    if (icons[firstChar]) {
        return (
            <span className="flex items-center">
                <span className="text-[1.3em] mr-0.5 leading-none">{icons[firstChar]}</span>
                {text}
            </span>
        );
    }
    return text;
};
