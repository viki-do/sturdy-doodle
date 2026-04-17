import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import axios from 'axios';
import ChessBoardGrid from '../components/ChessBoardGrid';
import AnalysisPanel from './AnalysisPanel';
import { useChess } from '../context/ChessContext';
import { Settings } from 'lucide-react';
import SetUpPositionView from './component_helpers/SetUpPositionView';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    
    SetUpPosition, GameCollections
} from './icons/Icons';


const getCapturedPieces = (fen) => {
    const defaults = {
        p: 8, n: 2, b: 2, r: 2, q: 1,
        P: 8, N: 2, B: 2, R: 2, Q: 1
    };
    const currentOnBoard = {};
    const position = fen.split(' ')[0];
    for (let char of position) {
        if (/[a-zA-Z]/.test(char)) {
            currentOnBoard[char] = (currentOnBoard[char] || 0) + 1;
        }
    }
    const captured = { whiteSide: [], blackSide: [] };
    Object.keys(defaults).forEach(piece => {
        const count = defaults[piece] - (currentOnBoard[piece] || 0);
        for (let i = 0; i < count; i++) {
            if (piece === piece.toUpperCase()) captured.blackSide.push(piece.toLowerCase());
            else captured.whiteSide.push(piece);
        }
    });
    const order = ['p', 'n', 'b', 'r', 'q'];
    captured.whiteSide.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    captured.blackSide.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return captured;
};

const getMaterialDiff = (captured) => {
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const whiteVal = captured.whiteSide.reduce((sum, p) => sum + values[p], 0);
    const blackVal = captured.blackSide.reduce((sum, p) => sum + values[p], 0);
    return whiteVal - blackVal;
};

