import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { 
    Upload, Settings, BookOpen, 
    MoreHorizontal, Search
} from 'lucide-react';
import { 
    LoadFromHistory, MakeMoves, ImportStudy, LoadFromFEN, 
    SetUpPosition, New, Save, Review, LoadPrevious, GameCollections,
    ChevronLeft, ResetArrow, ChevronRight, ArrowChevronEnd
} from './icons/Icons';
import ChessBoardGrid from '../components/ChessBoardGrid';
import EngineLineSimple from './component_helpers/EngineLineSimple';
import SetUpPositionView from './component_helpers/SetUpPositionView';
import { 
    AnalysisMenuItem, 
    EngineLineSpecial, 
    MoveItem, 
    TabItem, 
    ControlBtn, 
    FooterAction 
} from './component_helpers/AnalysisHelpers';

const AnalysisPanel = ({ 
    history, 
    currentEval, 
    openingName, 
    onSaveClick, 
    onNewClick,   
    viewIndex,   
    onViewMove,
    onReviewClick,
    onSetupClick,
    currentFen,
    initialAnalysis,
}) => {

    const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const [tooltip, setTooltip] = useState({ x: 0, y: 0, visible: false, fen: null });

    const chess = new Chess(currentFen || DEFAULT_FEN);
    const turn = chess.turn();

    const isActive = history.length > 0 || (currentFen && currentFen !== DEFAULT_FEN);
    const currentMoveData = history.length === 0 
        ? (initialAnalysis ? { 
            fen: currentFen, 
            engine_lines: initialAnalysis.engineLines, 
            eval: initialAnalysis.eval 
          } : { fen: currentFen, engine_lines: [] })
        : (viewIndex === -1 ? history[history.length - 1] : history[viewIndex]);

    const startsWithBlack = history.length > 0 && history[0].fen_before 
        ? new Chess(history[0].fen_before).turn() === 'b'
        : chess.turn() === 'b' && history.length === 0;
    const startMoveNum = (history.length > 0 && history[0].fen_before)
        ? new Chess(history[0].fen_before).moveNumber()
        : chess.moveNumber();

    const isFirstMoveBlack = startsWithBlack && history.length > 0;

    const getDisplayLines = () => {
        // 1. Ha éppen egy múltbéli lépést nézünk a history-ban
        if (viewIndex !== -1 && history[viewIndex]) {
            return history[viewIndex].engineLines || history[viewIndex].engine_lines || [];
        }
        // 2. Ha az aktuális (legutolsó) lépésnél vagyunk a history-ban
        if (history.length > 0 && viewIndex === -1) {
            return history[history.length - 1].engineLines || history[history.length - 1].engine_lines || [];
        }
        // 3. Ha NINCS history (most töltöttünk be FEN-t), de van initialAnalysis
        if (history.length === 0 && initialAnalysis) {
            return initialAnalysis.engineLines || [];
        }
        return [];
    };

    const engineLinesToDisplay = getDisplayLines();


   
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
        <div className="relative w-[480px] h-[744px] bg-[#262421] rounded-lg flex flex-col shadow-xl border border-[#3c3a37] overflow-hidden font-sans">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {!isActive ? (
                    /* HA NINCS LÉPÉS, A KEZDŐMENÜT MUTATJUK */
                    <div className="flex flex-col">
                        <div className="p-4 border-b border-[#3c3a37] flex items-center justify-center gap-2 bg-[#21201d] shrink-0">
                            <New size={24} className="text-[#81b64c]" />
                            <h2 className="font-bold uppercase tracking-widest text-sm text-white">Analysis</h2>
                        </div>
                        <div className="flex-1 pt-3 overflow-y-auto no-scrollbar">
                            <AnalysisMenuItem icon={<MakeMoves size={24} />} label="Make Moves" />
                            <AnalysisMenuItem 
                                icon={<SetUpPosition size={24} />} 
                                label="Set Up Position" 
                                onClick={onSetupClick} 
                            />
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
                            <div className="mt-2 mb-4 px-4">
                                <AnalysisMenuItem icon={<LoadPrevious size={18} />} label="Load Previous Analysis" />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* --- AKTÍV ELEMZŐ NÉZET (HA MÁR VANNAK LÉPÉSEK) --- */
                    <div className="flex flex-col h-full">
                        <div className="flex bg-[#21201d] border-b border-[#3c3a37] shrink-0">
                            <TabItem icon={<Search size={18} />} label="Analysis" active />
                            <TabItem icon={<GameCollections size={18} />} label="Games" />
                            <TabItem icon={<BookOpen size={18} />} label="Explore" />
                        </div>

                        <div className="px-3 py-2 flex items-center justify-between bg-[#262421] shrink-0">
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

                        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#262421] px-2 pt-1 flex flex-col min-h-0">
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


                                {engineLinesToDisplay.map((line, idx) => (
                                    <EngineLineSimple 
                                        key={idx}
                                        eval={line.eval} 
                                        moves={line.continuation} 
                                        onMouseEnter={(e) => {
                                            const fen = getVariationFen(line.pv_uci);
                                            setTooltip({ x: e.clientX, y: e.clientY, visible: true, fen });
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
                            {(() => {
                                const rows = [];
                                let hIdx = 0;

                                // SPECIÁLIS ELSŐ SOR: Ha sötéttel indult a sandbox
                                if (isFirstMoveBlack) {
                                    rows.push(
                                        <div key="row-0" className={`grid grid-cols-[35px_1fr_1fr] items-center min-h-[30px] px-3 ${viewIndex === 0 ? 'bg-[#ffffff03]' : ''}`}>
                                            <span className="text-[12px] text-[#8b8987] font-mono select-none">{startMoveNum}.</span>
                                            {/* Világos helyén a három pont */}
                                            <span className="text-[12px] text-[#8b8987] px-3 italic opacity-50">...</span>
                                            {/* Sötét lépése (history[0]) - kötelezően isBlack={true} */}
                                            <MoveItem 
                                                move={history[0]} 
                                                isActive={viewIndex === 0} 
                                                onClick={() => onViewMove(0)} 
                                                isBlack={true} 
                                            />
                                        </div>
                                    );
                                    hIdx = 1; // A folytatás a history[1]-től indul
                                }

                                // TÖBBI SOR: Kettesével haladunk
                                for (let j = hIdx; j < history.length; j += 2) {
                                    // A körszám számítása: ha sötéttel kezdtünk, a j=1 már az 51. kör világosa lesz
                                    const displayNum = isFirstMoveBlack 
                                        ? startMoveNum + Math.floor((j + 1) / 2)
                                        : startMoveNum + Math.floor(j / 2);

                                    rows.push(
                                        <div key={`row-${j}`} className={`grid grid-cols-[35px_1fr_1fr] items-center min-h-[30px] px-3 ${
                                            (viewIndex === j || viewIndex === j + 1) ? 'bg-[#ffffff03]' : ''
                                        }`}>
                                            <span className="text-[12px] text-[#8b8987] font-mono select-none">{displayNum}.</span>
                                            
                                            {/* Világos oszlop: history[j] */}
                                            <MoveItem 
                                                move={history[j]} 
                                                isActive={viewIndex === j} 
                                                onClick={() => onViewMove(j)} 
                                                isBlack={false} 
                                            />

                                            {/* Sötét oszlop: history[j+1] */}
                                            {history[j+1] ? (
                                                <MoveItem 
                                                    move={history[j+1]} 
                                                    isActive={viewIndex === j+1} 
                                                    onClick={() => onViewMove(j+1)} 
                                                    isBlack={true} 
                                                />
                                            ) : <div className="flex-1" />}
                                        </div>
                                    );
                                }
                                return rows;
                            })()}
                        </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FIX FOOTER - Mindig látható */}
            <div className="p-2 bg-[#21201d] rounded-b-lg border-t border-[#3c3a37] shrink-0">
                <div className="flex justify-between gap-1 mb-3 px-1 h-12">
                    <ControlBtn icon={<ResetArrow size={20} />} onClick={() => onViewMove(0)} />
                    <ControlBtn icon={<ChevronLeft size={20} />} onClick={() => onViewMove(viewIndex === -1 ? history.length - 2 : viewIndex - 1)} />
                    <ControlBtn icon={<ChevronRight size={20} />} onClick={() => onViewMove(viewIndex === -1 ? -1 : viewIndex + 1)} />
                    <ControlBtn icon={<ArrowChevronEnd size={20} />} onClick={() => onViewMove(-1)} />
                </div>
                <div className="flex justify-center items-center text-[#8b8987] pb-1">
                     <div className='flex gap-7 text-xs'>
                        <FooterAction icon={<New size={20} />} label="New" onClick={onNewClick} />
                        <FooterAction icon={<Save size={20} />} label="Save" onClick={onSaveClick} />
                        <FooterAction icon={<Review size={20} />} label="Review" onClick={onReviewClick} />
                        <FooterAction icon={<MoreHorizontal size={20} />} label="" />
                     </div>
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

export default AnalysisPanel;