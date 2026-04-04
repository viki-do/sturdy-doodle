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

    // --- HANG LEJÁTSZÓ SEGÉDFÜGGVÉNY ---
    const playSound = useCallback((soundName) => {
        const audio = new Audio(`/assets/sounds/${soundName}.mp3`);
        audio.play().catch(err => console.log(`Audio error: ${soundName}`));
    }, []);

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
            playSound('game-start'); // ÚJ JÁTÉK HANG
        } catch (err) { 
            console.error("Hiba az új játék indításakor:", err);
        }
    }, [userId, token, API_BASE, playSound]);

    const executeMove = async (from, to) => {
        const chess = new Chess(fen);
        const moveAttempt = chess.move({ from, to, promotion: 'q' });

        if (!moveAttempt) return;

        // 1. Optimista frissítés az animációhoz
        setFen(chess.fen());
        setLastMove({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);
        setIsDragging(false);

        // 2. SZINKRONIZÁLT HANG (225ms késleltetés a 0.2s animációhoz)
        setTimeout(() => {
            if (chess.isCheckmate()) playSound('checkmate');
            else if (chess.isStalemate() || chess.isDraw()) playSound('stalemate');
            else if (chess.isCheck()) playSound('move-check');
            else if (moveAttempt.flags.includes('k') || moveAttempt.flags.includes('q')) playSound('castle');
            else if (moveAttempt.flags.includes('p')) playSound('promote');
            else if (moveAttempt.captured) playSound('capture');
            else playSound('move');
        }, 225);

        try {
            const res = await axios.post(`${API_BASE}/move`,
                { game_id: gameId, move: `${from}${to}` },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // 3. Bot válasza (kicsit később, hogy ne vágjanak egymás szavába)
            setTimeout(() => {
                const bot = res.data.bot_move;
                if (bot && bot.from) {
                    setFen(res.data.new_fen);
                    setLastMove({ from: bot.from, to: bot.to });

                    // Bot hangja is szinkronizálva az ő 0.2s-os animációjához
                    setTimeout(() => {
                        if (res.data.is_checkmate) playSound('game-end');
                        else if (bot.is_check) playSound('move-check');
                        else if (bot.is_capture) playSound('capture');
                        else if (bot.from === 'e8' && (bot.to === 'g8' || bot.to === 'c8')) playSound('castle');
                        else playSound('move');
                    }, 225);
                }
                fetchGameState(gameId);
            }, 600);

        } catch (err) {
            fetchGameState(gameId);
        }
    };

    const handleResign = async () => {
    if (!window.confirm("Biztosan feladod a játszmát?")) return;
    
    const currentId = gameId;
    playSound('game-end'); 
    setStatus("resigned"); // Csak a státuszt váltjuk át
    setSelectedSquare(null);
    setValidMoves([]);

    try {
        // Elküldjük a szervernek a feladást
        await axios.post(`${API_BASE}/resign-game`, 
            { game_id: currentId }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Frissítjük a játékállapotot, hogy a history és a FEN 
        // tartalmazza a lezárt állapotot, de NE tűnjön el semmi
        await fetchGameState(currentId);

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
                            const m = latestMove.m;

                            setHistory(newHistory);

                            // CSAK BOT LÉPÉSNÉL (Páros history hossz)
                            if (newHistory.length % 2 === 0 && latestMove.fen !== fen) {
                                setFen(latestMove.fen);
                                setLastMove({ from: latestMove.from, to: latestMove.to });

                                // Polling alatti hang szinkron
                                setTimeout(() => {
                                    if (m.includes('#')) playSound('checkmate');
                                    else if (m.includes('+')) playSound('move-check');
                                    else if (m.includes('O-O')) playSound('castle');
                                    else if (m.includes('x')) playSound('capture');
                                    else playSound('move');
                                }, 225);
                            }
                        }
                    }
                } catch (err) { console.error("Polling error:", err); }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [gameId, fen, status, token, API_BASE, playSound, history.length]);

    return {
        gameId, setGameId, fen, setFen, selectedSquare, setSelectedSquare, validMoves, setValidMoves, 
        lastMove, setLastMove, history, setHistory, status, setStatus, isDragging, setIsDragging, 
        viewIndex, setViewIndex, isAlert, setIsAlert, mousePos, setMousePos, dragOffset, setDragOffset, 
        hoverSquare, setHoverSquare, getSquareName, fetchGameState, startNewGame, handleResign, 
        executeMove, playSound, token, API_BASE
    };
};