const CapturedRow = ({ pieces, side, diff }) => {
    // 1. Csoportosítjuk a bábukat típus szerint
    // Eredmény pl: { p: ['p', 'p'], n: ['n'], b: ['b', 'b'] }
    const groups = pieces.reduce((acc, piece) => {
        if (!acc[piece]) acc[piece] = [];
        acc[piece].push(piece);
        return acc;
    }, {});

    // Meghatározzuk a fix sorrendet (gyalogtól a vezérig)
    const order = ['p', 'n', 'b', 'r', 'q'];

    return (
        <div className="flex items-center h-5 mt-1 ml-0.5">
            <div className="flex gap-[2px]"> {/* Távolság a típuscsoportok között */}
                {order.map(type => {
                    const group = groups[type];
                    if (!group) return null;

                    return (
                        <div key={type} className="flex relative" style={{ marginRight: group.length > 1 ? '4px' : '0' }}>
                            {group.map((piece, idx) => (
                                <img 
                                    key={idx}
                                    src={`/assets/pieces/${side === 'white' ? 'black' : 'white'}_${
                                        piece === 'p' ? 'pawn' : piece === 'n' ? 'knight' : 
                                        piece === 'b' ? 'bishop' : piece === 'r' ? 'rook' : 'queen'
                                    }.png`}
                                    className="w-4.5 h-4.5 object-contain"
                                    style={{ 
                                        // Itt történik az egymás mögé csúsztatás
                                        marginLeft: idx === 0 ? 0 : '-10px', 
                                        zIndex: idx 
                                    }}
                                    alt={piece}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
            
            {/* Anyagi előny kiírása a sor végén */}
            {diff > 0 && (
                <span className="text-[11px] font-bold text-[#8b8987] ml-2 leading-none self-center">
                    +{diff}
                </span>
            )}
        </div>
    );
};

const AnalyzeBoard = () => {
    const chessContext = useChess();
    
    const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    // --- ÁLLAPOTOK ---
    const [sandboxFen, setSandboxFen] = useState(DEFAULT_FEN);

    const [sandboxStartingFen, setSandboxStartingFen] = useState(DEFAULT_FEN);

    const [sandboxHistory, setSandboxHistory] = useState([]);
    const [sandboxLastMove, setSandboxLastMove] = useState({ from: null, to: null });
    const [viewIndex, setViewIndex] = useState(-1);
    const [openingName, setOpeningName] = useState("");
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [pendingPromotion, setPendingPromotion] = useState(null);
    const [previewFen, setPreviewFen] = useState(null);
    const [rightPanelMode, setRightPanelMode] = useState('analysis'); // 'analysis' vagy 'setup'
    

    const {
        getSquareName, setSelectedSquare, setValidMoves, API_BASE,
        selectedSquare, validMoves, isDragging, setIsDragging,
        token, playSound, setMousePos, setDragOffset, 
        setHoverSquare, hoverSquare
    } = chessContext;

   
    // --- PERSISTENCE ---
    useEffect(() => {
    const saved = localStorage.getItem('chess_analysis_cache');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            
            // A meglévő betöltéseid:
            if (data.fen) setSandboxFen(data.fen);
            if (data.history) setSandboxHistory(data.history);
            if (data.lastMove) setSandboxLastMove(data.lastMove);
            if (data.opening) setOpeningName(data.opening);

            if (data.startingFen) {
                setSandboxStartingFen(data.startingFen);
            } else if (data.fen && (!data.history || data.history.length === 0)) {
            
                setSandboxStartingFen(data.fen);
            }

        } catch (e) {
            console.error("Hiba a cache betöltésekor:", e);
        }
    }
}, []); 

    useEffect(() => {
        const cache = { fen: sandboxFen, history: sandboxHistory, lastMove: sandboxLastMove, opening: openingName, startingFen: sandboxStartingFen };
        localStorage.setItem('chess_analysis_cache', JSON.stringify(cache));
    }, [sandboxFen, sandboxHistory, sandboxLastMove, openingName, sandboxStartingFen]);



    const handleHoverVariation = useCallback((pvUci) => {
        if (!pvUci || pvUci.length === 0) {
            setPreviewFen(null);
            return;
        }
        try {
            const tempChess = new Chess(sandboxFen);
            for (const uci of pvUci) {
                tempChess.move({ 
                    from: uci.slice(0, 2), 
                    to: uci.slice(2, 4), 
                    promotion: uci[4] || 'q' 
                });
            }
            setPreviewFen(tempChess.fen());
        } catch (e) {
            setPreviewFen(null);
        }
    }, [sandboxFen]);

    // --- LÉPÉS VÉGREHAJTÁS ---
    const executeAnalysisMove = async (from, to, promotion = null) => {
        if (viewIndex !== -1) {
            const latest = sandboxHistory[sandboxHistory.length - 1];
            if (latest) {
                setSandboxFen(latest.fen);
                setSandboxLastMove({ from: latest.from, to: latest.to });
            }
            setViewIndex(-1);
            return; 
        }

        setSelectedSquare(null);
        setValidMoves([]);
        setHoverSquare(null);

        const chess = new Chess(sandboxFen);
        const fenBefore = sandboxFen;
        const piece = chess.get(from);

        if (piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1')) && !promotion) {
            setPendingPromotion({ from, to });
            setIsDragging(false);
            return;
        }

        const moveAttempt = chess.move({ from, to, promotion: promotion || 'q' });
        if (!moveAttempt) return;

        const newFen = chess.fen();
        setSandboxFen(newFen);
        setSandboxLastMove({ from, to });
        setPendingPromotion(null);

        const tempMove = {
            num: sandboxHistory.length,
            m: moveAttempt.san,
            from, to,
            fen: newFen,
            analysisLabel: null 
        };
        setSandboxHistory(prev => [...prev, tempMove]);
        playSound(moveAttempt.captured ? 'capture' : 'move');

        setIsAnalyzing(true);
        try {
            const prevEval = sandboxHistory.length > 0 
                ? (sandboxHistory[sandboxHistory.length - 1].rawEval || 0) 
                : 0;

            const res = await axios.post(`${API_BASE}/analyze-sandbox-move`, {
                fen_before: fenBefore, 
                move: moveAttempt.san, 
                prev_eval: prevEval
            }, { headers: { Authorization: `Bearer ${token}` } });

            setSandboxHistory(prev => prev.map((h, i) => 
                i === prev.length - 1 ? {
                    ...h,
                    analysisLabel: res.data.label?.toLowerCase(),
                    eval: res.data.eval / 100,
                    rawEval: res.data.eval,
                    bestMove: res.data.best_move,
                    engineLines: res.data.engine_lines || [] 
                } : h
            ));

            if (res.data.opening) {
                setOpeningName(typeof res.data.opening === 'object' ? res.data.opening.name : res.data.opening);
            }
        } catch (err) {
            console.error("Analysis error:", err);
        } finally { 
            setIsAnalyzing(false); 
        }
    };

const handleFullReview = async () => {
    console.log("--- DEBUG: Full Review Folyamat Elindult ---");
    
    // 1. Ellenőrizzük, van-e egyáltalán mit elemezni
    if (sandboxHistory.length === 0) {
        console.warn("STOP: A sandboxHistory üres, nincs mit elemezni.");
        return;
    }

    setIsAnalyzing(true);

    try {
        
        const moveList = sandboxHistory.map(h => h.m);
        
        const startFen = typeof sandboxStartingFen !== 'undefined' && sandboxStartingFen 
            ? sandboxStartingFen 
            : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

        console.log("1. Küldésre kész adatok:", {
            initial_fen: startFen,
            moves_count: moveList.length,
            moves: moveList
        });


        console.log("2. API hívás indítása: /analyze-full-game-sandbox");
        const res = await axios.post(`${API_BASE}/analyze-full-game-sandbox`, { 
            moves: moveList,
            initial_fen: sandboxStartingFen 
        }, { 
            headers: { Authorization: `Bearer ${token}` } 
        });

        console.log("3. Szerver válasz megérkezett:", res.data);

        if (res.data && res.data.analysis) {
            console.log("4. History frissítése az elemzési adatokkal...");
            
            setSandboxHistory(prev => {
                const updatedHistory = prev.map((h, i) => {
                    // Megkeressük a válaszban a lépés sorszáma alapján (1-től indul a backend-en)
                    const moveAnalysis = res.data.analysis.find(a => a.move_number === (i + 1));
                    
                    if (moveAnalysis) {
                        return { 
                            ...h, 
                            analysisLabel: moveAnalysis.label.toLowerCase(),
                            eval: moveAnalysis.eval, // A backend már osztotta 100-zal
                            rawEval: moveAnalysis.raw_eval,
                            bestMove: moveAnalysis.best_move,
                            engineLines: moveAnalysis.engine_lines || [],
                            // Megnyitás neve, ha van
                            openingName: moveAnalysis.opening || null 
                        };
                    }
                    return h;
                });
                
                console.log("5. Frissített Sandbox History:", updatedHistory);
                return updatedHistory;
            });
            
            // Ha a szerver visszaadott egy globális megnyitás nevet, azt is beállíthatjuk
            if (res.data.analysis[0]?.opening) {
                setOpeningName(res.data.analysis[0].opening);
            }

            console.log("--- DEBUG: Full Review Sikeresen Befejeződött ---");
        } else {
            console.error("HIBA: A szerver válaszában nincs 'analysis' mező!", res.data);
        }

    } catch (err) {
        console.error("!!! FULL REVIEW ERROR !!!");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Szerver hibaüzenet:", err.response.data);
            if (err.response.status === 404) {
                console.error("404-es hiba: Még nem adtad hozzá az új végpontot a Python kódhoz!");
            }
        } else {
            console.error("Hiba oka:", err.message);
        }
    } finally {
        setIsAnalyzing(false);
    }
};
    const handleMouseDown = (e, row, col) => {
        if (previewFen) return; // Zárolás preview alatt

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const square = getSquareName(row, col);
        const chess = new Chess(sandboxFen);
        const piece = chess.get(square);

        if (selectedSquare && selectedSquare !== square && validMoves.includes(square)) {
            executeAnalysisMove(selectedSquare, square);
            return;
        }

        if (piece) {
            setMousePos({ x: clientX, y: clientY });
            setSelectedSquare(square);
            setHoverSquare(square);
            setIsDragging(true);

            const moves = chess.moves({ square, verbose: true }).map(m => m.to);
            setValidMoves(moves);

            const rect = e.currentTarget.getBoundingClientRect();
            setDragOffset({ 
                x: clientX - (rect.left + rect.width / 2), 
                y: clientY - (rect.top + rect.height / 2) 
            });
        }
    };

    const handleMouseUp = useCallback(async () => {
        if (!isDragging || !selectedSquare) return;
        const from = selectedSquare;
        const target = hoverSquare; 
        
        setIsDragging(false);
        setSelectedSquare(null);
        setValidMoves([]);
        setHoverSquare(null);

        if (!target || target === from) return;

        const chess = new Chess(sandboxFen);
        const isValid = chess.moves({ square: from, verbose: true }).some(m => m.to === target);

        if (isValid) {
            await executeAnalysisMove(from, target);
        } else {
            playSound('illegal');
        }
    }, [isDragging, selectedSquare, hoverSquare, sandboxFen, playSound, executeAnalysisMove]);

    useEffect(() => {
        const handleMove = (e) => {
            if (!isDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            setMousePos({ x: clientX, y: clientY });

            const board = document.getElementById('chess-board')?.getBoundingClientRect();
            if (board) {
                let col = Math.floor((clientX - board.left) / (board.width / 8));
                let row = Math.floor((clientY - board.top) / (board.height / 8));
                if (isFlipped) { col = 7 - col; row = 7 - row; }
                if (col >= 0 && col < 8 && row >= 0 && row < 8) setHoverSquare(getSquareName(row, col));
                else setHoverSquare(null);
            }
        };
        const handleGlobalUp = () => { if (isDragging) handleMouseUp(); };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('mouseup', handleGlobalUp);
        window.addEventListener('touchend', handleGlobalUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleGlobalUp);
            window.removeEventListener('touchend', handleGlobalUp);
        };
    }, [isDragging, isFlipped, getSquareName, handleMouseUp, setMousePos, setHoverSquare]);



    // Mindig az aktuális (vagy preview) FEN alapján számolunk
    const currentFen = previewFen || (viewIndex === -1 ? sandboxFen : (sandboxHistory[viewIndex]?.fen || sandboxFen));
    const captured = getCapturedPieces(currentFen);
    const materialDiff = getMaterialDiff(captured);

    const currentEvalValue = viewIndex === -1 && sandboxHistory.length > 0 
        ? sandboxHistory[sandboxHistory.length - 1].eval : 0;
    const whiteBarHeight = Math.min(Math.max(50 + (currentEvalValue * 10), 5), 95);

    return (
        <div className="flex h-screen w-full bg-[#161512] text-[#bab9b8] px-6 py-4 gap-6 overflow-hidden select-none font-sans items-center">
            
            {/* EVAL BAR */}
            <div className="w-8 h-170 bg-[#262421] rounded-sm overflow-hidden flex flex-col-reverse relative border border-[#3c3a37] shrink-0 shadow-lg">
                <div className="bg-white w-full transition-all duration-700 ease-out" style={{ height: `${whiteBarHeight}%` }}>
                    <span className="absolute bottom-2 left-0 w-full text-center text-[10px] font-bold text-black uppercase">
                        {(currentEvalValue || 0).toFixed(1)}
                    </span>
                </div>
            </div>

            {/* TÁBLA SZEKCIÓ */}
            <div className="flex flex-col justify-center items-center gap-2">
                {/* BLACK PLAYER INFO */}
                <div className="w-170 flex items-center justify-between px-1 h-12 text-[#8b8987]">
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#262421] rounded flex items-center justify-center italic text-xs border border-white/5 font-bold">B</div>
                            <span className="font-bold text-sm">Black</span>
                        </div>
                        <CapturedRow 
                            pieces={captured.blackSide} 
                            side="black" 
                            diff={materialDiff < 0 ? Math.abs(materialDiff) : 0} 
                        />
                    </div>
                    <Settings size={18} className="cursor-pointer hover:text-white transition-colors" />
                </div>

                <div id="chess-board" className="w-170 h-170 relative shadow-2xl shadow-black/50">
                    <ChessBoardGrid 
                        gameLogic={{ 
                            ...chessContext, 
                            fen: previewFen || (viewIndex === -1 ? sandboxFen : (sandboxHistory[viewIndex]?.fen || sandboxFen)), 
                            history: sandboxHistory, 
                            lastMove: previewFen ? { from: null, to: null } : sandboxLastMove, 
                            isFlipped,
                            viewIndex,
                            status: previewFen ? "viewing" : "ongoing",
                            handleMouseUp: handleMouseUp 
                        }} 
                        onMouseDown={handleMouseDown} 
                        onMouseUp={handleMouseUp} 
                    />

                    {/* Promóció */}
                    {pendingPromotion && (
                        <div className="absolute z-[5000] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
                            style={{
                                left: `${(isFlipped ? (104 - pendingPromotion.to.charCodeAt(0)) : (pendingPromotion.to.charCodeAt(0) - 97)) * 12.5}%`,
                                top: pendingPromotion.to.endsWith('8') ? '0' : 'auto',
                                bottom: pendingPromotion.to.endsWith('1') ? '0' : 'auto',
                                width: '12.5%'
                            }}>
                            {['q', 'n', 'r', 'b'].map((type) => (
                                <button key={type} onClick={() => executeAnalysisMove(pendingPromotion.from, pendingPromotion.to, type)} className="w-full aspect-square hover:bg-gray-100 p-1 border-b border-gray-100">
                                    <img src={`/assets/pieces/${sandboxFen.split(' ')[1] === 'w' ? 'white' : 'black'}_${type === 'q' ? 'queen' : type === 'n' ? 'knight' : type === 'r' ? 'rook' : 'bishop'}.png`} alt={type} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* WHITE PLAYER INFO */}
                <div className="w-170 flex items-center justify-between px-1 h-12 text-[#bab9b8]">
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#ffffff] rounded flex items-center justify-center text-black italic text-xs shadow-sm font-bold border border-black/10">W</div>
                            <span className="font-bold text-sm text-[#bab9b8]">White</span>
                        </div>
                        <CapturedRow 
                            pieces={captured.whiteSide} 
                            side="white" 
                            diff={materialDiff > 0 ? materialDiff : 0} 
                        />
                    </div>
                </div>
            </div>
        
            <div className="w-[480px] h-[744px] shrink-0 relative box-border">
            {rightPanelMode === 'setup' ? (
            <SetUpPositionView 
                onBack={() => setRightPanelMode('analysis')} 
                currentFen={sandboxFen} // Átadjuk az aktuális állást
                onFenChange={(newFen) => {
                    try {
                        const c = new Chess(newFen); // Validáljuk, hogy helyes-e a FEN
                        setSandboxFen(newFen);
                        setSandboxStartingFen(newFen); // Ez lesz az új kezdőpont
                        setSandboxHistory([]); // Alaphelyzetbe állítjuk a történetet az új kezdőpontnál
                        setSandboxLastMove({ from: null, to: null });
                    } catch (e) {
                            // Ha érvénytelen a FEN amit gépel, nem frissítünk
                    }
                }}
            />
            ) : (
            <AnalysisPanel 
                history={sandboxHistory}
                currentEval={currentEvalValue}
                openingName={openingName}
                viewIndex={viewIndex}
                onViewMove={(idx) => {
                    const move = sandboxHistory[idx];
                    if (move) {
                        setSandboxFen(move.fen);
                        setSandboxLastMove({ from: move.from, to: move.to });
                        setViewIndex(idx);
                    } else if (idx === -1) {
                        const latest = sandboxHistory[sandboxHistory.length - 1];
                        setSandboxFen(latest ? latest.fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
                        setSandboxLastMove(latest ? { from: latest.from, to: latest.to } : { from: null, to: null });
                        setViewIndex(-1);
                    }
                }}
                onSaveClick={() => setIsSaveModalOpen(true)}
                onNewClick={() => sandboxHistory.length > 0 && setIsNewModalOpen(true)}
                onReviewClick={handleFullReview}
                onSetupClick={() => setRightPanelMode('setup')} // Ez már jó volt
                onHoverVariation={handleHoverVariation}
            />
        )}
            </div>
            
  

            {/* SAVE MODAL */}
            <AnimatePresence>
                {isSaveModalOpen && (
                    <div className="fixed inset-0 z-[6000] flex items-center justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSaveModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-[450px] bg-[#262421] rounded-xl shadow-2xl border border-[#3c3a37] overflow-hidden">
                            <div className="p-4 border-b border-[#3c3a37] bg-[#21201d] flex justify-between items-center">
                                <h3 className="text-white font-bold">Add to Collection</h3>
                                <button onClick={() => setIsSaveModalOpen(false)} className="text-[#bab9b8] hover:text-white rotate-45"><SetUpPosition size={18}/></button>
                            </div>
                            <div className="p-12 text-center text-[#bab9b8] text-sm">You have not created any Collections yet.</div>
                            <div className="p-6 pt-0 space-y-2">
                                <button className="w-full py-3 bg-[#312e2b] text-white font-bold rounded-lg flex items-center justify-center gap-2 border border-[#3c3a37]"><SetUpPosition size={20}/> Create New Collection</button>
                                <button className="w-full py-3 text-[#bab9b8] text-xs font-bold flex items-center justify-center gap-2"><GameCollections size={16}/> Copy Shareable Link</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* NEW ANALYSIS CONFIRMATION MODAL */}
        <AnimatePresence>
            {isNewModalOpen && (
                <div className="fixed inset-0 z-[7000] flex items-center justify-center">
                    {/* Overlay */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsNewModalOpen(false)}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />

                    {/* Modal Box */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-[400px] bg-[#262421] rounded-xl shadow-2xl border border-[#3c3a37] p-8 overflow-hidden text-center"
                    >
                        {/* Bezáró X gomb a sarokban */}
                        <button 
                            onClick={() => setIsNewModalOpen(false)}
                            className="absolute top-4 right-4 text-[#8b8987] hover:text-white transition-colors"
                        >
                            <SetUpPosition size={20} className="rotate-45" /> 
                        </button>

                        <h2 className="text-white text-2xl font-bold mb-2">Start New Analysis?</h2>
                        <p className="text-[#bab9b8] text-sm mb-8">
                            Any unsaved progress will be lost.
                        </p>

                        <div className="flex gap-4">
                            {/* Cancel Gomb */}
                            <button 
                                onClick={() => setIsNewModalOpen(false)}
                                className="flex-1 py-3 bg-[#3d3a37] hover:bg-[#45423e] text-white font-bold rounded-lg transition-colors shadow-lg"
                            >
                                Cancel
                            </button>

                            {/* New Analysis Gomb (Piros) */}
                            <button 
                                onClick={() => {
                                    // Itt töröljük az elemzést
                                    setSandboxFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
                                    setSandboxHistory([]);
                                    setSandboxStartingFen(DEFAULT_FEN);
                                    setSandboxLastMove({ from: null, to: null });
                                    setOpeningName("");
                                    setIsNewModalOpen(false);
                                    localStorage.removeItem('chess_analysis_cache');
                                }}
                                className="flex-1 py-3 bg-[#fa412d] hover:bg-[#ff5a4a] text-white font-bold rounded-lg transition-colors shadow-lg"
                            >
                                New Analysis
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        </div>
    );
};

export default AnalyzeBoard;