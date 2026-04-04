import React from 'react';

const MoveListPanel = ({ history, viewIndex, status, goToMove, handleResign, renderNotation, startNewGame }) => {
    const isOngoing = status === "ongoing";

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

    // Segédfüggvény az index lekéréséhez a kijelöléshez
    const getHistoryIndex = (moveObj) => moveObj ? history.findIndex(h => h.num === moveObj.num) : -1;

    return (
        <div className="w-112.5 h-185 bg-[#262421] flex flex-col font-sans border border-chess-bg rounded-xl overflow-hidden">
            
            {/* Felső Navigáció (Play, New Game, stb.) */}
            <div className="grid grid-cols-4 bg-chess-panel-header border-b border-[#1b1a18]">
                <TopTab icon="fa-stopwatch" label={isOngoing ? "Play" : "Analysis"} active={true} />
                <TopTab icon="fa-plus" label="New Game" onClick={startNewGame} />
                <TopTab icon="fa-th" label="Games" />
                <TopTab icon="fa-users" label="Players" />
            </div>

            {/* Al-navigáció (Moves, Chat, Info) */}
            <div className="flex bg-chess-panel-header text-[13px] font-bold text-[#989795] border-b border-[#1b1a18]">
                <div className="py-3 px-8 border-b-2 border-white text-white cursor-pointer bg-[#262421]">Moves</div>
                <div className="py-3 px-8 cursor-pointer hover:text-white transition-colors">Chat</div>
                <div className="py-3 px-8 cursor-pointer hover:text-white transition-colors">Info</div>
            </div>

            {/* Opening név */}
            <div className="bg-[#262421] p-3 text-[13px] text-[#bab9b8] flex justify-between items-center border-b border-[#1b1a18]">
                <span className="truncate pr-2">Van 't Kruijs Opening</span>
                <i className="fas fa-book text-[#666] text-xs cursor-pointer hover:text-white"></i>
            </div>

            {/* Lépéslista terület */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-[#262421]">
            <div className="flex flex-col">
                {rows.map((row, i) => {
                    const whiteIdx = getHistoryIndex(row.white);
                    const blackIdx = getHistoryIndex(row.black);
                    const isOdd = i % 2 === 0;

                    return (
                        <div key={i} className={`flex h-10 items-center ${isOdd ? 'bg-[#2b2926]' : 'bg-transparent'} hover:bg-[#33312e]/50`}>
                            {/* Move Number - Fix szélesség */}
                            <div className="w-10 text-center text-[#666] text-[13px] font-semibold shrink-0">
                                {row.moveNumber}.
                            </div>
                            
                            {/* White Move - Fix szélesség (w-24), hogy közel legyen a feketéhez */}
                            <div 
                                onClick={() => goToMove(whiteIdx)}
                                className={`w-24 h-8 flex items-center px-2 cursor-pointer font-bold text-[14px] transition-colors rounded-sm
                                    ${viewIndex === whiteIdx ? 'bg-[#403d39] text-white' : 'text-[#bab9b8] hover:bg-[#33312e]'}
                                `}
                            >
                                {renderNotation(row.white.m)}
                            </div>

                            {/* Black Move - Fix szélesség (w-24) */}
                            <div 
                                onClick={() => row.black && goToMove(blackIdx)}
                                className={`w-24 h-8 flex items-center px-2 cursor-pointer font-bold text-[14px] transition-colors rounded-sm
                                    ${row.black && viewIndex === blackIdx ? 'bg-[#403d39] text-white' : 'text-[#bab9b8] hover:bg-[#33312e]'}
                                `}
                            >
                                {row.black ? renderNotation(row.black.m) : ""}
                            </div>

                            {/* Kitöltő üres rész, hogy az idő a jobb szélre kerüljön */}
                            <div className="flex-1"></div>

                            {/* Time column (Jobb szélre igazítva) */}
                            <div className="w-16 flex flex-col justify-center pr-3 border-l border-chess-bg/30">
                                <div className="flex items-center justify-end gap-1 leading-none h-3.5 mb-0.5">
                                    <span className="text-[10px] text-[#989795] font-sans">
                                        {row.white.t > 0 ? `${row.white.t}s` : "0.1s"}
                                    </span>
                                    <div className="w-0.75 h-3 bg-[#bab9b8] rounded-full opacity-40"></div>
                                </div>
                                {row.black && (
                                    <div className="flex items-center justify-end gap-1 leading-none h-3.5">
                                        <span className="text-[10px] text-[#666] font-sans">
                                            {row.black.t}s
                                        </span>
                                        <div className="w-0.75 h-3 bg-[#666] rounded-full opacity-40"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

            {/* Navigációs gombok (Sötétebb design) */}
            <div className="bg-chess-panel-header p-3 flex gap-1 border-t border-[#1b1a18]">
                <NavBtn icon="fa-step-backward" onClick={() => goToMove(0)} active={viewIndex !== 0} />
                <NavBtn icon="fa-chevron-left" 
                    onClick={() => {
                        const currentIdx = viewIndex === -1 ? history.length - 1 : parseInt(viewIndex);
                        goToMove(currentIdx - 1);
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
                    }} 
                    active={viewIndex !== -1} 
                />
                <NavBtn icon="fa-step-forward" onClick={() => goToMove(-1)} active={viewIndex !== -1} />
            </div>

            {/* Toolbar: Draw / Resign */}
            <div className="p-3 bg-chess-panel-header flex justify-between items-center text-[#989795] border-t border-[#1b1a18]">
                <div className="flex gap-4 items-center">
                    <button className="flex items-center gap-2 hover:text-white transition-colors">
                        <i className="fas fa-half-circle text-sm"></i>
                        <span className="text-[13px] font-bold">Draw</span>
                    </button>
                    <button onClick={handleResign} className="flex items-center gap-2 hover:text-white transition-colors">
                        <i className="fas fa-flag text-sm"></i>
                        <span className="text-[13px] font-bold">Resign</span>
                    </button>
                </div>
                <i className="fas fa-sync-alt hover:text-white cursor-pointer transition-transform hover:rotate-180"></i>
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