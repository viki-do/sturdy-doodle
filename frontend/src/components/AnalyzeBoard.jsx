import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import axios from 'axios';
import ChessBoardGrid from '../components/ChessBoardGrid';
import AnalysisPanel from './AnalysisPanel';
import { useChess } from '../context/ChessContext';
import { Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const AnalyzeBoard = () => {
    const chessContext = useChess();
    
    // --- ÁLLAPOTOK ---
    const [sandboxFen, setSandboxFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const [sandboxHistory, setSandboxHistory] = useState([]);
    const [sandboxLastMove, setSandboxLastMove] = useState({ from: null, to: null });
    const [viewIndex, setViewIndex] = useState(-1);
    const [openingName, setOpeningName] = useState("");
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [pendingPromotion, setPendingPromotion] = useState(null);

    const {
        getSquareName, setSelectedSquare, setValidMoves, API_BASE,
        selectedSquare, validMoves, isDragging, setIsDragging,
        token, playSound, setMousePos, setDragOffset, 
        setHoverSquare, hoverSquare, mousePos
    } = chessContext;

    // --- PERSISTENCE: Betöltés és Mentés ---
    useEffect(() => {
        const saved = localStorage.getItem('chess_analysis_cache');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setSandboxFen(data.fen);
                setSandboxHistory(data.history || []);
                setSandboxLastMove(data.lastMove || { from: null, to: null });
                setOpeningName(data.opening || "");
            } catch (e) { console.error("Cache error", e); }
        }
    }, []);

    useEffect(() => {
        const cache = { fen: sandboxFen, history: sandboxHistory, lastMove: sandboxLastMove, opening: openingName };
        localStorage.setItem('chess_analysis_cache', JSON.stringify(cache));
    }, [sandboxFen, sandboxHistory, sandboxLastMove, openingName]);

    // --- LÉPÉS VÉGREHAJTÁS ---
    const executeAnalysisMove = async (from, to, promotion = null) => {
        const chess = new Chess(sandboxFen);
        const piece = chess.get(from);

        // Promóció ellenőrzése
        if (piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1')) && !promotion) {
            setPendingPromotion({ from, to });
            setIsDragging(false);
            return;
        }

        const fenBefore = sandboxFen;
        const moveAttempt = chess.move({ from, to, promotion: promotion || 'q' });
        
        if (!moveAttempt) return;

        const newFen = chess.fen();
        setSandboxFen(newFen);
        setSandboxLastMove({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);
        setIsDragging(false);
        setHoverSquare(null);
        setPendingPromotion(null);
        setViewIndex(-1);

        playSound(moveAttempt.captured ? 'capture' : 'move');

        setIsAnalyzing(true);
        try {
            const prevEval = sandboxHistory.length > 0 ? (sandboxHistory[sandboxHistory.length - 1].rawEval || 30) : 30;
            const res = await axios.post(`${API_BASE}/analyze-sandbox-move`, {
                fen_before: fenBefore, move: moveAttempt.san, prev_eval: prevEval
            }, { headers: { Authorization: `Bearer ${token}` } });

            setSandboxHistory(prev => [...prev, {
                num: prev.length, m: moveAttempt.san, from, to, fen: newFen,
                analysisLabel: res.data.label, eval: res.data.eval / 100,
                rawEval: res.data.eval, bestMove: res.data.best_move
            }]);

            if (res.data.opening) {
                setOpeningName(typeof res.data.opening === 'object' ? res.data.opening.name : res.data.opening);
            }
        } catch (err) {
            setSandboxHistory(prev => [...prev, { m: moveAttempt.san, from, to, fen: newFen, num: prev.length }]);
        } finally { setIsAnalyzing(false); }
    };

    // --- EGÉR ÉS ÉRINTÉS KEZELÉS ---
    const handleMouseDown = (e, row, col) => {
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

        if (!target || target === from) {
            setSelectedSquare(null);
            setValidMoves([]);
            setHoverSquare(null);
            return;
        }

        const chess = new Chess(sandboxFen);
        const isValid = chess.moves({ square: from, verbose: true }).some(m => m.to === target);

        if (isValid) {
            await executeAnalysisMove(from, target);
        } else {
            playSound('illegal');
            setSelectedSquare(null);
            setValidMoves([]);
        }
        setHoverSquare(null);
    }, [isDragging, selectedSquare, hoverSquare, sandboxFen, playSound]);

    // Globális mozgás figyelés (Drag & Touch fix)
    useEffect(() => {
        const handleMove = (e) => {
            if (!isDragging) return;
            if (e.type === 'touchmove' && e.cancelable) e.preventDefault();
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            setMousePos({ x: clientX, y: clientY });

            const board = document.getElementById('chess-board')?.getBoundingClientRect();
            if (board) {
                let col = Math.floor((clientX - board.left) / (board.width / 8));
                let row = Math.floor((clientY - board.top) / (board.height / 8));
                if (isFlipped) { col = 7 - col; row = 7 - row; }
                
                if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                    setHoverSquare(getSquareName(row, col));
                } else {
                    setHoverSquare(null);
                }
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
    }, [isDragging, isFlipped, getSquareName, handleMouseUp]);

    // --- UI SZÁMÍTÁSOK ---
    const currentEval = viewIndex === -1 && sandboxHistory.length > 0 
        ? sandboxHistory[sandboxHistory.length - 1].eval : 0;
    const whiteBarHeight = Math.min(Math.max(50 + (currentEval * 10), 5), 95);

    return (
        <div className="flex h-screen w-full bg-[#161512] text-[#bab9b8] p-4 gap-12 overflow-hidden select-none font-sans justify-center items-center">
            
            {/* EVAL BAR */}
            <div className="w-8 h-170 bg-[#262421] rounded-sm overflow-hidden flex flex-col-reverse relative border border-[#3c3a37] shrink-0 shadow-lg">
                <div className="bg-white w-full transition-all duration-700 ease-out" style={{ height: `${whiteBarHeight}%` }}>
                    <span className="absolute bottom-2 left-0 w-full text-center text-[10px] font-bold text-black uppercase">
                        {(currentEval || 0).toFixed(1)}
                    </span>
                </div>
            </div>

            {/* TÁBLA SZEKCIÓ */}
            <div className="flex flex-col justify-center items-center gap-2">
                <div className="w-170 flex items-center justify-between px-1 h-8 text-[#8b8987] text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#262421] rounded flex items-center justify-center italic text-xs border border-white/5">B</div>
                        <span className="font-bold">Black</span>
                    </div>
                    <Settings size={18} className="cursor-pointer hover:text-white transition-colors" />
                </div>

                <div id="chess-board" className="w-170 h-170 relative shadow-2xl shadow-black/50">
                    <ChessBoardGrid 
                        gameLogic={{ 
                            ...chessContext, 
                            fen: sandboxFen, 
                            history: sandboxHistory, 
                            lastMove: sandboxLastMove, 
                            isFlipped,
                            viewIndex,
                            status: "ongoing", // Hogy sandboxban mindig megfogható legyen a bábu
                            isAlert: false,    // Tiltjuk a király villogását szabálytalan lépésnél
                            handleMouseUp: handleMouseUp 
                        }} 
                        onMouseDown={handleMouseDown} 
                        onMouseUp={handleMouseUp} 
                    />

                    {/* Promóció választó */}
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

                <div className="w-170 flex items-center justify-between px-1 h-8 text-[#bab9b8] text-sm font-bold">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#ffffff] rounded flex items-center justify-center text-black italic text-xs shadow-sm">W</div>
                        <span>White</span>
                    </div>
                </div>
            </div>

            {/* PANEL */}
            <AnalysisPanel 
                history={sandboxHistory}
                currentEval={currentEval}
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
            />
  

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