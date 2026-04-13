import React from 'react';
import { 
    ChevronRight, Upload, Settings, BookOpen, 
    Edit2, MoreHorizontal, Search, Info
} from 'lucide-react';
import { 
    LoadFromHistory, MakeMoves, ImportStudy, LoadFromFEN, 
    SetUpPosition, GameCollections, New, Save, Review, More, 
    LoadPrevious 
} from './icons/Icons';

const AnalysisPanel = ({ 
    history, 
    currentEval, 
    openingName, 
    onSaveClick,
    onNewClick,
    viewIndex,  
    onViewMove
}) => {
    const isActive = history.length > 0;

    return (
        <div className="w-[480px] h-[calc(680px+64px)] bg-[#262421] rounded-lg flex flex-col shadow-xl border border-[#3c3a37] overflow-hidden">
            {!isActive ? (
                /* --- MENÜ NÉZET --- */
                <>
                    <div className="p-4 border-b border-[#3c3a37] flex items-center justify-center gap-2 bg-[#21201d]">
                        <New size={24} className="text-[#81b64c]" />
                        <h2 className="font-bold uppercase tracking-widest text-sm text-white">Analysis</h2>
                    </div>
                    <div className="flex-1 pt-3 overflow-y-auto no-scrollbar">
                        <AnalysisMenuItem icon={<MakeMoves size={24} />} label="Make Moves" />
                        <AnalysisMenuItem icon={<SetUpPosition size={24} />} label="Set Up Position" />
                        <AnalysisMenuItem icon={<GameCollections size={24} />} label="Game Collections" />
                        <AnalysisMenuItem icon={<LoadFromHistory size={24} />} label="Load From Game History" />
                        <AnalysisMenuItem icon={<ImportStudy size={24} />} label="Import Study" />
                        <AnalysisMenuItem icon={<LoadFromFEN size={24} />} label="Load From FEN/PGN(s)" />
                        <div className="px-4 mt-2 text-[#bab9b8]">
                            <textarea className="w-full h-24 bg-[#161512] rounded p-2 text-xs focus:outline-none border border-[#3c3a37] resize-none" placeholder="Paste PGN here..." />
                            <button className="w-full mt-2 py-2 flex items-center justify-center gap-2 bg-[#2b2a27] hover:bg-[#363430] rounded font-bold text-xs transition-colors border border-[#3c3a37]">
                                <Upload size={14} /> Upload File
                            </button>
                        </div>
                        <div className="mt-4 px-4">
                            <button className="w-full py-3 bg-[#81b64c] hover:bg-[#95c95c] text-white font-black rounded-md shadow-lg transition-colors uppercase text-sm">Add Game(s)</button>
                        </div>
                        <div className="mt-2 mb-4"><AnalysisMenuItem icon={<LoadPrevious size={18} />} label="Load Previous Analysis" /></div>
                    </div>
                </>
            ) : (
                /* --- AKTÍV ELEMZŐ NÉZET (KÉP ALAPJÁN) --- */
                <>
                    <div className="flex bg-[#21201d] border-b border-[#3c3a37]">
                        <TabItem icon={<Search size={18} />} label="Analysis" active />
                        <TabItem icon={<GameCollections size={18} />} label="Games" />
                        <TabItem icon={<BookOpen size={18} />} label="Explore" />
                    </div>

                    <div className="px-3 py-2 flex items-center justify-between bg-[#262421]">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-3.5 bg-[#3c3a37] rounded-full relative cursor-pointer">
                                <div className="absolute left-0.5 top-0.5 w-2.5 h-2.5 bg-[#81b64c] rounded-full" />
                            </div>
                            <span className="text-[10px] font-bold text-[#bab9b8] uppercase tracking-tighter">Analysis</span>
                            <MoreHorizontal size={14} className="text-[#8b8987] ml-1" />
                        </div>
                        <div className="flex items-center gap-2 text-[#8b8987] text-[11px]">
                            <span className="flex items-center gap-1 opacity-80"><Settings size={12} className="rotate-90"/> depth=20</span>
                            <Settings size={14} className="cursor-pointer hover:text-white" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar bg-[#262421] px-2 space-y-1 pt-1">
                        {/* Engine Lines */}
                        <div className="space-y-[1px]">
                            <EngineLineSpecial 
                                type="mistake" 
                                eval="-0.78" 
                                text="f3 is a mistake" 
                                subtext="2... Nf6 3. d4 exd4 4. c3 d5 5. e5" 
                            />
                            <EngineLineSpecial 
                                type="best" 
                                eval="+0.39" 
                                text="Nf3 is best" 
                                subtext="2... Nc6" 
                            />
                            <div className="h-2" />
                            <EngineLineSimple eval="-0.73" moves="2... Bc5 3. Nc3 Nf6 4. Na4" />
                            <EngineLineSimple eval="-0.69" moves="2... d5 3. d4 dxe4 4. dxe5 Qxd1+" />
                            <EngineLineSimple eval="-0.61" moves="2... Nc6 3. Bc4 Bc5 4. Nc3 d6" />
                        </div>

                        {/* Opening Info */}
                        <div className="flex items-center justify-between py-2 px-1 text-[11px] text-[#8b8987] border-b border-[#3c3a37]/50 mt-1">
                            <span className="truncate">{openingName || "King's Pawn Opening: King's Head Opening"}</span>
                            <BookOpen size={14} className="shrink-0 ml-2" />
                        </div>

                        {/* Players */}
                        <div className="flex items-center justify-between py-2 px-1 text-sm font-bold text-[#bab9b8]">
                            <div className="flex items-center gap-1 uppercase tracking-tight">
                                <span>White</span> <span className="opacity-20">-</span> <span>Black *</span>
                            </div>
                            <Edit2 size={14} className="text-[#8b8987] cursor-pointer hover:text-white" />
                        </div>

                        {/* Move List Grid */}
                        <div className="flex flex-col py-1 overflow-y-auto no-scrollbar flex-1">
                            {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                                <div key={i} className={`grid grid-cols-[35px_1fr_1fr] items-center min-h-[30px] px-3 ${viewIndex >= i * 2 && viewIndex <= i * 2 + 1 ? 'bg-[#ffffff03]' : ''}`}>
                                    
                                    {/* 1. Lépésszám (Ez sosem kap szürke hátteret) */}
                                    <span className="text-[12px] text-[#8b8987] font-mono select-none">
                                        {i + 1}.
                                    </span>

                                    {/* 2. Világos lépés konténer */}
                                    <div className="flex items-center justify-start h-full">
                                        <div 
                                            onClick={() => onViewMove(i * 2)}
                                            className={`
                                                flex items-center h-[26px] px-1.5 rounded cursor-pointer transition-colors font-bold text-[14px]
                                                ${viewIndex === i * 2 
                                                    ? 'bg-[#3c3a37] text-white' // Csak a szöveg alatt van háttér
                                                    : 'text-[#bab9b8] hover:bg-[#312e2b] hover:text-white'
                                                }
                                            `}
                                            style={{ minWidth: '45px' }} // Fix szélesség, hogy ne ugráljon a kijelölés mérete
                                        >
                                            <PieceNotation move={history[i * 2]} />
                                            {history[i * 2]?.m}
                                        </div>
                                    </div>

                                    {/* 3. Sötét lépés konténer */}
                                    <div className="flex items-center justify-start h-full">
                                        {history[i * 2 + 1] ? (
                                            <div 
                                                onClick={() => onViewMove(i * 2 + 1)}
                                                className={`
                                                    flex items-center h-[26px] px-1.5 rounded cursor-pointer transition-colors font-bold text-[14px]
                                                    ${viewIndex === i * 2 + 1 
                                                        ? 'bg-[#3c3a37] text-white' 
                                                        : 'text-[#bab9b8] hover:bg-[#312e2b] hover:text-white'
                                                    }
                                                `}
                                                style={{ minWidth: '45px' }}
                                            >
                                                <PieceNotation move={history[i * 2 + 1]} />
                                                {history[i * 2 + 1]?.m}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* --- FIX FOOTER --- */}
            <div className="p-2 bg-[#21201d] rounded-b-lg border-t border-[#3c3a37]">
                <div className="flex justify-between gap-1 mb-3 px-1">
                    <ControlBtn icon="|<" />
                    <ControlBtn icon="<" />
                    <ControlBtn icon=">" />
                    <ControlBtn icon=">|" />
                </div>
                <div className="flex justify-around items-center text-[#8b8987] pb-1">
                    <FooterAction icon={<New size={18} />} label="New" onClick={onNewClick} />
                    <FooterAction icon={<Save size={18} />} label="Save" onClick={onSaveClick} />
                    <FooterAction icon={<Review size={18} />} label="Review" />
                    <FooterAction icon={<MoreHorizontal size={18} />} label="" />
                </div>
            </div>
        </div>
    );
};

/* --- BELSŐ SEGÉDKOMPONENSEK --- */

const AnalysisMenuItem = ({ icon, label }) => (
    <div className="flex items-center justify-between p-3 hover:bg-[#312e2b] rounded-md cursor-pointer transition-colors group">
        <div className="flex items-center gap-3">
            <span className="text-[#bab9b8] group-hover:text-white">{icon}</span>
            <span className="text-sm font-bold text-[#bab9b8] group-hover:text-white">{label}</span>
        </div>
        <ChevronRight size={18} className="text-[#5c5a57]" />
    </div>
);

const TabItem = ({ icon, label, active }) => (
    <div className={`flex-1 flex flex-col items-center py-2.5 cursor-pointer transition-colors border-b-2 ${active ? 'bg-[#262421] border-[#81b64c] text-white' : 'border-transparent text-[#8b8987] hover:bg-[#2b2a27]'}`}>
        {icon}
        <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">{label}</span>
    </div>
);

const EngineLineSpecial = ({ type, eval: ev, text, subtext }) => {
    const isMistake = type === 'mistake';
    return (
        <div className="flex items-center gap-2 p-1.5 rounded hover:bg-[#ffffff05] cursor-pointer group">
            <div className="w-12 py-0.5 bg-[#161512] rounded text-center text-xs font-bold text-white shrink-0 border border-white/5">
                {ev}
            </div>
            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isMistake ? 'bg-[#ffa459]' : 'bg-[#81b64c]'}`}>
                {isMistake ? <span className="text-black font-black text-xs">?</span> : <span className="text-white text-[10px]">★</span>}
            </div>
            <div className="flex flex-col min-w-0">
                <span className={`text-xs font-bold leading-none ${isMistake ? 'text-[#ffa459]' : 'text-[#81b64c]'}`}>{text}</span>
                <span className="text-[10px] text-[#8b8987] truncate opacity-80">{subtext}</span>
            </div>
            <Search size={14} className="ml-auto text-[#8b8987] opacity-0 group-hover:opacity-100 shrink-0" />
        </div>
    );
};

const EngineLineSimple = ({ eval: ev, moves }) => (
    <div className="flex items-center gap-2 p-1 rounded hover:bg-[#ffffff05] cursor-pointer group">
        <div className="w-12 text-center text-[11px] font-bold text-[#bab9b8] shrink-0 opacity-80">
            {ev}
        </div>
        <div className="text-[11px] text-[#bab9b8] truncate flex-1 leading-none">{moves}</div>
        <ChevronRight size={12} className="ml-auto text-[#8b8987] opacity-0 group-hover:opacity-100" />
    </div>
);

const ControlBtn = ({ icon }) => (
    <button className="flex-1 py-2 bg-[#312e2b] hover:bg-[#3d3a37] rounded flex items-center justify-center font-bold text-[#bab9b8] border-b-2 border-black/20 active:border-b-0 active:translate-y-[1px] transition-all">
        {icon}
    </button>
);

const FooterAction = ({ icon, label, onClick }) => (
    <div className="flex flex-col items-center justify-center gap-0.5 cursor-pointer group transition-colors px-2" onClick={onClick}>
        <div className="text-[#bab9b8] group-hover:text-white transition-colors">{icon}</div>
        <span className="text-[9px] font-bold text-[#8b8987] group-hover:text-white uppercase">{label}</span>
    </div>
);

const PieceNotation = ({ move }) => {
    if (!move || !move.m) return null;
    
    // Csak ha nem gyalog lépés (pl. Nf3, Bb5)
    const firstChar = move.m[0];
    if (['N', 'B', 'R', 'Q', 'K'].includes(firstChar)) {
        // Itt használhatod a saját ikonjaidat vagy Lucide-ot, 
        // de a legegyszerűbb egy szöveges bábu karakter:
        const pieces = { 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔' };
        return <span className="mr-1 opacity-70 text-lg leading-none">{pieces[firstChar]}</span>;
    }
    return null;
};

export default AnalysisPanel;