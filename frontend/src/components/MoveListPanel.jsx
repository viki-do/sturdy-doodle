import React from 'react';

const MoveListPanel = ({ 
    history, 
    viewIndex, 
    status, 
    goToMove, 
    handleResign, 
    renderNotation,
    startNewGame 
}) => {
    const isOngoing = status === "ongoing";
    const latestIndex = history.length - 1;
    const isAtLatest = viewIndex === -1 || viewIndex === latestIndex;

    const formatTime = (seconds) => {
        if (seconds === undefined || seconds === null) return "0.0s";
        return `${seconds.toFixed(1)}s`;
    };

    // --- LOGIKA: A history[i].m felbontása fehér és fekete lépésre ---
    // A te backend-ed a notation-t így küldi: "e4 e5" vagy "Nf3 Nc6"
    const moveRows = history.filter(m => m.m !== "start").map((item, index) => {
        const parts = item.m.split(' ');
        return {
            moveNumber: index + 1,
            white: parts[0],
            black: parts[1] || null,
            fullData: item,
            originalIndex: history.findIndex(h => h.num === item.num)
        };
    });

    return (
        <div className="w-105 h-[750px] bg-[#262421] flex flex-col shadow-2xl font-sans border border-[#312e2b] overflow-hidden">
            
            {/* Felső Navigáció */}
            <div className="grid grid-cols-4 bg-[#21201d] border-b border-[#1b1a18]">
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

            <div className="flex-1 overflow-y-auto no-scrollbar bg-[#2b2926]">
                <div className="p-3 text-[12px] text-[#666] font-bold border-b border-[#312e2b]/30">Starting Position</div>
                
                <div className="flex flex-col">
                    {moveRows.map((row, i) => (
                        <div key={i} className="flex h-12 border-b border-[#312e2b]/10">
                            
                            {/* BAL OLDAL: Lépések (Ahogy régen volt) */}
                            <div className="flex flex-1 items-center">
                                <div className="w-10 text-center text-[#666] text-[12px] font-semibold">{row.moveNumber}.</div>
                                
                                {/* Fehér lépés */}
                                <div 
                                    onClick={() => goToMove(row.originalIndex)}
                                    className={`flex-1 h-full flex items-center px-3 cursor-pointer font-bold text-[14px] transition-colors ${viewIndex === row.originalIndex ? 'bg-[#403d39] text-white' : 'text-[#bab9b8] hover:bg-white/5'}`}
                                >
                                    {renderNotation(row.white)}
                                </div>

                                {/* Fekete lépés */}
                                <div 
                                    onClick={() => goToMove(row.originalIndex)}
                                    className={`flex-1 h-full flex items-center px-3 cursor-pointer font-bold text-[14px] transition-colors ${viewIndex === row.originalIndex ? 'bg-[#403d39] text-white' : 'text-[#bab9b8] hover:bg-white/5'}`}
                                >
                                    {row.black ? renderNotation(row.black) : ""}
                                </div>
                            </div>

                            {/* JOBB OLDAL: Idők (A kért designnal) */}
                            <div className="w-20 flex flex-col justify-center border-l border-[#312e2b]/40 px-2 bg-[#21201d]/20">
                                <div className="flex items-center justify-end gap-1.5 h-1/2">
                                    <span className="text-[10px] text-[#888] font-mono">0.0s</span>
                                    <div className="w-1 h-3 bg-white rounded-sm opacity-80"></div>
                                </div>
                                <div className="flex items-center justify-end gap-1.5 h-1/2">
                                    <span className="text-[10px] text-[#666] font-mono">{row.black ? "0.0s" : ""}</span>
                                    <div className={`w-1 h-3 bg-[#666] rounded-sm ${row.black ? 'opacity-50' : 'opacity-0'}`}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigációs gombok és Alsó rész */}
            {/* Navigációs gombok */}
<div className="bg-[#262421] p-4 flex gap-2 border-t border-[#1b1a18]">
    {/* Elejére */}
    <NavBtn icon="fa-step-backward" onClick={() => goToMove(0)} active={viewIndex !== 0} />
    
    {/* Vissza */}
    <NavBtn icon="fa-chevron-left" 
        onClick={() => {
            const currentIdx = viewIndex === -1 ? history.length - 1 : parseInt(viewIndex);
            goToMove(currentIdx - 1);
        }} 
        active={viewIndex !== 0} 
    />
    
    {/* Play (Vissza az élőhöz) */}
    <NavBtn icon="fa-play" onClick={() => goToMove(-1)} active={viewIndex !== -1} />
    
    {/* Előre */}
    <NavBtn icon="fa-chevron-right" 
        onClick={() => {
            if (viewIndex === -1) return;
            const currentIdx = parseInt(viewIndex);
            // Ha a következő lépés az utolsó, akkor -1-re (élőre) váltunk
            if (currentIdx >= history.length - 2) {
                goToMove(-1);
            } else {
                goToMove(currentIdx + 1);
            }
        }} 
        active={viewIndex !== -1} 
    />
    
    {/* Végére */}
    <NavBtn icon="fa-step-forward" onClick={() => goToMove(-1)} active={viewIndex !== -1} />
</div>
            <div className="p-3 bg-[#262421] flex justify-between items-center text-[#666] border-t border-[#1b1a18]">
                <div className="flex gap-4">
                    <i className="fas fa-share-alt hover:text-white cursor-pointer"></i>
                    <i className="fas fa-expand hover:text-white cursor-pointer"></i>
                    <i className="fas fa-search hover:text-white cursor-pointer"></i>
                </div>
                {isOngoing && (
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
        onClick={active ? onClick : null}
        className={`flex-1 h-12 rounded bg-[#312e2b] flex justify-center items-center ${active ? 'text-[#bab9b8] hover:bg-[#454241] cursor-pointer' : 'opacity-10 cursor-not-allowed'}`}
    >
        <i className={`fas ${icon} text-[16px]`}></i>
    </button>
);

export default MoveListPanel;