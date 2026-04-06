import React, { useState, useCallback, useEffect, useRef } from 'react';
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

    // HANG SZINKRONIZÁCIÓHOZ SZÜKSÉGES REF ÉS STATE-EK
    const lastPlayedMoveNum = useRef(0);
    const [userChoiceColor, setUserChoiceColor] = useState('white');
    const [difficultyChoice, setDifficultyChoice] = useState(400);

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
                const serverHistory = res.data.history;
                setHistory(serverHistory);
                
                // SZINKRON: Beállítjuk a számlálót, hogy ne játssza le a múltbéli lépéseket
                const moveCount = serverHistory.filter(m => m.m !== "start").length;
                lastPlayedMoveNum.current = moveCount;

                if (res.data.status) setStatus(res.data.status);
                setReason(res.data.reason || "");
                
                setViewIndex(-1);
                if (serverHistory.length > 0) {
                    const latest = serverHistory[serverHistory.length - 1];
                    setFen(latest.fen);
                    if (latest.from && latest.to) {
                        setLastMove({ from: latest.from, to: latest.to });
                    }
                }
            }
        } catch (err) { console.error("Hiba:", err); }
    }, [token, API_BASE]);

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

        // --- HANG SZINKRON: Növeljük a számlálót, MIELŐTT a polling beérne ---
        lastPlayedMoveNum.current += 1;

        setTimeout(() => {
            if (chess.isCheckmate()) playSound('checkmate');
            else if (chess.isStalemate() || chess.isDraw()) playSound('stalemate');
            else if (chess.isCheck()) playSound('move-check');
            else if (moveAttempt.flags.includes('k') || moveAttempt.flags.includes('q')) playSound('castle');
            else if (moveAttempt.flags.includes('p')) playSound('promote');
            else if (moveAttempt.captured || moveAttempt.flags.includes('e')) playSound('capture');
            else playSound('move');
        }, 220);

        try {
            const res = await axios.post(`${API_BASE}/move`,
                { game_id: gameId, move: `${from}${to}${promotion || ""}` },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setTimeout(() => {
                const bot = res.data.bot_move;
                if (bot && bot.from) {
                    // --- HANG SZINKRON: A bot lépését is regisztráljuk ---
                    lastPlayedMoveNum.current += 1;

                    setFen(res.data.new_fen);
                    setLastMove({ from: bot.from, to: bot.to });
                    setTimeout(() => {
                        if (res.data.is_checkmate) playSound('game-end');
                        else if (bot.is_check) playSound('move-check');
                        else if (bot.is_capture) playSound('capture');
                        else playSound('move');
                    }, 220);
                }
                fetchGameState(gameId);
            }, 600);
        } catch (err) { fetchGameState(gameId); }
    };

    // POLLING: Csak akkor játszik hangot, ha olyan lépés jön, amit még nem "láttunk"
    useEffect(() => {
        let interval;
        if (gameId && status === "ongoing") {
            interval = setInterval(async () => {
                try {
                    const res = await axios.get(`${API_BASE}/game/${gameId}/history`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data.history) {
                        const serverHistory = res.data.history;
                        const serverMoveCount = serverHistory.filter(m => m.m !== "start").length;

                        // CSAK AKKOR CSELEKSZÜNK, HA ÚJ LÉPÉS VAN A SZERVEREN
                        if (serverMoveCount > lastPlayedMoveNum.current) {
                            const latestMove = serverHistory[serverHistory.length - 1];
                            setHistory(serverHistory);
                            if (res.data.status) setStatus(res.data.status);

                            if (viewIndex === -1 && latestMove.fen !== fen) {
                                setFen(latestMove.fen);
                                setLastMove({ from: latestMove.from, to: latestMove.to });

                                // Polling hang
                                const m = latestMove.m;
                                setTimeout(() => {
                                    if (m.includes('#')) playSound('checkmate');
                                    else if (m.includes('+')) playSound('move-check');
                                    else if (m.includes('x')) playSound('capture');
                                    else playSound('move');
                                }, 220);
                            }
                            // Frissítjük a számlálót, hogy ne szólaljon meg újra
                            lastPlayedMoveNum.current = serverMoveCount;
                        }
                    }
                } catch (e) {}
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [gameId, fen, status, token, API_BASE, playSound, viewIndex]);

    const resetGame = useCallback(() => {
        setGameId(null);
        localStorage.removeItem('chessGameId');
        setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        setLastMove({ from: null, to: null });
        setHistory([]);
        setStatus("ongoing");
        setReason("");
        setViewIndex(-1);
        setSelectedSquare(null);
        setValidMoves([]);
        setPendingPromotion(null);
        lastPlayedMoveNum.current = 0; // NULLÁZÁS!
    }, []);

    const startNewGame = useCallback(async (difficulty = 400, color = 'white') => {
        setUserChoiceColor(color);
        setDifficultyChoice(difficulty);
        try {
            let finalColor = color;
            if (color === 'random') {
                finalColor = Math.random() < 0.5 ? 'white' : 'black';
            }

            const res = await axios.post(`${API_BASE}/create-game`,
                { user_id: userId, difficulty, color: finalColor, time_category: "rapid", base_time: 600 },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const newId = res.data.game_id;
            localStorage.setItem('chessGameId', newId);
            
            // AZONNALI RESET
            setHistory([]);
            setReason("");
            setViewIndex(-1);
            setGameId(newId);
            setStatus("ongoing");

            // HA FEKETE: A bot már lépett, tehát 1-ről indulunk
            lastPlayedMoveNum.current = (finalColor === 'black' ? 1 : 0);
            setFen(res.data.fen);

            await fetchGameState(newId); 
            playSound('game-start');
            return finalColor;
        } catch (err) { return 'white'; }
    }, [userId, token, API_BASE, playSound, fetchGameState]);

    const handleMouseDown = async (e, row, col) => {
    if (status !== "ongoing" || viewIndex !== -1 || !gameId || gameId === "null") return;
    const square = getSquareName(row, col);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - (rect.left + rect.width / 2), y: e.clientY - (rect.top + rect.height / 2) });
    setMousePos({ x: e.clientX, y: e.clientY });

    const chess = new Chess(fen);
    const piece = chess.get(square);

    if (selectedSquare && selectedSquare !== square && validMoves.includes(square)) {
        await executeMove(selectedSquare, square);
        return;
    }

    // --- JAVÍTÁS: A mi színünk meghatározása isFlipped alapján ---
    const myColor = isFlipped ? 'b' : 'w';

    // Csak a saját színű bábunkat engedjük megfogni
    if (piece && piece.color === myColor) {
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

const handleResign = async () => {
    if (!window.confirm("Biztosan feladod?")) return;
    if (!gameId || !token) return;

    try {
        const res = await axios.post(`${API_BASE}/resign-game`, 
            { game_id: gameId }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status === "resigned") {
            // A Backend (game.py) már kiszámolja ki nyert, és visszaküldi a 'reason'-t
            // pl: "Black wins by resignation"
            setReason(res.data.reason || "Game resigned"); 
            
            setStatus("resigned"); 
            playSound('game-end');
            localStorage.removeItem('chessGameId');
            
            // Frissítsük a history-t, hogy a MoveList is lássa a végét
            fetchGameState(gameId);
        }
    } catch (err) { console.error("Resign error:", err); }
};

const offerDraw = async () => {
    if (!window.confirm("Döntetlent ajánlasz?")) return;
    if (!gameId || !token) return;

    try {
        const res = await axios.post(`${API_BASE}/offer-draw`, 
            { game_id: gameId }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status === "draw") {
            setReason(res.data.reason || "Draw by agreement");
            setStatus("draw");
            playSound('game-end');
            localStorage.removeItem('chessGameId');
        }
    } catch (err) {
        console.error("Draw offer error:", err);
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

    return {
        gameId, setGameId, fen, setFen, selectedSquare, setSelectedSquare, validMoves, setValidMoves,
        lastMove, setLastMove, history, setHistory, status, setStatus, isDragging, setIsDragging,
        viewIndex, setViewIndex, isAlert, setIsAlert, mousePos, setMousePos, dragOffset, setDragOffset,
        hoverSquare, setHoverSquare, getSquareName, fetchGameState, startNewGame, handleResign,
        executeMove, playSound, token, API_BASE, reason, setReason, pendingPromotion, setPendingPromotion,
        goToMove, handleMouseDown, handleMouseUp, renderNotation, offerDraw, userChoiceColor,difficultyChoice, resetGame
    };
};