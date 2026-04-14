import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { 
    ChevronRight, Upload, Settings, BookOpen, 
    MoreHorizontal, Search, ChevronDown, ChevronUp, Edit2
} from 'lucide-react';
import { 
    LoadFromHistory, MakeMoves, ImportStudy, LoadFromFEN, 
    SetUpPosition, GameCollections, New, Save, Review, LoadPrevious 
} from './icons/Icons';
import { moves as moveAssets } from '../constants/review';
import ChessBoardGrid from '../components/ChessBoardGrid';

const AnalysisPanel = ({ 
    history, 
    currentEval, 
    openingName, 
    onSaveClick,
    onNewClick,
    viewIndex,   
    onViewMove,
    onReviewClick
}) => {
    const currentMoveData = viewIndex === -1 
        ? history[history.length - 1] 
        : history[viewIndex];

    const isActive = history.length > 0;
    
    // Tooltip állapot
    const [tooltip, setTooltip] = useState({ x: 0, y: 0, visible: false, fen: null });

    const getAnalysisColor = (label) => {
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

    const getVariationFen = (pvUci) => {
        if (!pvUci || !Array.isArray(pvUci)) return null;
        const baseFen = currentMoveData?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
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
        } catch (e) { return null; }
    };

    return (
        <div className="relative w-[480px] h-[calc(680px+64px)] bg-[#262421] rounded-lg flex flex-col shadow-xl border border-[#3c3a37] overflow-hidden font-sans">
            {!isActive ? (
                /* --- MENÜ NÉZET (VISSZAÁLLÍTVA) --- */
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
                        
                        <div className="px-4 mt-2">
                            <textarea 
                                className="w-full h-24 bg-[#161512] rounded p-2 text-xs focus:outline-none border border-[#3c3a37] resize-none text-[#bab9b8]" 
                                placeholder="Paste PGN here..." 
                            />
                            <button className="w-full mt-2 py-2 flex items-center justify-center gap-2 bg-[#2b2a27] hover:bg-[#363430] rounded font-bold text-xs text-[#bab9b8] transition-colors border border-[#3c3a37]">
                                <Upload size={14} /> Upload File
                            </button>
                        </div>
                        
                        <div className="mt-4 px-4">
                            <button className="w-full py-3 bg-[#81b64c] hover:bg-[#95c95c] text-white font-black rounded-md shadow-lg transition-colors uppercase text-sm">
                                Add Game(s)
                            </button>
                        </div>
                        
                        <div className="mt-2 mb-4">
                            <AnalysisMenuItem icon={<LoadPrevious size={18} />} label="Load Previous Analysis" />
                        </div>
                    </div>
                </>
            ) : (
                /* --- AKTÍV ELEMZŐ NÉZET --- */
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
                        </div>
                        <div className="text-[#8b8987] text-[11px] flex items-center gap-1 opacity-80">
                            <Settings size={12} className="rotate-90"/> depth=20
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar bg-[#262421] px-2 space-y-1 pt-1 flex flex-col min-h-0">
                        <div className="space-y-[1px] shrink-0">
                            {currentMoveData?.analysisLabel && (
                                <EngineLineSpecial 
                                    type={currentMoveData.is_book ? 'book' : currentMoveData.analysisLabel}
                                    eval={currentMoveData.eval} 
                                    text={currentMoveData.is_book 
                                        ? `${currentMoveData.m} is a book move` 
                                        : `${currentMoveData.m} is a ${currentMoveData.analysisLabel}`} 
                                    subtext={!currentMoveData.is_book && currentMoveData.analysisLabel !== 'best' 
                                        ? `Best was: ${currentMoveData.bestMove}` 
                                        : "Optimal line"} 
                                    colorFn={getAnalysisColor}
                                />
                            )}

                            {(currentMoveData?.engine_lines || currentMoveData?.engineLines)?.map((line, idx) => (
                                <EngineLineSimple 
                                    key={idx}
                                    eval={line.eval} 
                                    moves={line.continuation} 
                                    onMouseEnter={(e) => {
                                        const fen = getVariationFen(line.pv_uci);
                                        setTooltip({ 
                                            x: e.clientX, 
                                            y: e.clientY, 
                                            visible: true, 
                                            fen: fen 
                                        });
                                    }}
                                    onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                                    onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                                />
                            ))}
                        </div>

                        <div className="flex items-center justify-between py-2 px-1 text-[11px] text-[#8b8987] border-b border-[#3c3a37]/50 mt-1 shrink-0">
                            <span className="truncate">{openingName || "Analysis started"}</span>
                            <BookOpen size={14} className="shrink-0 ml-2" />
                        </div>

                        <div className="flex flex-col py-1 overflow-y-auto no-scrollbar flex-1 min-h-0">
                            {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                            <div key={i} className={`grid grid-cols-[35px_1fr_1fr] items-center min-h-[30px] px-3 ${viewIndex >= i * 2 && viewIndex <= i * 2 + 1 ? 'bg-[#ffffff03]' : ''}`}>
                                <span className="text-[12px] text-[#8b8987] font-mono select-none">{i + 1}.</span>
                                
                                {/* Világos lépés (Páros index: 0, 2, 4...) */}
                                <MoveItem 
                                    move={history[i * 2]} 
                                    isActive={viewIndex === i * 2} 
                                    onClick={() => onViewMove(i * 2)} 
                                    isBlack={false} 
                                />
                                
                                {/* Fekete lépés (Páratlan index: 1, 3, 5...) */}
                                <MoveItem 
                                    move={history[i * 2 + 1]} 
                                    isActive={viewIndex === i * 2 + 1} 
                                    onClick={() => onViewMove(i * 2 + 1)} 
                                    isBlack={true} 
                                />
                            </div>
                        ))}
                        </div>
                    </div>
                </>
            )}

            {/* FIX FOOTER */}
            <div className="p-2 bg-[#21201d] rounded-b-lg border-t border-[#3c3a37]">
                <div className="flex justify-between gap-1 mb-3 px-1">
                    <ControlBtn icon="|<" onClick={() => onViewMove(0)} />
                    <ControlBtn icon="<" onClick={() => onViewMove(viewIndex === -1 ? history.length - 2 : viewIndex - 1)} />
                    <ControlBtn icon=">" onClick={() => onViewMove(viewIndex === -1 ? -1 : viewIndex + 1)} />
                    <ControlBtn icon=">|" onClick={() => onViewMove(-1)} />
                </div>
                <div className="flex justify-around items-center text-[#8b8987] pb-1">
                    <FooterAction icon={<New size={18} />} label="New" onClick={onNewClick} />
                    <FooterAction icon={<Save size={18} />} label="Save" onClick={onSaveClick} />
                    <FooterAction icon={<Review size={18} />} label="Review" onClick={onReviewClick} />
                    <FooterAction icon={<MoreHorizontal size={18} />} label="" />
                </div>
            </div>

            {/* LEBEGŐ KISTÁBLA TOOLTIP */}
            {tooltip.visible && tooltip.fen && (
                <div 
                    className="fixed z-[9999] pointer-events-none bg-[#21201d] p-1 rounded-sm shadow-2xl border-4 border-[#3c3a37] animate-in fade-in zoom-in duration-100"
                    style={{ 
                        left: tooltip.x - 260, 
                        top: tooltip.y - 120 
                    }}
                >
                    <div className="w-52 h-52">
                        <ChessBoardGrid 
                            gameLogic={{ 
                                fen: tooltip.fen, 
                                status: "viewing", 
                                history: [], 
                                lastMove: {from:null, to:null} 
                            }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

/* --- SEGÉDKOMPONENSEK --- */

const EngineLineSimple = ({ eval: ev, moves, onMouseEnter, onMouseLeave, onMouseMove }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const moveArray = moves.split(' ');
    const shortMoves = moveArray.slice(0, 8).join(' ');
    const remainingMoves = moveArray.slice(8).join(' ');

    return (
        <div className="flex flex-col border-b border-white/5 last:border-0" onMouseEnter={onMouseEnter} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
            <div className="flex items-center gap-2 p-1.5 hover:bg-[#ffffff08] cursor-pointer group transition-colors">
                <div className="w-12 text-center text-[10px] font-bold text-[#bab9b8] shrink-0 py-0.5 bg-[#1a1917] rounded border border-white/5">
                    {typeof ev === 'number' && ev > 0 ? `+${ev.toFixed(2)}` : ev}
                </div>
                <div className="text-[11px] text-[#bab9b8] flex-1 font-medium leading-none tracking-tight">
                    {shortMoves}
                    {!isExpanded && remainingMoves && " ..."}
                </div>
                {remainingMoves && (
                    <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-1 text-[#8b8987] hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                )}
            </div>
            {isExpanded && remainingMoves && (
                <div className="px-[60px] pb-2 text-[11px] text-[#8b8987] leading-relaxed animate-in slide-in-from-top-1 duration-200">
                    {remainingMoves}
                </div>
            )}
        </div>
    );
};

const AnalysisMenuItem = ({ icon, label }) => (
    <div className="flex items-center justify-between p-3 hover:bg-[#312e2b] rounded-md cursor-pointer group transition-colors">
        <div className="flex items-center gap-3">
            <span className="text-[#bab9b8] group-hover:text-white">{icon}</span>
            <span className="text-sm font-bold text-[#bab9b8] group-hover:text-white">{label}</span>
        </div>
        <ChevronRight size={18} className="text-[#5c5a57]" />
    </div>
);

const EngineLineSpecial = ({ type, eval: ev, text, subtext, colorFn }) => {
    const asset = moveAssets[type?.toLowerCase()];
    const textColor = colorFn(type);
    return (
        <div className="flex items-center gap-2 p-1.5 rounded hover:bg-[#ffffff05] cursor-pointer group transition-all">
            <EvalBox value={ev} />
            <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                {asset?.src ? (
                    <img src={asset.src} alt={type} className="w-full h-full object-contain animate-in zoom-in duration-300" />
                ) : (
                    <div className="w-full h-full bg-[#3c3a37] rounded flex items-center justify-center text-[10px]">★</div>
                )}
            </div>
            <div className="flex flex-col min-w-0">
                <span className={`text-xs font-bold leading-none ${textColor}`}>{text}</span>
                <span className="text-[10px] text-[#8b8987] truncate opacity-80">{subtext}</span>
            </div>
        </div>
    );
};

const EvalBox = ({ value }) => {
    const isMate = String(value).startsWith('M');
    const numericEval = parseFloat(value);
    const isWhiteBetter = isMate ? !String(value).includes('-') : numericEval >= 0;
    return (
        <div className={`w-14 py-0.5 rounded text-[11px] font-black shrink-0 text-center shadow-sm ${isWhiteBetter ? "bg-white text-black" : "bg-[#121212] text-white border border-white/20"}`}>
            {isMate ? value : (numericEval > 0 ? `+${numericEval.toFixed(2)}` : (numericEval === 0 ? "0.00" : numericEval.toFixed(2)))}
        </div>
    );
};

const MoveItem = ({ move, isActive, onClick, isBlack }) => {
    if (!move) return <div className="flex-1" />;
    const asset = moveAssets[move.analysisLabel?.toLowerCase()];
    
    // Megnézzük, hogy figura-e (N, B, R, Q, K)
    const hasPieceIcon = /^[NBRQK]/.test(move.m[0]);
    // Ha van ikon, a maradék szöveget mutatjuk (pl. Nf3 -> f3), ha nincs, az egészet (pl. e4)
    const displayNotation = hasPieceIcon ? move.m.substring(1) : move.m;

    return (
        <div className="flex items-center justify-start h-full">
            <div 
                onClick={onClick} 
                className={`flex items-center h-[26px] px-1.5 rounded cursor-pointer transition-colors font-bold text-[14px] min-w-[60px] relative ${
                    isActive ? 'bg-[#3c3a37] text-white' : 'text-[#bab9b8] hover:bg-[#312e2b] hover:text-white'
                }`}
            >
                <PieceNotation move={move} isBlack={isBlack} />
                
                <span>{displayNotation}</span>

                {asset?.src && (
                    <img src={asset.src} className="w-3.5 h-3.5 ml-1 animate-in fade-in duration-300" alt="" />
                )}
            </div>
        </div>
    );
};

const TabItem = ({ icon, label, active }) => (
    <div className={`flex-1 flex flex-col items-center py-2.5 cursor-pointer transition-colors border-b-2 ${active ? 'bg-[#262421] border-[#81b64c] text-white' : 'border-transparent text-[#8b8987] hover:bg-[#2b2a27]'}`}>
        {icon}
        <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">{label}</span>
    </div>
);

const ControlBtn = ({ icon, onClick }) => (
    <button onClick={onClick} className="flex-1 py-2 bg-[#312e2b] hover:bg-[#3d3a37] rounded flex items-center justify-center font-bold text-[#bab9b8] border-b-2 border-black/20 active:border-b-0 active:translate-y-[1px] transition-all">
        {icon}
    </button>
);

const FooterAction = ({ icon, label, onClick }) => (
    <div className="flex flex-col items-center justify-center gap-0.5 cursor-pointer group px-2" onClick={onClick}>
        <div className="text-[#bab9b8] group-hover:text-white transition-colors">{icon}</div>
        <span className="text-[9px] font-bold text-[#8b8987] group-hover:text-white uppercase">{label}</span>
    </div>
);

const PieceNotation = ({ move, isBlack }) => {
    if (!move || !move.m) return null;

    // Kinyerjük az első karaktert (notációban: N, B, R, Q, K)
    const firstChar = move.m[0];
    
    // Sakk notáció szabály: ha kisbetűvel kezdődik (pl. e4, d5), az gyalog.
    // Ha nem nagybetű, vagy sáncolás (O-O), ne mutasson figurát.
    const isPiece = /^[NBRQK]/.test(firstChar);

    if (!isPiece) return null;

    // Meghatározzuk a színt és a típust a fájlneveidhez
    const color = isBlack ? 'black' : 'white';
    const pieceMap = {
        'N': 'knight',
        'B': 'bishop',
        'R': 'rook',
        'Q': 'queen',
        'K': 'king'
    };

    const pieceType = pieceMap[firstChar];

    return (
        <img 
            src={`/assets/pieces/${color}_${pieceType}.png`} 
            alt={firstChar}
            className="w-[18px] h-[18px] mr-0.5 object-contain inline-block self-center opacity-95"
            // Ha valamiért nem töltene be a kép, ne rontsa el az UI-t
            onError={(e) => { e.target.style.display = 'none'; }}
        />
    );
};

export default AnalysisPanel;