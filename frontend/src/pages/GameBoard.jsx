import React, { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ChessBoardGrid from '../components/ChessBoardGrid';
import MoveListPanel from '../components/MoveListPanel';
import PlaySelectionPanel from '../components/PlaySelectionPanel';
import { useChessGame } from '../hooks/useChessGame';
import axios from 'axios';
import { Chess } from 'chess.js';

const GameBoard = () => {
    const gameLogic = useChessGame();
    
    const { 
        status, history, viewIndex, startNewGame, handleResign, fetchGameState,
        token, gameId, setGameId, setFen, setLastMove, setViewIndex, 
        getSquareName, fen, setSelectedSquare, setIsDragging, setHoverSquare, 
        setValidMoves, API_BASE, setIsAlert, selectedSquare, validMoves, isDragging,
        setDragOffset, setMousePos, playSound
    } = gameLogic;

    const isGameActive = !!gameId && gameId !== "null";

    const playNavigationSound = useCallback((notation) => {
        if (!notation || notation === "start") return;
        setTimeout(() => {
            if (notation.includes('#')) playSound('checkmate');
            else if (notation.includes('+')) playSound('move-check');
            else if (notation.includes('O-O')) playSound('castle');
            else if (notation.includes('x')) playSound('capture');
            else playSound('move');
        }, 50);
    }, [playSound]);

    const goToMove = useCallback((index, isWhiteOnly = false) => {
        setSelectedSquare(null);
        if (index === -1 || index >= history.length - 1) {
            setViewIndex(-1);
            const latest = history[history.length - 1];
            if (latest) {
                setFen(latest.fen);
                setLastMove({ from: latest.from, to: latest.to });
                playNavigationSound(latest.m);
            }
            return;
        }
        const move = history[index];
        if (!move) return;
        
        playNavigationSound(move.m);

        if (isWhiteOnly) {
            const tempChess = new Chess(move.fen);
            const undone = tempChess.undo();
            if (undone) {
                setFen(tempChess.fen());
                setLastMove({ from: undone.from, to: undone.to });
                setViewIndex(index + "_white");
            }
        } else {
            setFen(move.fen);
            setLastMove({ from: move.from, to: move.to });
            setViewIndex(index);
        }
    }, [history, setFen, setLastMove, setViewIndex, setSelectedSquare, playNavigationSound]);

    const handleMouseDown = async (e, row, col) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - (rect.left + rect.width / 2),
            y: e.clientY - (rect.top + rect.height / 2)
        });
        setMousePos({ x: e.clientX, y: e.clientY });

        if (!gameId || gameId === "null" || viewIndex !== -1) return;
        const square = getSquareName(row, col);

        const pieces = fen.split(' ')[0].split('/').map(r => {
            const line = [];
            for (let char of r) {
                if (isNaN(char)) line.push(char);
                else for (let i = 0; i < parseInt(char); i++) line.push(null);
            }
            return line;
        });
        const piece = pieces[row] ? pieces[row][col] : null;

        if (selectedSquare && selectedSquare !== square && validMoves.includes(square)) {
            await gameLogic.executeMove(selectedSquare, square);
            return;
        }

        if (piece && status === "ongoing" && piece === piece.toUpperCase()) {
            setIsDragging(true);
            setHoverSquare(square);

            if (selectedSquare === square) {
                return; 
            }

            setSelectedSquare(square);

            try {
                const res = await axios.post(`${API_BASE}/get-valid-moves`, 
                    { game_id: gameId, square: square }, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setValidMoves(res.data.valid_moves || []);
            } catch (err) {
                setValidMoves([]);
            }
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

        if (target === selectedSquare) {
            setHoverSquare(null);
            return;
        }

        if (validMoves.includes(target)) {
            await gameLogic.executeMove(selectedSquare, target);
        } else {
            playSound('illegal');
            setIsAlert(true);
            setTimeout(() => setIsAlert(false), 400);
            setSelectedSquare(null);
            setValidMoves([]);
            setHoverSquare(null);
        }
    };

    useEffect(() => {
        const initialize = async () => {
            if (!token || status === "resigned") return;
            try {
                const res = await axios.get(`${API_BASE}/get-active-game`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.data.game_id && res.data.game_id !== "null") {
                    setGameId(res.data.game_id); 
                    await fetchGameState(res.data.game_id);
                } else {
                    setGameId(null);
                }
            } catch (e) { setGameId(null); }
        };
        initialize();
    }, [token]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setMousePos({ x: e.clientX, y: e.clientY });
                const board = document.getElementById('chess-board')?.getBoundingClientRect();
                if (board) {
                    const col = Math.floor((e.clientX - board.left) / (board.width / 8));
                    const row = Math.floor((e.clientY - board.top) / (board.height / 8));
                    if (col >= 0 && col < 8 && row >= 0 && row < 8) setHoverSquare(getSquareName(row, col));
                    else setHoverSquare(null);
                }
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isDragging, getSquareName, setMousePos, setHoverSquare]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const latestIndex = history.length - 1;
            if (e.key === 'ArrowLeft') {
                const currentIdx = viewIndex === -1 ? latestIndex : parseInt(viewIndex);
                if (currentIdx >= 0) goToMove(currentIdx - 1);
            } else if (e.key === 'ArrowRight') {
                if (viewIndex === -1) return;
                const currentIdx = parseInt(viewIndex);
                if (currentIdx >= latestIndex - 1) goToMove(-1);
                else goToMove(currentIdx + 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewIndex, history, goToMove]);

    const renderNotation = (text) => {
        if (!text || text === "start") return "";
        const icons = { 'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘' };
        return icons[text[0]] ? <span className="flex items-center"><span className="text-[1.3em] mr-0.5 leading-none">{icons[text[0]]}</span>{text.substring(1)}</span> : text;
    };


return (
    <div className="flex justify-center items-center h-screen w-full bg-[#1e1e1e] gap-6 p-4 overflow-hidden select-none">
        
        {/* 1. EVALUATION BAR - Fix magasság a 704px-es táblához */}
        <div className="w-8 h-170 bg-[#2b2b2b] flex flex-col justify-end overflow-hidden self-center border border-chess-bg shrink-0">
            <div className="bg-white w-full h-[50%] transition-all duration-500 shadow-[0_0_10px_rgba(255,255,255,0.1)]"></div>
        </div>

        {/* 2. TÁBLA SZEKCIÓ */}
        <div className="flex flex-col justify-center items-center h-full shrink-0">
            
            {/* OPPONENT INFO (BLACK) - Szélesség a 704px-es táblához igazítva */}
            <div className="w-170 flex items-center gap-3 px-1 h-12 mb-1 shrink-0">
                <div className="w-9 h-9 bg-[#2b2a27] rounded-md flex items-center justify-center border border-chess-bg">
                    <i className="fas fa-user text-[#808080] text-xl"></i>
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-[#bab9b8] font-bold text-[14px]">Opponent</span>
                    <div className="h-4"></div>
                </div>
            </div>

            {/* A TÁBLA MAGA - Fix 704px (88px * 8) */}
            <div className="relative shrink-0 p-0 m-0">
                <div 
                    id="chess-board" 
                    className="w-170 h-170 bg-[#2b2b2b]"
                    style={{ 
                        pointerEvents: isGameActive ? 'auto' : 'none',
                        display: 'block'
                    }}
                >
                    <ChessBoardGrid 
                        gameLogic={gameLogic} 
                        onMouseDown={handleMouseDown} 
                        onMouseUp={handleMouseUp} 
                    />
                </div>
                
                <AnimatePresence>
                    {status !== "ongoing" && isGameActive && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center z-1000"
                        >
                            <div className="bg-[#262421] p-10 rounded-3xl text-center border border-chess-bg shadow-2xl">
                                <h1 className="text-4xl font-bold text-white mb-4 uppercase tracking-widest">
                                    {status === "checkmate" ? "Checkmate" : "Game Over"}
                                </h1>
                                <button 
                                    onClick={startNewGame} 
                                    className="px-8 py-3 bg-[#81b64c] text-white rounded-xl text-xl font-bold hover:bg-[#a3d16a] transition-colors"
                                >
                                    New Game
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* YOU INFO (WHITE) - Szélesség a 704px-es táblához igazítva */}
            <div className="w-170 flex items-center gap-3 px-1 h-12 mt-1 shrink-0">
                <div className="w-9 h-9 bg-[#2b2a27] rounded-md flex items-center justify-center border border-chess-bg">
                    <i className="fas fa-user text-[#808080] text-xl"></i>
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-[#bab9b8] font-bold text-[14px]">You</span>
                    <div className="h-4"></div>
                </div>
            </div>
        </div>

      
        {/* 3. JOBB OLDALI PANEL */}
        <div className="w-112.5 shrink-0 h-170 self-center flex flex-col">
            {/* LOGIKA: Akkor mutatjuk a MoveListPanel-t, ha:
            1. Van aktív játék (isGameActive)
            VAGY
            2. A státusz jelzi, hogy vége (resigned / checkmate / draw)
            VAGY
            3. Van már története a meccsnek (history.length > 1)
            */}
            { (isGameActive || status === "resigned" || status === "checkmate" || history.length > 1) ? (
                <MoveListPanel 
                    history={history}
                    viewIndex={viewIndex}
                    status={status}
                    goToMove={goToMove}
                    handleResign={handleResign}
                    renderNotation={renderNotation}
                    startNewGame={startNewGame}
                />
            ) : (
                <PlaySelectionPanel onStartGame={startNewGame} />
            )}
        </div>
    </div>
);
};

export default GameBoard;