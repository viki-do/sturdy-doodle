import { useState, useCallback, useEffect } from 'react';
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

    const userId = localStorage.getItem('chessUserId');
    const token = localStorage.getItem('chessToken');

    const getSquareName = (row, col) => {
        const filesArr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        return `${filesArr[col]}${8 - row}`;
    };

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
                setStatus("ongoing"); 
                setViewIndex(-1); 
                if (res.data.history.length > 0) {
                    const latest = res.data.history[res.data.history.length - 1];
                    setFen(latest.fen);
                    if (latest.from && latest.to) setLastMove({ from: latest.from, to: latest.to });
                }
            }
        } catch (err) { console.error(err); }
    }, [token, API_BASE]);

    const startNewGame = useCallback(async () => {
        try {
            const res = await axios.post(`${API_BASE}/create-game`,
                { user_id: userId, time_category: "rapid", base_time: 600 },
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
        } catch (err) { 
            console.error("Hiba az új játék indításakor:", err);
        }
    }, [userId, token, API_BASE]);

    const executeMove = async (from, to) => {
    const chess = new Chess(fen);
    const moveAttempt = chess.move({ from, to, promotion: 'q' });

    if (!moveAttempt) return;

    // 1. Azonnali állapotfrissítés (ez indítja a 0.2s-os animációt)
    setFen(chess.fen());
    setLastMove({ from, to });
    
    // 2. UI tisztítás
    setSelectedSquare(null);
    setValidMoves([]);
    setIsDragging(false);

    try {
        const res = await axios.post(`${API_BASE}/move`,
            { game_id: gameId, move: `${from}${to}` },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // 3. Bot válasza (0.4s múlva, hogy ne zavarja a te csúszásodat)
        setTimeout(() => {
            if (res.data.bot_move && res.data.bot_move.from) {
                setFen(res.data.new_fen);
                setLastMove({ from: res.data.bot_move.from, to: res.data.bot_move.to });
            }
            fetchGameState(gameId);
        }, 400);

    } catch (err) {
        fetchGameState(gameId);
    }
};

    const handleResign = async () => {
        if (!window.confirm("Biztosan feladod a játszmát?")) return;
        
        const currentId = gameId;
        localStorage.removeItem('chessGameId');
        setGameId(null);
        setStatus("resigned");
        
        setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        setLastMove({ from: null, to: null });
        setHistory([]);
        setSelectedSquare(null);
        setValidMoves([]);
        
        try {
            await axios.post(`${API_BASE}/resign-game`, 
                { game_id: currentId }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (err) { 
            console.error("Hiba a feladás során:", err); 
        }
    };

    useEffect(() => {
        let interval;
        if (gameId && status === "ongoing") {
            interval = setInterval(async () => {
                try {
                    const res = await axios.get(`${API_BASE}/game/${gameId}/history`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (res.data.history && res.data.history.length > 0) {
                        if (res.data.history.length !== history.length) {
                            const newHistory = res.data.history;
                            const latestMove = newHistory[newHistory.length - 1];

                            setHistory(newHistory);

                            if (newHistory.length % 2 === 0) {
                                if (latestMove.fen !== fen) {
                                    setFen(latestMove.fen);
                                    setLastMove({ from: latestMove.from, to: latestMove.to });
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [gameId, fen, status, token, API_BASE, history.length, viewIndex]);

    return {
        gameId, setGameId, fen, setFen, selectedSquare, setSelectedSquare, validMoves, setValidMoves, 
        lastMove, setLastMove, history, setHistory, status, setStatus, isDragging, setIsDragging, 
        viewIndex, setViewIndex, isAlert, setIsAlert, mousePos, setMousePos, dragOffset, setDragOffset, 
        hoverSquare, setHoverSquare, getSquareName, fetchGameState, startNewGame, handleResign, 
        executeMove, token, API_BASE
    };
};