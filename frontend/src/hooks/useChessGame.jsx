import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Chess } from 'chess.js';

export const useChessGame = () => {
    const API_BASE = 'http://localhost:8000';
    const [gameId, setGameId] = useState(localStorage.getItem('chessGameId') || null);
    const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const [lastMove, setLastMove] = useState({ from: null, to: null });
    const [history, setHistory] = useState([]);
    const [status, setStatus] = useState("ongoing");
    const [isDragging, setIsDragging] = useState(false);
    const [viewIndex, setViewIndex] = useState(-1);
    const [isAlert, setIsAlert] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [hoverSquare, setHoverSquare] = useState(null);
    const [pendingPromotion, setPendingPromotion] = useState(null);
    const userId = localStorage.getItem('chessUserId');
    const token = localStorage.getItem('chessToken');
    const [reason, setReason] = useState(""); 

    const playSound = useCallback((soundName) => {
        const audio = new Audio(`/assets/sounds/${soundName}.mp3`);
        audio.play().catch(err => console.log(`Audio error: ${soundName}`));
    }, []);

    const getSquareName = useCallback((row, col) => {
        const filesArr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        return `${filesArr[col]}${8 - row}`;
    }, []);

    const renderNotation = useCallback((text) => {
        if (!text || text === "start") return "";
        const icons = { 'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘' };
        return icons[text[0]] ? (
            <span className="flex items-center">
                <span className="text-[1.3em] mr-0.5 leading-none">{icons[text[0]]}</span>
                {text.substring(1)}
            </span>
        ) : text;
    }, []);

    const fetchGameState = useCallback(async (id) => {
        if (!id || id === "null" || !token) return;
        try {
            const res = await axios.get(`${API_BASE}/game/${id}/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.history) {
                setGameId(id);
                localStorage.setItem('chessGameId', id);
                setHistory(res.data.history);
                if (res.data.status) setStatus(res.data.status);
                setReason(res.data.reason || "");
                
                if (res.data.status === "ongoing" && res.data.history.length <= 1) {
                    setTimeout(() => playSound('game-start'), 220);
                }
                
                setViewIndex(-1);
                if (res.data.history.length > 0) {
                    const latest = res.data.history[res.data.history.length - 1];
                    setFen(latest.fen);
                    if (latest.from && latest.to) {
                        setLastMove({ from: latest.from, to: latest.to });
                    }
                }
            }
        } catch (err) { console.error("Hiba:", err); }
    }, [token, API_BASE, playSound]);

    // --- EXECUTE MOVE - Eredeti hanglogika visszaállítva ---
    const executeMove = async (from, to, promotion = null) => {
        const chess = new Chess(fen);
        const piece = chess.get(from);
        
        const isPromo = piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1'));
        if (isPromo && !promotion) {
            setPendingPromotion({ from, to });
            setIsDragging(false);
            return;
        }

        const moveAttempt = chess.move({ from, to, promotion: promotion || 'q' });
        if (!moveAttempt) return;

        setPendingPromotion(null);
        setFen(chess.fen());
        setLastMove({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);
        setIsDragging(false);

        // ERDETI HANG-IDŐZÍTÉS ÉS FELTÉTELEK
        setTimeout(() => {
            if (chess.isCheckmate()) playSound('checkmate');
            else if (chess.isStalemate() || chess.isDraw()) playSound('stalemate');
            else if (chess.isCheck()) playSound('move-check');
            else if (moveAttempt.flags.includes('k') || moveAttempt.flags.includes('q')) playSound('castle');
            else if (moveAttempt.flags.includes('p')) playSound('promote');
            else if (moveAttempt.captured || moveAttempt.flags.includes('e')) playSound('capture');
            else playSound('move');
        }, 220); // Visszaállítva a te eredeti 220ms-odra

        try {
            const res = await axios.post(`${API_BASE}/move`,
                { game_id: gameId, move: `${from}${to}${promotion || ""}` },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setTimeout(() => {
                const bot = res.data.bot_move;
                if (bot && bot.from) {
                    setFen(res.data.new_fen);
                    setLastMove({ from: bot.from, to: bot.to });
                    setTimeout(() => {
                        if (res.data.is_checkmate) playSound('game-end');
                        else if (bot.is_check) playSound('move-check');
                        else if (bot.is_capture) playSound('capture');
                        else playSound('move');
                    }, 220); // Visszaállítva a te eredeti 220ms-odra
                }
                fetchGameState(gameId);
            }, 600);
        } catch (err) { fetchGameState(gameId); }
    };

    const handleMouseDown = async (e, row, col) => {
        if (status !== "ongoing" || viewIndex !== -1 || !gameId || gameId === "null") return;
        const square = getSquareName(row, col);
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({ x: e.clientX - (rect.left + rect.width / 2), y: e.clientY - (rect.top + rect.height / 2) });
        setMousePos({ x: e.clientX, y: e.clientY });

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
            await executeMove(selectedSquare, square);
            return;
        }

        if (piece && piece === piece.toUpperCase()) {
            setIsDragging(true);
            setHoverSquare(square);
            if (selectedSquare !== square) {
                setSelectedSquare(square);
                try {
                    const res = await axios.post(`${API_BASE}/get-valid-moves`,
                        { game_id: gameId, square: square },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setValidMoves(res.data.valid_moves || []);
                } catch (err) { setValidMoves([]); }
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
        if (target === selectedSquare) { setHoverSquare(null); return; }
        if (validMoves.includes(target)) { await executeMove(selectedSquare, target); } 
        else {
            playSound('illegal');
            setIsAlert(true);
            setTimeout(() => setIsAlert(false), 400);
            setSelectedSquare(null);
            setValidMoves([]);
            setHoverSquare(null);
        }
    };

    const goToMove = useCallback((index) => {
        setSelectedSquare(null);
        if (index === -1 || index >= history.length - 1) {
            setViewIndex(-1);
            const latest = history[history.length - 1];
            if (latest) {
                setFen(latest.fen);
                setLastMove({ from: latest.from, to: latest.to });
            }
            return;
        }
        const move = history[index];
        if (move) {
            setFen(move.fen);
            setLastMove({ from: move.from, to: move.to });
            setViewIndex(index);
        }
    }, [history]);

    const startNewGame = useCallback(async (difficulty = 400) => {
        try {
            const res = await axios.post(`${API_BASE}/create-game`,
                { user_id: userId, difficulty, time_category: "rapid", base_time: 600 },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const newId = res.data.game_id;
            localStorage.setItem('chessGameId', newId);
            setGameId(newId);
            setFen(res.data.fen);
            setLastMove({ from: null, to: null });
            setHistory([]);
            setViewIndex(-1);
            setStatus("ongoing");
            playSound('game-start');
        } catch (err) { console.error(err); }
    }, [userId, token, API_BASE, playSound]);

    const handleResign = async () => {
        if (!window.confirm("Biztosan feladod?")) return;
        const currentId = gameId;
        playSound('game-end'); 
        localStorage.removeItem('chessGameId');
        setStatus("resigned");
        setReason("Black wins by resignation");
        try {
            await axios.post(`${API_BASE}/resign-game`, { game_id: currentId }, { headers: { Authorization: `Bearer ${token}` } });
            await fetchGameState(currentId);
        } catch (err) { console.error(err); }
    };

    // Polling hangkezelés az eredeti szerint
    useEffect(() => {
        let interval;
        if (gameId && status === "ongoing") {
            interval = setInterval(async () => {
                try {
                    const res = await axios.get(`${API_BASE}/game/${gameId}/history`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data.history && res.data.history.length !== history.length) {
                        const newHistory = res.data.history;
                        const latestMove = newHistory[newHistory.length - 1];
                        const m = latestMove.m;

                        setHistory(newHistory);
                        if (res.data.status) setStatus(res.data.status);
                        
                        if (newHistory.length % 2 === 0 && latestMove.fen !== fen) {
                            setFen(latestMove.fen);
                            setLastMove({ from: latestMove.from, to: latestMove.to });

                            setTimeout(() => {
                                if (m.includes('#')) playSound('checkmate');
                                else if (m.includes('+')) playSound('move-check');
                                else if (m.includes('O-O')) playSound('castle');
                                else if (m.includes('x')) playSound('capture');
                                else playSound('move');
                            }, 220);
                        }
                    }
                } catch (e) {}
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [gameId, fen, status, token, API_BASE, playSound, history.length]);

    return {
        gameId, setGameId, fen, setFen, selectedSquare, setSelectedSquare, validMoves, setValidMoves,
        lastMove, setLastMove, history, setHistory, status, setStatus, isDragging, setIsDragging,
        viewIndex, setViewIndex, isAlert, setIsAlert, mousePos, setMousePos, dragOffset, setDragOffset,
        hoverSquare, setHoverSquare, getSquareName, fetchGameState, startNewGame, handleResign,
        executeMove, playSound, token, API_BASE, reason, setReason, pendingPromotion, setPendingPromotion,
        goToMove, handleMouseDown, handleMouseUp, renderNotation
    };
};