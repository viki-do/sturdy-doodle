import React, { useEffect, useCallback } from 'react';
import axios from 'axios';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import ChessBoardGrid from '../components/ChessBoardGrid';
import { useChessGame } from '../hooks/useChessGame';

const GameBoard = () => {
    const gameLogic = useChessGame();
    const { 
        gameId, fen, selectedSquare, validMoves, history, status, isDragging, viewIndex,
        fetchGameState, startNewGame, handleResign, executeMove, getSquareName,
        setSelectedSquare, setValidMoves, setIsDragging, setHoverSquare, setMousePos, setDragOffset, setIsAlert, setViewIndex, setFen, setLastMove, token, API_BASE
    } = gameLogic;

    // --- NAVIGATION ---
    const goToMove = useCallback((index) => {
        if (index >= -1 && index < history.length) {
            setViewIndex(index);
            const move = index === -1 ? history[history.length - 1] : history[index];
            if (move) {
                setFen(move.fen);
                setLastMove({ from: move.from || null, to: move.to || null });
            }
        }
    }, [history, setViewIndex, setFen, setLastMove]);

    // --- MOUSE HANDLERS ---
    const handleMouseDown = async (e, row, col) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({ x: e.clientX - (rect.left + rect.width / 2), y: e.clientY - (rect.top + rect.height / 2) });
        setMousePos({ x: e.clientX, y: e.clientY });

        if (!gameId || gameId === "null" || viewIndex !== -1) return;
        const square = getSquareName(row, col);

        if (selectedSquare) {
            if (validMoves.includes(square)) { await executeMove(selectedSquare, square); return; }
            const gameInstance = new Chess(fen);
            if (gameInstance.inCheck() && square !== selectedSquare) { setIsAlert(true); setTimeout(() => setIsAlert(false), 400); }
        }

        const pieces = fen.split(' ')[0].split('/').map(r => {
            const line = [];
            for (let char of r) { if (isNaN(char)) line.push(char); else for (let i = 0; i < parseInt(char); i++) line.push(null); }
            return line;
        });

        const piece = pieces[row] ? pieces[row][col] : null;
        if (piece && status === "ongoing" && piece === piece.toUpperCase()) {
            setSelectedSquare(square); setIsDragging(true); setHoverSquare(square);
            try {
                const res = await axios.post(`${API_BASE}/get-valid-moves`, { game_id: gameId, square: square }, { headers: { Authorization: `Bearer ${token}` } });
                setValidMoves(res.data.valid_moves || []);
            } catch (err) { console.error(err); setValidMoves([]); }
        } else { setSelectedSquare(null); setValidMoves([]); setHoverSquare(null); }
    };

    const handleMouseUp = async (row, col) => {
        if (!isDragging) return;
        const target = getSquareName(row, col);
        if (selectedSquare && target !== selectedSquare) {
            if (validMoves.includes(target)) await executeMove(selectedSquare, target);
            else { 
                const gameInstance = new Chess(fen);
                if (gameInstance.inCheck()) { setIsAlert(true); setTimeout(() => setIsAlert(false), 400); }
                setIsDragging(false); 
            }
        } else setIsDragging(false);
    };

    // --- EFFECTS ---
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setMousePos({ x: e.clientX, y: e.clientY });
                const board = document.getElementById('chess-board').getBoundingClientRect();
                const col = Math.floor((e.clientX - board.left) / (board.width / 8));
                const row = Math.floor((e.clientY - board.top) / (board.height / 8));
                if (col >= 0 && col < 8 && row >= 0 && row < 8) setHoverSquare(getSquareName(row, col));
                else setHoverSquare(null);
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isDragging, getSquareName, setMousePos, setHoverSquare]);

    useEffect(() => {
        const initialize = async () => {
            if (!token || status === "resigned") return;
            const res = await axios.get(`${API_BASE}/get-active-game`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.game_id && res.data.game_id !== "null") { fetchGameState(res.data.game_id); }
            else if (!localStorage.getItem('chessGameId')) startNewGame();
        };
        initialize();
    }, [token, status, fetchGameState, startNewGame, API_BASE]);

    const renderNotation = (text) => {
        if (!text || text === "start") return "";
        const icons = { 'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘' };
        return icons[text[0]] ? <span className="flex items-center"><span className="text-[1.3em] mr-0.5 leading-none">{icons[text[0]]}</span>{text.substring(1)}</span> : text;
    };

    return (
        <div className="bg-chess-bg min-h-screen text-white font-sans">
            <Navbar />
            <div className="flex justify-center p-10 gap-7.5">
                <div className="relative">
                    <ChessBoardGrid gameLogic={gameLogic} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} />
                    <AnimatePresence>
                        {status !== "ongoing" && (
                            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 p-10 rounded-xl z-100 text-center border border-[#454241]">
                                <h1 className="text-[36px] mb-2.5 font-bold">{status === "checkmate" ? "Checkmate" : "Game Over"}</h1>
                                <button onClick={startNewGame} className="px-7.5 py-3 bg-[#81b64c] text-white rounded-sm text-[18px] font-bold hover:bg-[#a3d16a] transition-colors">New Game</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="w-95 h-170 bg-chess-panel rounded-sm flex flex-col">
                    <div className="p-3.75 bg-chess-panel-header border-b border-chess-bg text-[#bab9b8] text-[14px]">Move List</div>
                    <div className="flex-1 overflow-y-auto p-2.5 no-scrollbar">
                        {history.filter(m => m.m !== "start").map((move, index) => (
                            <div key={index} onClick={() => goToMove(index)} className={`grid grid-cols-[40px_1fr_1fr] p-[8px_0] border-b border-chess-bg items-center cursor-pointer ${index === viewIndex ? 'bg-white/10' : (index % 2 === 0 ? 'bg-white/3' : 'bg-transparent')}`}>
                                <div className="text-[#666] text-center">{index + 1}.</div>
                                <div className="font-bold px-1">{renderNotation(move.m.split(' ')[0])}</div>
                                <div className="font-bold px-1">{renderNotation(move.m.split(' ')[1])}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-auto">
                        {status !== "ongoing" ? (
                            <div className="flex justify-center gap-2 p-3.75 bg-[#1b1a18]">
                                <NavButton onClick={() => goToMove(0)} icon="fa-step-backward" />
                                <NavButton onClick={() => goToMove(viewIndex === -1 ? history.length - 2 : viewIndex - 1)} icon="fa-chevron-left" />
                                <NavButton onClick={() => goToMove(-1)} icon="fa-play" />
                                <NavButton onClick={() => goToMove(viewIndex === -1 ? -1 : viewIndex + 1)} icon="fa-chevron-right" />
                                <NavButton onClick={() => goToMove(-1)} icon="fa-step-forward" />
                            </div>
                        ) : (
                            <div className="p-3.75 text-center bg-chess-panel-header">
                                <button onClick={handleResign} className="px-5 py-2.5 bg-[#454241] text-[#bab9b8] rounded-sm hover:bg-[#555] transition-colors">Resign</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NavButton = ({ onClick, icon }) => (
    <button onClick={onClick} className="w-15 h-11.25 bg-[#32312f] rounded-lg text-[#bab9b8] text-[18px] flex justify-center items-center hover:bg-[#403f3d] transition-colors">
        <i className={`fas ${icon}`}></i>
    </button>
);

export default GameBoard;