import React from 'react';
import { moves } from '../constants/review';

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
    reason,
    offerDraw,
    userChoiceColor,    
    difficultyChoice,    
    resetGame,
    lastTimeControl,
    result,
    opening,
    handleRunFullAnalysis,
    analysisData,
    isAnalyzing
}) => {
    const isOngoing = status === "ongoing";
    const isGameOver = ["resigned", "checkmate", "draw", "stalemate", "aborted", "finished"].includes(status);
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

    // --- ELEMZÉSI IKON RENDERELÉSE ---
    const renderMoveIcon = (move) => {
        if (!move || !move.analysisLabel) return null;
        const analysis = moves[move.analysisLabel];
        
        if (!analysis) return null;

        return (
            <img 
                src={analysis.src} 
                alt={analysis.label}
                title={`${analysis.label}: ${analysis.desc}`}
                className="w-4.5 h-4.5 ml-1.5 object-contain animate-in zoom-in duration-300" 
            />
        );
    };

    // --- EREDMÉNY MEGHATÁROZÁSA ---
    const finalResult = (() => {
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
                return { score: "1-0", winnerText: "White Won", reasonText: detail };
            }
            if (rLower.includes("black wins")) {
                let detail = "by Checkmate";
                if (rLower.includes("resignation")) detail = "by Resignation";
                if (rLower.includes("on time")) detail = "on Time";
                return { score: "0-1", winnerText: "Black Won", reasonText: detail };
            }
            if (rLower.includes("draw")) {
                const reasonDetail = reason.replace(/Draw\s+/i, "");
                return { score: "½-½", winnerText: "Draw", reasonText: reasonDetail || "by Rule" };
            }
        }

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

        if (["draw", "stalemate"].includes(status)) {
            return { score: "½-½", winnerText: "Draw", reasonText: "by Rule" };
        }

        return null;
    })();

    if (isAnalyzing) {
        return (
            <div className="w-112.5 h-185 bg-[#262421] flex flex-col items-center justify-center border border-chess-bg rounded-xl">
                <div className="w-12 h-12 border-4 border-[#81b64c] border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-white font-bold animate-pulse">Coach is analyzing...</div>
                <div className="text-[#8b8987] text-xs mt-2 uppercase">Depth 18</div>
            </div>
        );
    }

    // 2. Ha van elemzési adat, mutathatjuk az összefoglalót (Opcionális panel a tetejére)
    const renderAccuracyHeader = () => {
        if (!analysisData) return null;
        return (
            <div className="p-3 bg-chess-panel-header border-b border-[#3c3a37] flex justify-around items-center">
                <div className="text-center">
                    <div className="text-[10px] text-[#8b8987] uppercase font-bold">Accuracy</div>
                    <div className="text-xl font-black text-white">{analysisData.overall_accuracy}%</div>
                </div>
                {/* Itt lehetnek a fázisok is: Opening, Middle, End */}
            </div>
        );
    };

    return (
        <div className="w-112.5 h-185 bg-[#262421] flex flex-col font-sans border border-chess-bg rounded-xl overflow-hidden shadow-2xl">
            {renderAccuracyHeader()}
            {/* MEGNYITÁS KIJELZŐ SZEKCIÓ */}
            <div className="p-4 border-b border-[#3c3a37] bg-chess-panel-header flex flex-col justify-center min-h-17.5 transition-all duration-500">
                {opening ? (
                    <div className="animate-in fade-in duration-500">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[#8b8987] text-[11px] font-bold uppercase tracking-tight italic">
                                Opening
                            </span>
                        </div>
                        <div className="text-white font-bold text-[15px] leading-tight truncate">
                            {opening.name}
                        </div>
                    </div>
                ) : (
                    <div className="text-[#636261] text-sm italic h-full"></div>
                )}
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
                            <div key={i} className={`flex h-10 items-center ${i % 2 === 0 ? 'bg-[#2b2926]' : 'bg-transparent'}`}>
                                <div className="w-10 text-center text-[#666] text-[13px] font-semibold shrink-0">{row.moveNumber}.</div>
                                
                                {/* Világos lépése */}
                                <div 
                                    onClick={() => goToMove(whiteIdx)} 
                                    className={`w-28 h-8 flex items-center px-2 cursor-pointer font-bold text-[14px] transition-colors ${
                                        viewIndex === whiteIdx ? 'bg-[#3b3835] text-white rounded-sm' : 'text-[#bab9b8] hover:text-white'
                                    }`}
                                >
                                    {renderNotation(row.white.m)}
                                    {renderMoveIcon(row.white)}
                                </div>

                                {/* Sötét lépése */}
                                <div 
                                    onClick={() => row.black && goToMove(blackIdx)} 
                                    className={`w-28 h-8 flex items-center px-2 cursor-pointer font-bold text-[14px] transition-colors ${
                                        row.black && viewIndex === blackIdx ? 'bg-[#3b3835] text-white rounded-sm' : 'text-[#bab9b8] hover:text-white'
                                    }`}
                                >
                                    {row.black ? renderNotation(row.black.m) : ""}
                                    {renderMoveIcon(row.black)}
                                </div>

                                <div className="flex-1"></div>

                                {/* Idő és Eval kijelzés */}
                                <div className="w-20 flex flex-col justify-center pr-3 border-l border-chess-bg/30">
                                    <div className="flex items-center justify-end gap-1 leading-none text-[10px] text-[#989795]">
                                        {row.white?.eval !== undefined && (
                                            <span className="mr-1 text-[#666] font-mono">{row.white.eval > 0 ? `+${row.white.eval}` : row.white.eval}</span>
                                        )}
                                        {row.white?.t !== undefined ? row.white.t.toFixed(1) : "0.0"}s
                                    </div>
                                    {row.black && (
                                        <div className="flex items-center justify-end gap-1 leading-none text-[10px] text-[#666]">
                                             {row.black.eval !== undefined && (
                                                <span className="mr-1 text-[#444] font-mono">{row.black.eval > 0 ? `+${row.black.eval}` : row.black.eval}</span>
                                            )}
                                            {row.black.t !== undefined ? row.black.t.toFixed(1) : "0.0"}s
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {showEndGameUI && finalResult && (
                        <div className="mt-4 mx-2 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center justify-between px-4 py-4 bg-chess-panel-header border border-chess-bg rounded-md shadow-inner">
                                <div className="flex items-center gap-4">
                                    <span className="text-white font-black text-2xl tracking-tighter">{finalResult.score}</span>
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-sm leading-none">{finalResult.winnerText}</span>
                                        <span className="text-[#989795] text-[11px] uppercase font-bold tracking-wider mt-1">{finalResult.reasonText}</span>
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
                       <button 
                            onClick={handleRunFullAnalysis} // <--- MOST MÁR EZT HÍVJA
                            className="w-full py-3 bg-[#81b64c] hover:bg-[#a3d16a] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg text-lg"
                        >
                            <i className="fas fa-microscope"></i> Game Review
                        </button>
                        <div className="grid grid-cols-2 gap-2 pt-3">
                            <button
                                onClick={() => {
                                    resetGame();
                                    setIsSelectingBot(true);
                                }}
                                className="py-3 bg-chess-bg hover:bg-[#3d3a37] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all text-[15px] active:scale-95"
                            >
                                <i className="fas fa-plus"></i> New Bot
                            </button>
                            <button
                                onClick={() => startNewGame(difficultyChoice, userChoiceColor, lastTimeControl)}
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