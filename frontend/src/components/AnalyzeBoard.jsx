import React, { useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ChessBoardGrid from '../components/ChessBoardGrid';
import MoveListPanel from '../components/MoveListPanel';
import { useChessGame } from '../hooks/useChessGame.jsx';
import axios from 'axios';
import { Chess } from 'chess.js';

const AnalyzeBoard = () => {
    const gameLogic = useChessGame();
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // --- ÚJ ÁLLAPOT A PROMOTION KEZELÉSÉHEZ (A GameBoard-ból) ---
    const [pendingPromotion, setPendingPromotion] = useState(null);

    const {
        history, viewIndex, setFen, setLastMove, setViewIndex,
        getSquareName, fen, setSelectedSquare, setValidMoves, API_BASE,
        selectedSquare, validMoves, isDragging, setHistory, playSound,
        token, setOpening, mousePos, setMousePos, setDragOffset, 
        setIsDragging, setHoverSquare, hoverSquare, lastMove
    } = gameLogic;

    // --- 1. PRECIZ HANG LOGIKA ---
    const playNavSound = useCallback((notation) => {
        if (!notation || notation === "start") return;
        if (notation.includes('#')) playSound('checkmate');
        else if (notation.includes('+')) playSound('move-check');
        else if (notation.includes('O-O')) playSound('castle');
        else if (notation.includes('x')) playSound('capture');
        else if (notation.includes('=')) playSound('promote');
        else playSound('move');
    }, [playSound]);

    // --- 2. GO TO MOVE (Navigáció) ---
    const goToMove = useCallback((index) => {
        setSelectedSquare(null);
        setPendingPromotion(null); // Bezárjuk a popupot, ha navigálunk

        if (index === -1 || index >= history.length - 1) {
            setViewIndex(-1);
            const latest = history[history.length - 1];
            if (latest) {
                setFen(latest.fen);
                setLastMove({ from: latest.from, to: latest.to });
                playNavSound(latest.m);
            }
            return;
        }
        const move = history[index];
        if (!move) return;
        playNavSound(move.m);
        setFen(move.fen);
        setLastMove({ from: move.from, to: move.to });
        setViewIndex(index);
    }, [history, setFen, setLastMove, setViewIndex, setSelectedSquare, playNavSound]);

    // --- 3. JAVÍTOTT ELEMZŐ LÉPÉS (Promotion támogatással) ---
    const executeAnalysisMove = async (from, to, promotion = null) => {
        const chess = new Chess(fen);
        const fenBefore = fen;
        const piece = chess.get(from);

        // --- PROMOTION ELLENŐRZÉS (Golyóálló logika) ---
        if (piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1')) && !promotion) {
            setPendingPromotion({ from, to });
            setIsDragging(false);
            return;
        }

        const prevEval = history.length > 0 ? (history[history.length - 1].rawEval || 30) : 30;

        // Ha nincs megadva promotion, alapértelmezetten 'q' (de csak ha a fenti check nem indult be)
        const moveAttempt = chess.move({ from, to, promotion: promotion || 'q' });
        if (!moveAttempt) return;

        const newFen = chess.fen();
        setFen(newFen);
        setLastMove({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);
        setIsDragging(false);
        setHoverSquare(null);
        setPendingPromotion(null); // Bezárjuk a popupot sikeres lépés után

        // --- HANGOK KEZELÉSE ---
        setTimeout(() => {
            if (chess.isCheckmate()) playSound('checkmate');
            else if (chess.isStalemate() || chess.isDraw() || chess.isThreefoldRepetition()) playSound('stalemate');
            else if (moveAttempt.flags.includes('p') || moveAttempt.flags.includes('cp')) playSound('promote');
            else if (moveAttempt.flags.includes('k') || moveAttempt.flags.includes('q')) playSound('castle');
            else if (chess.isCheck()) playSound('move-check');
            else if (moveAttempt.captured || moveAttempt.flags.includes('e')) playSound('capture');
            else playSound('move');
        }, 10);

        setIsAnalyzing(true);
        try {
            const res = await axios.post(`${API_BASE}/analyze-sandbox-move`, {
                fen_before: fenBefore, move: moveAttempt.san, prev_eval: prevEval
            }, { headers: { Authorization: `Bearer ${token}` } });

            setHistory(prev => [...prev, {
                num: history.length, m: moveAttempt.san, from, to, fen: newFen,
                analysisLabel: res.data.label, eval: res.data.eval / 100,
                rawEval: res.data.eval, bestMove: res.data.best_move, t: 0, wTime: 0, bTime: 0
            }]);
            if (res.data.opening) setOpening(res.data.opening);
        } catch (err) {
            setHistory(prev => [...prev, { m: moveAttempt.san, from, to, fen: newFen, num: prev.length, t:0, wTime:0, bTime:0 }]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- 4. EGÉR KEZELÉS ---
    const handleMouseDown = async (e, row, col) => {
        // Ha promotion popup nyitva van, vagy nem -1 az index, blokkolunk
        if (viewIndex !== -1 || pendingPromotion) return;

        const square = getSquareName(row, col);
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({ x: e.clientX - (rect.left + rect.width / 2), y: e.clientY - (rect.top + rect.height / 2) });
        setMousePos({ x: e.clientX, y: e.clientY });

        const chess = new Chess(fen);
        const piece = chess.get(square);

        if (selectedSquare && selectedSquare !== square && validMoves.includes(square)) {
            await executeAnalysisMove(selectedSquare, square);
            return;
        }
        if (piece && piece.color === chess.turn()) {
            setIsDragging(true);
            setHoverSquare(square);
            setSelectedSquare(square);
            setValidMoves(chess.moves({ square, verbose: true }).map(m => m.to));
        } else {
            setSelectedSquare(null);
            setValidMoves([]);
            setHoverSquare(null);
        }
    };

    const handleMouseUp = async (row, col) => {
        if (!isDragging) return;
        const target = getSquareName(row, col);
        setIsDragging(false);
        if (target === selectedSquare) { setHoverSquare(null); return; }

        if (validMoves.includes(target)) {
            await executeAnalysisMove(selectedSquare, target);
        } else {
            playSound('illegal');
            setSelectedSquare(null);
            setValidMoves([]);
            setHoverSquare(null);
        }
    };

    // --- 5. AUTOMATIKUS MOUSEMOVE FIGYELÉS ---
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setMousePos({ x: e.clientX, y: e.clientY });
                const board = document.getElementById('chess-board')?.getBoundingClientRect();
                if (board) {
                    let col = Math.floor((e.clientX - board.left) / (board.width / 8));
                    let row = Math.floor((e.clientY - board.top) / (board.height / 8));
                    if (isFlipped) { col = 7 - col; row = 7 - row; }
                    if (col >= 0 && col < 8 && row >= 0 && row < 8) setHoverSquare(getSquareName(row, col));
                    else setHoverSquare(null);
                }
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isDragging, getSquareName, setMousePos, setHoverSquare, isFlipped]);

    // Billentyűzet nyilak
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (pendingPromotion) return; // Blokkolunk, ha nyitva a popup

            const currentIdx = viewIndex === -1 ? history.length - 1 : viewIndex;
            if (e.key === 'ArrowLeft' && currentIdx >= 0) goToMove(currentIdx - 1);
            else if (e.key === 'ArrowRight' && viewIndex !== -1) goToMove(currentIdx + 1);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewIndex, history, goToMove, pendingPromotion]);

    return (
        <div className="flex justify-center items-center h-screen w-full bg-[#1e1e1e] gap-6 p-4 overflow-hidden select-none relative">
            {/* Eval Bar */}
            <div className="w-8 h-170 bg-[#2b2b2b] flex flex-col justify-end border border-white/5 shrink-0 overflow-hidden rounded-sm">
                <div className="bg-white w-full transition-all duration-500" style={{ height: '50%' }}></div>
            </div>

            <div className="flex flex-col justify-center items-center h-full shrink-0">
                <div className="w-170 flex items-center justify-between px-1 h-12 mb-1 shrink-0 text-[#bab9b8] font-bold text-sm uppercase tracking-wider">
                    Analysis Sandbox
                </div>

                <div className="relative shrink-0">
                    <div id="chess-board" className="w-170 h-170 bg-[#2b2b2b] relative">
                        <ChessBoardGrid 
                            gameLogic={{ ...gameLogic, isFlipped }} 
                            onMouseDown={handleMouseDown} 
                            onMouseUp={handleMouseUp} 
                        />
                        
                        {/* --- JAVÍTOTT PROMOTION POPUP (GameBoard stílus és elhelyezés) --- */}
                        <AnimatePresence>
                            {pendingPromotion && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute z-5000 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
                                    style={{
                                        // Vízszintes elhelyezés (a célmező oszlopa alapján)
                                        left: `${(isFlipped ? (104 - pendingPromotion.to.charCodeAt(0)) : (pendingPromotion.to.charCodeAt(0) - 97)) * 12.5}%`,
                                        // Függőleges elhelyezés (melyik sorba érkezett)
                                        top: ((!isFlipped && pendingPromotion.to.endsWith('8')) || (isFlipped && pendingPromotion.to.endsWith('1'))) ? '0' : 'auto',
                                        bottom: ((!isFlipped && pendingPromotion.to.endsWith('1')) || (isFlipped && pendingPromotion.to.endsWith('8'))) ? '0' : 'auto',
                                        width: '12.5%'
                                    }}>
                                    {['q', 'n', 'r', 'b'].map((type) => (
                                        <button key={type} onClick={() => executeAnalysisMove(pendingPromotion.from, pendingPromotion.to, type)} className="w-full aspect-square hover:bg-gray-100 p-1 border-b border-gray-100">
                                            {/* A bábu színe a fen-ben lévő chess.turn()-től függ, de analízisnél egyszerűbb a célmező alapján eldönteni */}
                                            <img src={`/assets/pieces/${pendingPromotion.to.endsWith('8') ? 'white' : 'black'}_${type === 'q' ? 'queen' : type === 'n' ? 'knight' : type === 'r' ? 'rook' : 'bishop'}.png`} alt={type} />
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="w-170 flex items-center h-12 mt-1 shrink-0 text-[#bab9b8] font-bold text-[14px]">
                    <i className="fas fa-user mr-3"></i> Free Analysis
                </div>
            </div>

            <div className="w-112.5 shrink-0 h-170 flex flex-col">
                <MoveListPanel
                    {...gameLogic}
                    status="analysis"
                    isPopupClosed={true}
                    isPopupVisible={false}
                    isFlipped={isFlipped}
                    onFlipBoard={() => setIsFlipped(!isFlipped)}
                    goToMove={goToMove}
                    isAnalyzing={isAnalyzing}
                />
            </div>
        </div>
    );
};

export default AnalyzeBoard;