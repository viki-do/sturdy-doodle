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

    return (
        <div className="w-[450px] h-[720px] bg-[#262421] flex flex-col shadow-2xl font-sans border border-[#312e2b] rounded-xl overflow-hidden">
            {/* Felső rész: Státusz */}
            <div className="p-5 border-b border-[#1b1a18] bg-[#21201d] flex justify-between items-center h-[76px]">
                <span className="text-xl font-bold text-white">Analysis</span>
                {status !== "ongoing" && (
                    <button onClick={() => window.location.reload()} className="text-xs text-[#81b64c] font-bold hover:underline">
                        Back to Menu
                    </button>
                )}
            </div>

            {/* Felső Navigáció */}
            <div className="grid grid-cols-4 bg-chess-panel-header border-b border-[#1b1a18]">
                <TopTab icon="fa-stopwatch" label={isOngoing ? "Play" : "Analysis"} active={true} hasX={!isOngoing} />
                <TopTab icon="fa-plus" label="New Game" onClick={startNewGame} />
                <TopTab icon="fa-th" label="Games" />
                <TopTab icon="fa-users" label="Players" />
            </div>

            <div className="flex bg-[#262421] px-2 pt-2 gap-4 text-[13px] font-bold text-[#666]">
                <div className="pb-2 border-b-2 border-[#81b64c] px-4 cursor-pointer text-white">Moves</div>
                <div className="pb-2 px-4 cursor-pointer hover:text-white">Info</div>
                <div className="pb-2 px-4 cursor-pointer hover:text-white">Openings</div>
            </div>

            {/* Lépéslista terület */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-[#2b2926]">
                <div className="p-3 text-[12px] text-[#666] font-bold border-b border-chess-bg/30">Starting Position</div>
                <div className="flex flex-col">
                    {rows.map((row, i) => (
                        <div key={i} className="flex h-12 border-b border-chess-bg/10">
                            <div className="w-10 flex items-center justify-center text-[#666] text-[12px] font-semibold bg-chess-panel-header/50">
                                {row.moveNumber}.
                            </div>
                            
                            <div 
                                onClick={() => goToMove(history.findIndex(h => h.num === row.white.num))}
                                className={`flex-1 h-full flex items-center px-3 cursor-pointer font-bold text-[14px] transition-colors ${viewIndex === history.findIndex(h => h.num === row.white.num) ? 'bg-[#403d39] text-white' : 'text-[#bab9b8] hover:bg-white/5'}`}
                            >
                                {renderNotation(row.white.m)}
                            </div>

                            <div 
                                onClick={() => row.black && goToMove(history.findIndex(h => h.num === row.black.num))}
                                className={`flex-1 h-full flex items-center px-3 cursor-pointer font-bold text-[14px] transition-colors ${row.black && viewIndex === history.findIndex(h => h.num === row.black.num) ? 'bg-[#403d39] text-white' : 'text-[#bab9b8] hover:bg-white/5'}`}
                            >
                                {row.black ? renderNotation(row.black.m) : ""}
                            </div>

                            <div className="w-20 flex flex-col justify-center border-l border-chess-bg/40 px-2 bg-chess-panel-header/20">
                                <div className="flex items-center justify-end gap-1.5 h-1/2">
                                    <span className="text-[10px] text-[#888] font-mono">
                                        {row.white.t > 0 ? `${row.white.t}s` : "0.1s"} 
                                    </span>
                                    <div className="w-1 h-3 bg-white rounded-sm opacity-80"></div>
                                </div>
                                <div className="flex items-center justify-end gap-1.5 h-1/2">
                                    <span className="text-[10px] text-[#666] font-mono">
                                        {row.black ? `${row.black.t}s` : ""}
                                    </span>
                                    <div className={`w-1 h-3 bg-[#666] rounded-sm ${row.black ? 'opacity-50' : 'opacity-0'}`}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigációs gombok */}
            <div className="bg-[#262421] p-4 flex gap-2 border-t border-[#1b1a18]">
                <NavBtn icon="fa-step-backward" onClick={() => goToMove(0)} active={viewIndex !== 0} />
                <NavBtn icon="fa-chevron-left" 
                    onClick={() => {
                        const currentIdx = viewIndex === -1 ? history.length - 1 : parseInt(viewIndex);
                        goToMove(currentIdx - 1);
                    }} 
                    active={viewIndex !== 0} 
                />
                <NavBtn icon="fa-play" onClick={() => goToMove(-1)} active={viewIndex !== -1} />
                <NavBtn icon="fa-chevron-right" 
                    onClick={() => {
                        if (viewIndex === -1) return;
                        const currentIdx = parseInt(viewIndex);
                        if (currentIdx >= history.length - 2) {
                            goToMove(-1);
                        } else {
                            goToMove(currentIdx + 1);
                        }
                    }} 
                    active={viewIndex !== -1} 
                />
                <NavBtn icon="fa-step-forward" onClick={() => goToMove(-1)} active={viewIndex !== -1} />
            </div>

            {/* Alsó toolbar (Share, Expand, Search, Draw/Resign) */}
            <div className="p-3 bg-[#262421] flex justify-between items-center text-[#666] border-t border-[#1b1a18]">
                <div className="flex gap-4">
                    <i className="fas fa-share-alt hover:text-white cursor-pointer"></i>
                    <i className="fas fa-expand hover:text-white cursor-pointer"></i>
                    <i className="fas fa-search hover:text-white cursor-pointer"></i>
                </div>
                
                {status === "ongoing" && (
                    <div className="flex gap-4 font-bold text-[12px] text-[#bab9b8]">
                        <button className="hover:text-white transition-colors">Draw</button>
                        <button onClick={handleResign} className="hover:text-white transition-colors">Resign</button>
                    </div>
                )}
                
                <i className="fas fa-redo hover:text-white cursor-pointer"></i>
            </div>
        </div>
    );
};

const TopTab = ({ icon, label, active, hasX, onClick }) => (
    <div onClick={onClick} className={`relative flex flex-col items-center py-3 cursor-pointer ${active ? 'bg-[#262421] text-white' : 'text-[#666]'}`}>
        {hasX && <i className="fas fa-times absolute top-1 right-2 text-[10px] opacity-30"></i>}
        <i className={`fas ${icon} text-lg mb-1`}></i>
        <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </div>
);

const NavBtn = ({ icon, onClick, active }) => (
    <button 
        onClick={active ? onClick : (e) => e.preventDefault()}
        className={`flex-1 h-12 rounded bg-chess-bg flex justify-center items-center text-[#bab9b8] transition-colors ${active ? 'hover:bg-[#454241] cursor-pointer' : 'cursor-not-allowed'}`}
    >
        <i className={`fas ${icon} text-[16px]`}></i>
    </button>
);

export default MoveListPanel;