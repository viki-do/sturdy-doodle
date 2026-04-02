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

    const playSound = useCallback((soundName) => {
        const audio = new Audio(`/assets/sounds/${soundName}.mp3`);
        audio.play().catch(err => {
            console.log(`Audio play blocked or not found: ${soundName}`);
        });
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
            playSound('game-start'); 
        } catch (err) { 
            console.error("Hiba az új játék indításakor:", err);
        }
    }, [userId, token, API_BASE, playSound]);

const executeMove = async (from, to) => {
    const chess = new Chess(fen);
    const moveAttempt = chess.move({ from, to, promotion: 'q' });

    if (!moveAttempt) {
        playSound('illegal');
        setIsAlert(true);
        setTimeout(() => setIsAlert(false), 400);
        return;
    }

    // --- JÁTÉKOS HANGJA ---
    // Azonnal lejátsszuk a hangot a játékos lépésére
    if (chess.isCheckmate()) {
        playSound('checkmate');
    } else if (chess.isCheck()) {
        playSound('move-check'); // <--- EZ AZ, AMIT HIÁNYOLTÁL
    } else if (moveAttempt.captured) {
        playSound('capture');
    } else if (moveAttempt.flags.includes('k') || moveAttempt.flags.includes('q')) {
        playSound('castle');
    } else {
        playSound('move');
    }

    try {
        const res = await axios.post(`${API_BASE}/move`,
            { game_id: gameId, move: `${from}${to}` },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // Várunk egy kicsit, amíg a bot "gondolkodik" és lép
        setTimeout(() => {
            setFen(res.data.new_fen);
            const bot = res.data.bot_move;
            
            if (bot && bot.from) {
                setLastMove({ from: bot.from, to: bot.to });
                
                // --- BOT HANGJA ---
                if (res.data.is_checkmate) {
                    playSound('game-end');
                } else if (bot.is_check) {
                    playSound('move-check'); // Ha a bot ad sakkot nekünk
                } else if (bot.is_capture) {
                    playSound('capture');
                } else {
                    playSound('move');
                }
            }
            fetchGameState(gameId);
        }, 500);

    } catch (err) {
        console.error(err);
        // Hiba esetén (pl. hálózati hiba) ne maradjon ott a bábu vizuálisan
        fetchGameState(gameId);
    }
    
    setSelectedSquare(null);
    setValidMoves([]);
    setIsDragging(false);
};

const handleResign = async () => {
        if (!window.confirm("Biztosan feladod a játszmát?")) return;
        
        const currentId = gameId;
        
        // 1. Hang lejátszása azonnal
        playSound('game-end'); 
        
        // 2. Állapotok frissítése
        localStorage.removeItem('chessGameId');
        setGameId(null);
        setStatus("resigned");
        
        try {
            // 3. Szerver értesítése
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
                    const latestMove = res.data.history[res.data.history.length - 1];
                    
                    // 1. A history-t MINDIG frissítjük a háttérben, hogy a MoveListPanel nőjön
                    if (res.data.history.length !== history.length) {
                        setHistory(res.data.history);

                        // 2. CSAK AKKOR váltunk FEN-t és játszunk hangot, ha az "ÉLŐ" nézetben vagyunk (-1)
                        if (viewIndex === -1 && latestMove.fen !== fen) {
                            setFen(latestMove.fen);
                            setLastMove({ from: latestMove.from, to: latestMove.to });

                            // Hang lejátszása az ellenfélnek
                            if (latestMove.m.includes('x')) playSound('capture');
                            else if (latestMove.m.includes('+')) playSound('move-check');
                            else playSound('move');
                        }
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
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