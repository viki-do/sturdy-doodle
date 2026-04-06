import React from 'react';

const MoveListPanel = ({ 
    history, 
    viewIndex, 
    status, 
    goToMove, 
    handleResign, 
    renderNotation, 
    startNewGame,
    isPopupClosed,
    isPopupVisible,
    isFlipped,
    onFlipBoard,
    setIsSelectingBot,
    setGameId,
    reason,
    offerDraw,
    userChoiceColor,      // ÚJ: A hook-ból jön
    difficultyChoice,    // ÚJ: A hook-ból jön
    resetGame
}) => {
    const isOngoing = status === "ongoing";
    const isGameOver = status === "resigned" || status === "checkmate" || status === "draw" || status === "stalemate";
    const showEndGameUI = isGameOver && isPopupClosed && !isPopupVisible;

    // --- LOGIKA: Fél-lépések párosítása ---
    const movesOnly = history.filter(m => m.m !== "start");
    const rows = [];
    for (let i = 0; i < movesOnly.length; i += 2) {
        rows.push({
            moveNumber: Math.floor(i / 2) + 1,
            white: movesOnly[i],           
            black: movesOnly[i + 1] || null 
        });
    }

    const getHistoryIndex = (moveObj) => moveObj ? history.findIndex(h => h.num === moveObj.num) : -1;

    // --- EREDMÉNY MEGHATÁROZÁSA ---
    const getResultData = () => {
        if (!isGameOver) return null;
        
        if (reason) {
            const rLower = reason.toLowerCase();
            
            if (rLower.includes("white wins")) {
                return { 
                    score: "1-0", 
                    winnerText: "White Won", 
                    reasonText: reason.includes("resignation") ? "by Resignation" : "by Checkmate" 
                };
            }
            if (rLower.includes("black wins")) {
                return { 
                    score: "0-1", 
                    winnerText: "Black Won", 
                    reasonText: reason.includes("resignation") ? "by Resignation" : "by Checkmate" 
                };
            }

            if (rLower.includes("draw")) {
                const reasonDetail = reason.replace(/Draw\s+/i, ""); 
                return { 
                    score: "1/2-1/2", 
                    winnerText: "Draw", 
                    reasonText: reasonDetail || "by Rule" 
                };
            }
        }

        // Fallback
        if (status === "resigned") {
            return isFlipped 
                ? { score: "1-0", winnerText: "White Won", reasonText: "by Resignation" }
                : { score: "0-1", winnerText: "Black Won", reasonText: "by Resignation" };
        }
        
        if (status === "checkmate") {
            const isWhiteLast = (movesOnly.length % 2 !== 0);
            return isWhiteLast 
                ? { score: "1-0", winnerText: "White Won", reasonText: "by Checkmate" }
                : { score: "0-1", winnerText: "Black Won", reasonText: "by Checkmate" };
        }

        if (status === "draw" || status === "stalemate") {
            return { score: "1/2-1/2", winnerText: "Draw", reasonText: "by Rule" };
        }
        
        return { score: "*", winnerText: "Game Over", reasonText: "" };
    };

    const result = getResultData();

    return (
        <div className="w-112.5 h-185 bg-[#262421] flex flex-col font-sans border border-chess-bg rounded-xl overflow-hidden shadow-2xl">
            
            {/* Felső Tabok */}
            <div className="grid grid-cols-4 bg-chess-panel-header border-b border-[#1b1a18]">
                <TopTab icon="fa-stopwatch" label={isOngoing ? "Play" : "Analysis"} active={true} />
                <TopTab icon="fa-plus" label="New Game" onClick={() => { 
                    resetGame(); // Ez a hookból jön, amit átadtál propként
                    setIsSelectingBot(true); 
                }} />
                <TopTab icon="fa-th" label="Games" />
                <TopTab icon="fa-users" label="Players" />
            </div>

            {/* Tartalmi rész */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-[#262421]">
                <div className="flex bg-chess-panel-header text-[13px] font-bold text-[#989795] border-b border-[#1b1a18] sticky top-0 z-10">
                    <div className="py-3 px-8 border-b-2 border-white text-white cursor-pointer bg-[#262421]">Moves</div>
                    <div className="py-3 px-8 cursor-pointer hover:text-white transition-colors">Chat</div>
                    <div className="py-3 px-8 cursor-pointer hover:text-white transition-colors">Info</div>
                </div>

                <div className="flex flex-col">
                    {rows.map((row, i) => {
                        const whiteIdx = getHistoryIndex(row.white);
                        const blackIdx = getHistoryIndex(row.black);
                        return (
                            <div key={i} className={`flex h-10 items-center ${i % 2 === 0 ? 'bg-[#2b2926]' : 'bg-transparent'} hover:bg-[#33312e]/50`}>
                                <div className="w-10 text-center text-[#666] text-[13px] font-semibold shrink-0">{row.moveNumber}.</div>
                                <div onClick={() => goToMove(whiteIdx)} className={`w-24 h-8 flex items-center px-2 cursor-pointer font-bold text-[14px] rounded-sm transition-colors ${viewIndex === whiteIdx ? 'bg-[#403d39] text-white' : 'text-[#bab9b8] hover:bg-[#33312e]'}`}>
                                    {renderNotation(row.white.m)}
                                </div>
                                <div onClick={() => row.black && goToMove(blackIdx)} className={`w-24 h-8 flex items-center px-2 cursor-pointer font-bold text-[14px] rounded-sm transition-colors ${row.black && viewIndex === blackIdx ? 'bg-[#403d39] text-white' : 'text-[#bab9b8] hover:bg-[#33312e]'}`}>
                                    {row.black ? renderNotation(row.black.m) : ""}
                                </div>
                                <div className="flex-1"></div>
                                <div className="w-16 flex flex-col justify-center pr-3 border-l border-chess-bg/30">
                                    <div className="flex items-center justify-end gap-1 leading-none text-[10px] text-[#989795]">
                                        {row.white.t || "0.1"}s <div className="w-0.75 h-3 bg-[#bab9b8] rounded-full opacity-40"></div>
                                    </div>
                                    {row.black && (
                                        <div className="flex items-center justify-end gap-1 leading-none text-[10px] text-[#666]">
                                            {row.black.t}s <div className="w-0.75 h-3 bg-[#666] rounded-full opacity-40"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {showEndGameUI && result && (
                        <div className="mt-4 mx-2 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center justify-between px-4 py-4 bg-chess-panel-header border border-chess-bg rounded-md shadow-inner">
                                <div className="flex items-center gap-4">
                                    <span className="text-white font-black text-2xl tracking-tighter">{result.score}</span>
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-sm leading-none">{result.winnerText}</span>
                                        <span className="text-[#989795] text-[11px] uppercase font-bold tracking-wider mt-1">{result.reasonText}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center w-10 h-10 bg-[#2b2a27] rounded-full border border-chess-bg">
                                    <i className="fas fa-trophy text-[#fbbf24] text-lg"></i>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Alsó vezérlők */}
            <div className="bg-chess-panel-header flex flex-col border-t border-[#1b1a18]">
    {showEndGameUI && (
        <div className="p-3 border-b border-chess-bg bg-chess-panel-header animate-in fade-in duration-300">
            <button onClick={() => window.location.reload()} className="w-full py-3 bg-[#81b64c] hover:bg-[#a3d16a] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg text-lg active:scale-95">
                <i className="fas fa-microscope"></i> Game Review
            </button>
            <div className="grid grid-cols-2 gap-2 pt-3">
                
                {/* EZT A GOMBOT JAVÍTOTTUK KI: */}
                <button 
                    onClick={() => { 
                        resetGame();          // 1. Alaphelyzetbe teszi a táblát
                        setIsSelectingBot(true); // 2. Megnyitja a botválasztót
                    }} 
                    className="py-3 bg-chess-bg hover:bg-[#3d3a37] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all text-[15px] active:scale-95"
                >
                    <i className="fas fa-plus"></i> New Bot
                </button>

                <button 
                    onClick={() => startNewGame(difficultyChoice, userChoiceColor)} 
                    className="py-3 bg-chess-bg hover:bg-[#3d3a37] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all text-[15px] active:scale-95"
                >
                    <i className="fas fa-sync-alt"></i> Rematch
                </button>
            </div>
        </div>
    )}

                <div className="p-3 flex gap-1 bg-chess-panel-header">
                    <NavBtn icon="fa-step-backward" onClick={() => goToMove(0)} active={viewIndex !== 0} />
                    <NavBtn icon="fa-chevron-left" 
                        onClick={() => {
                            const currentIdx = viewIndex === -1 ? history.length - 1 : parseInt(viewIndex);
                            if (currentIdx > 0) goToMove(currentIdx - 1);
                        }} 
                        active={viewIndex !== 0} 
                    />
                    <div className="flex-1 bg-chess-bg rounded flex justify-center items-center cursor-pointer hover:bg-[#3b3835]">
                        <i className="fas fa-play text-white text-sm"></i>
                    </div>
                    <NavBtn icon="fa-chevron-right" 
                        onClick={() => {
                            if (viewIndex === -1) return;
                            const currentIdx = parseInt(viewIndex);
                            if (currentIdx < history.length - 1) goToMove(currentIdx + 1);
                            else goToMove(-1);
                        }} 
                        active={viewIndex !== -1} 
                    />
                    <NavBtn icon="fa-step-forward" onClick={() => goToMove(-1)} active={viewIndex !== -1} />
                </div>

                <div className="p-3 bg-chess-panel-header flex justify-between items-center text-[#989795] border-t border-[#1b1a18]">
                    {isOngoing ? (
                        <div className="flex gap-4 items-center">
                            <button 
                                onClick={offerDraw}
                                className="flex items-center gap-2 hover:text-white transition-colors"
                            >
                                <i className="fas fa-half-circle text-sm"></i>
                                <span className="text-[13px] font-bold">Draw</span>
                            </button>
                            <button onClick={handleResign} className="flex items-center gap-2 hover:text-white transition-colors text-[#e74c3c]"><i className="fas fa-flag text-sm"></i><span className="text-[13px] font-bold">Resign</span></button>
                        </div>
                    ) : (
                        <div className="flex gap-6 items-center w-full justify-center text-[#bab9b8]">
                            <i className="fas fa-share-alt hover:text-white cursor-pointer transition-colors text-lg"></i>
                            <i className="fas fa-download hover:text-white cursor-pointer transition-colors text-lg"></i>
                            <i className="fas fa-cog hover:text-white cursor-pointer transition-colors text-lg"></i>
                            <i onClick={onFlipBoard} className={`fas fa-sync-alt hover:text-white cursor-pointer transition-all text-lg ${isFlipped ? 'rotate-180 text-[#81b64c]' : ''}`} title="Flip Board"></i>
                        </div>
                    )}
                    {isOngoing && (
                        <i onClick={onFlipBoard} className={`fas fa-sync-alt hover:text-white cursor-pointer transition-transform hover:rotate-180 ${isFlipped ? 'text-[#81b64c]' : ''}`}></i>
                    )}
                </div>
            </div>
        </div>
    );
};

// ... TopTab és NavBtn definíciók változatlanok ...
const TopTab = ({ icon, label, active, onClick }) => (
    <div onClick={onClick} className={`flex flex-col items-center py-2 px-1 flex-1 cursor-pointer transition-colors border-b-2 ${active ? 'bg-[#262421] border-[#81b64c] text-white' : 'border-transparent text-[#989795] hover:bg-[#2b2926]'}`}>
        <i className={`fas ${icon} text-lg mb-1`}></i>
        <span className="text-[9px] font-bold uppercase">{label}</span>
    </div>
);

const NavBtn = ({ icon, onClick, active }) => (
    <button 
        onClick={active ? onClick : undefined}
        className={`w-14 h-10 rounded bg-chess-bg flex justify-center items-center text-[#bab9b8] transition-colors ${active ? 'hover:bg-[#3b3835] cursor-pointer text-white' : 'opacity-40 cursor-not-allowed'}`}
    >
        <i className={`fas ${icon} text-sm`}></i>
    </button>
);

export default MoveListPanel;