import React, { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chess } from 'chess.js';
const parseTimeControl = (timeStr) => {
    if (!timeStr || timeStr === "No Timer") return { base: null, inc: 0 };
    const cleanStr = timeStr.replace(' min', '').trim();
    if (cleanStr.includes('|')) {
        const [basePart, incPart] = cleanStr.split('|').map(s => parseInt(s.trim()));
        return { base: basePart * 60, inc: incPart };
    }
    const mins = parseInt(cleanStr);
    return { base: mins * 60, inc: 0 };
};
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
    const [whiteTime, setWhiteTime] = useState(600);
    const [blackTime, setBlackTime] = useState(600);
    const [activeTimeColor, setActiveTimeColor] = useState(null); // 'w' vagy 'b'
    const [increment, setIncrement] = useState(0);
    const whiteWarnedRef = useRef(false);
    const blackWarnedRef = useRef(false);
    const [opening, setOpening] = useState(null);
    // HANG SZINKRONIZÁCIÓHOZ SZÜKSÉGES REF ÉS STATE-EK
    const lastPlayedMoveNum = useRef(0);
    const lastPlayedTickRef = useRef(-1);
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
    const [lastTimeControl, setLastTimeControl] = useState("No Timer");
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
                const serverHistory = res.data.history;
                setHistory(prevHistory => {
                    if (prevHistory.length === 0) return serverHistory;
                    return serverHistory.map((serverMove, index) => {
                        const localMove = prevHistory[index];
                        if (localMove && localMove.m === serverMove.m) {
                            return { ...serverMove, t: localMove.t }; // Megtartjuk a "szép" időt
                        }
                        return serverMove; // Új lépés a szerverről
                    });
                });
                const moveCount = serverHistory.filter(m => m.m !== "start").length;
                lastPlayedMoveNum.current = moveCount;
                if (res.data.status) setStatus(res.data.status);
                if (res.data.opening) setOpening(res.data.opening);
            }
        } catch (err) { console.error(err); }
    }, [token, API_BASE]);
    const executeMove = async (from, to, promotion = null) => {
        const chess = new Chess(fen);
        const piece = chess.get(from);
        if (piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1')) && !promotion) {
            setPendingPromotion({ from, to });
            setIsDragging(false);
            return;
        }
        const moveAttempt = chess.move({ from, to, promotion: promotion || 'q' });
        if (!moveAttempt) return;
        // --- SAJÁT IDŐ KISZÁMÍTÁSA ---
        const baseTime = parseTimeControl(lastTimeControl).base || 600;
        const currentTime = activeTimeColor === 'w' ? whiteTime : blackTime;
        const myThinkingTimeValue = Math.max(0.1, Math.abs(baseTime - currentTime)).toFixed(1);
        // --- BOT RANDOM IDŐ GENERÁLÁSA ---
        const botThinkingTimeValue = (Math.random() * (2.8 - 1.5) + 1.5).toFixed(1);
        const myMoveForHistory = {
            m: moveAttempt.san,
            from: from,
            to: to,
            fen: chess.fen(),
            t: parseFloat(myThinkingTimeValue),
            num: lastPlayedMoveNum.current + 1
        };
        setHistory(prev => [...prev, myMoveForHistory]);
        // Óra váltása azonnal
        if (activeTimeColor) {
            if (activeTimeColor === 'w') {
                setWhiteTime(prev => prev + increment);
                setActiveTimeColor('b');
            } else {
                setBlackTime(prev => prev + increment);
                setActiveTimeColor('w');
            }
        }
        setPendingPromotion(null);
        setFen(chess.fen());
        setLastMove({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);
        setIsDragging(false);
        lastPlayedMoveNum.current += 1;
        // --- SAJÁT LÉPÉS HANGJAI (Eredeti sorrend) ---
        setTimeout(() => {
            if (chess.isCheckmate()) playSound('checkmate');
            else if (chess.isStalemate() || chess.isDraw() || chess.isThreefoldRepetition()) playSound('stalemate');
            else if (moveAttempt.flags.includes('p') || moveAttempt.flags.includes('cp')) playSound('promote');
            else if (moveAttempt.flags.includes('k') || moveAttempt.flags.includes('q')) playSound('castle');
            else if (chess.isCheck()) playSound('move-check');
            else if (moveAttempt.captured || moveAttempt.flags.includes('e')) playSound('capture');
            else playSound('move');
        }, 10);
        try {
            const res = await axios.post(`${API_BASE}/move`,
                { game_id: gameId, move: `${from}${to}${promotion || ""}` },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const bot = res.data.bot_move;
            if (bot && bot.from) {
                // --- BOT KÉSLELTETÉS ---
                setTimeout(() => {
                    const botMoveEntry = {
                        m: bot.san,
                        from: bot.from,
                        to: bot.to,
                        fen: res.data.new_fen,
                        t: parseFloat(botThinkingTimeValue),
                        num: lastPlayedMoveNum.current + 1
                    };
                    // History frissítése a bot lépésével
                    setHistory(prev => [...prev, botMoveEntry]);
                    setFen(res.data.new_fen);
                    setLastMove({ from: bot.from, to: bot.to });
                    lastPlayedMoveNum.current += 1;
                    if (res.data.status) setStatus(res.data.status);
                    if (res.data.opening) setOpening(res.data.opening);
                    if (activeTimeColor) {
                        const nextColor = res.data.new_fen.split(' ')[1];
                        setActiveTimeColor(nextColor);
                        if (nextColor === 'w') setBlackTime(prev => prev + increment);
                        else setWhiteTime(prev => prev + increment);
                    }
                    // --- BOT HANGOK ---
                    const isCheckmate = res.data.status === "checkmate";
                    const isDraw = res.data.status && res.data.status !== "ongoing" && !isCheckmate;
                    if (isCheckmate) playSound('checkmate');
                    else if (isDraw) playSound('stalemate');
                    else if (bot.san?.includes('=')) playSound('promote');
                    else if (bot.san?.includes('+')) playSound('move-check');
                    else if (bot.san?.includes('O-O')) playSound('castle');
                    else if (bot.san?.includes('x')) playSound('capture');
                    else playSound('move');
                }, parseFloat(botThinkingTimeValue) * 1000);
            }
        } catch (err) { console.error(err); }
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
                    if (serverMoveCount > lastPlayedMoveNum.current) {
                        const latestMove = serverHistory[serverHistory.length - 1];
                        setHistory(serverHistory);
                        if (res.data.status) setStatus(res.data.status);
                        // --- ÓRA SZINKRONIZÁLÁSA A SZERVERREL ---
                        const nextTurnColor = latestMove.fen.split(' ')[1];
                        setActiveTimeColor(nextTurnColor);
                        if (viewIndex === -1 && latestMove.fen !== fen) {
                            setFen(latestMove.fen);
                            setLastMove({ from: latestMove.from, to: latestMove.to });
                            const m = latestMove.m;
                            setTimeout(() => {
                                if (m.includes('#')) playSound('checkmate');
                                else if (m.includes('+')) playSound('move-check');
                                else playSound('move');
                            }, 220);
                        }
                        lastPlayedMoveNum.current = serverMoveCount;
                    }
                }
            } catch (e) { console.error("Polling error", e); }
        }, 3000);
    }
    return () => clearInterval(interval);
}, [gameId, fen, status, token, API_BASE, playSound, viewIndex]);
// 2. Az óra ketyegése maradjon egyszerű (csak csökkentsen)
// EFFECT 1: Az óra ketyegése (100ms-enként)
useEffect(() => {
    let timer;
    if (gameId && status === "ongoing" && activeTimeColor) {
        timer = setInterval(async () => {
            const isWhite = activeTimeColor === 'w';
            const currentTime = isWhite ? whiteTime : blackTime;
            if (currentTime <= 0) {
    clearInterval(timer);
    setActiveTimeColor(null);
    try {
        const res = await axios.post(`${API_BASE}/move`, {
            game_id: gameId,
            timeout: true
        }, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.status) {
            setStatus(res.data.status);
            setReason(res.data.reason);
            // Itt is: ha aborted, ne legyen győzelmi/vereségi hang
            if (res.data.status === "aborted") {
                playSound('move');
            } else {
                playSound('game-end');
            }
            localStorage.removeItem('chessGameId');
        }
    } catch (err) { console.error("Timeout error:", err); }
                return;
            }
            if (isWhite) setWhiteTime(prev => Math.max(0, Math.round((prev - 0.1) * 10) / 10));
            else setBlackTime(prev => Math.max(0, Math.round((prev - 0.1) * 10) / 10));
        }, 100);
    }
    return () => clearInterval(timer);
}, [gameId, status, activeTimeColor, whiteTime, blackTime, API_BASE, token, playSound]);
// EFFECT 2: A hang figyelése - Játékosonként pontosan egyszer 10 mp alatt
useEffect(() => {
    if (status !== "ongoing" || !activeTimeColor) return;
    // 1. Megnézzük a FEHÉR idejét
    if (whiteTime <= 10 && whiteTime > 0) {
        if (!whiteWarnedRef.current) {
            playSound('tenseconds');
            whiteWarnedRef.current = true; // Elmentjük, hogy ő már kapott figyelmeztetést
        }
    } else if (whiteTime > 10) {
        // Ha bónuszidőt kapott és 10 fölé ment, újra élesítjük a figyelmeztetést
        whiteWarnedRef.current = false;
    }
    // 2. Megnézzük a FEKETE idejét
    if (blackTime <= 10 && blackTime > 0) {
        if (!blackWarnedRef.current) {
            playSound('tenseconds');
            blackWarnedRef.current = true; // Elmentjük, hogy ő is kapott már
        }
    } else if (blackTime > 10) {
        blackWarnedRef.current = false;
    }
}, [whiteTime, blackTime, status, playSound]);
// FONTOS: Az activeTimeColor kikerült a függőségek közül,
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
    lastPlayedMoveNum.current = 0;
    whiteWarnedRef.current = false;
    blackWarnedRef.current = false;
    // --- ÚJ: IDŐZÍTŐ RESET ---
    setActiveTimeColor(null); // Megállítja a ketyegést
    setWhiteTime(600);        // Vagy amennyi az alapértelmezett
    setBlackTime(600);
}, [lastTimeControl, parseTimeControl]);
const startNewGame = useCallback(async (bot = { elo: 1500, id: 'engine' }, color = 'white', timeControl) => {
    // 1. IDŐZÍTÉS ÉS UI RESET
    const finalTimeControl = timeControl || lastTimeControl || "No Timer";
    const config = parseTimeControl(finalTimeControl);
    // Alaphelyzetbe állítások
    whiteWarnedRef.current = false;
    blackWarnedRef.current = false;
    setActiveTimeColor(null);
    setLastMove({ from: null, to: null });
    setLastTimeControl(finalTimeControl);
    setHistory([]);
    setReason("");
    setViewIndex(-1);
    // Órák beállítása a config alapján
    const initialTime = config.base || 600;
    setWhiteTime(initialTime);
    setBlackTime(initialTime);
    setIncrement(config.inc || 0);
    try {
        // 2. BACKEND HÍVÁS - Minden új paramétert küldünk
        const res = await axios.post(`${API_BASE}/create-game`,
            {
                color: color, // A backend most már kezeli a 'random'-ot, felesleges kliensen sorsolni
                bot_elo: bot.elo,
                bot_id: bot.id,
                bot_style: bot.style || "mix",
                time_category: config.base < 180 ? "bullet" : config.base < 600 ? "blitz" : "rapid",
                base_time: initialTime,
                time_control: finalTimeControl
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const { game_id: newId, player_color: assignedColor, fen: initialFen } = res.data;
        localStorage.setItem('chessGameId', newId);
        setGameId(newId);
        setFen(initialFen);
        setStatus("ongoing");
        setSelectedSquare(null);
        setValidMoves([]);
        // 3. LÉPÉSSZÁMLÁLÓ ÉS ÓRA INDÍTÁSA
        // Tisztább logika: Ha a táblán nem az alapállás van (bot már lépett), akkor 'b' jön.
        const isBotMoved = initialFen !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        if (assignedColor === 'black' || isBotMoved) {
            lastPlayedMoveNum.current = 1;
            setActiveTimeColor('b');
        } else {
            lastPlayedMoveNum.current = 0;
            setActiveTimeColor('w');
        }
        // 4. SZINKRON ÉS HANG
        await fetchGameState(newId);
        playSound('game-start');
        return assignedColor;
    } catch (err) {
        console.error("Hiba az új játék indításakor:", err);
        return color === 'black' ? 'black' : 'white';
    }
}, [token, API_BASE, playSound, fetchGameState, parseTimeControl, lastTimeControl]);
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
// useChessGame.jsx - Keresd meg a handleResign függvényt és cseréld erre:
const handleResign = async () => {
    if (!window.confirm("Biztosan feladod vagy kilépsz?")) return;
    if (!gameId || !token) return;
    try {
        setActiveTimeColor(null);
        const res = await axios.post(`${API_BASE}/move`,
            { game_id: gameId, resigned: true, move: "null" },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.status) {
            setStatus(res.data.status);
            setReason(res.data.reason);
            // JAVÍTÁS: Mindig legyen valamilyen hang
            if (res.data.status === "aborted") {
                playSound('move'); // Aborted esetén egy sima koppanás
            } else {
                playSound('game-end'); // Valódi feladásnál a drámai hang
            }
            localStorage.removeItem('chessGameId');
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
        goToMove, handleMouseDown, handleMouseUp, renderNotation, offerDraw, userChoiceColor,difficultyChoice, resetGame, whiteTime, blackTime, activeTimeColor,parseTimeControl,setBlackTime, setWhiteTime, lastTimeControl, opening, setOpening   };
};