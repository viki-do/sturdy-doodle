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
    const [gameId, setGameId] = useState(null);
    const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const [lastMove, setLastMove] = useState({ from: null, to: null });
    const [history, setHistory] = useState([]);
    const [status, setStatus] = useState("");
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
    const [activeTimeColor, setActiveTimeColor] = useState(null);
    const [increment, setIncrement] = useState(0);
    const whiteWarnedRef = useRef(false);
    const blackWarnedRef = useRef(false);
    const [opening, setOpening] = useState(null);
    const turnStartTimeRef = useRef(Date.now());
    const lastPlayedMoveNum = useRef(0);
    // const lastPlayedTickRef = useRef(-1);
    const lastBotRef = useRef({ elo: 1500, id: 'engine', style: 'mix' });
    const [isFlipped, setIsFlipped] = useState(false);


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
        const firstChar = text[0];
        if (icons[firstChar]) {
            return (
                <span className="flex items-center">
                    <span className="text-[1.3em] mr-0.5 leading-none">{icons[firstChar]}</span>
                    {text}
                </span>
            );
        }
        return text;
    }, []);


    const fetchGameState = useCallback(async (id) => {
    if (!id || id === "null" || !token) return;
    try {
        const res = await axios.get(`${API_BASE}/game/${id}/history`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.history) {
            const serverHistory = res.data.history;

            // --- KRITIKUS JAVÍTÁS: Szín szinkronizálása ---
            // Beállítjuk a tábla irányát a szerver válasza alapján (ha fekete, flippelünk)
            if (res.data.player_color) {
                setIsFlipped(res.data.player_color === 'black');
            }

            // 1. History frissítése
            setHistory(prevHistory => {
                if (prevHistory.length === 0) return serverHistory;
                return serverHistory.map((serverMove, index) => {
                    const localMove = prevHistory[index];
                    if (localMove && localMove.m === serverMove.m) {
                        return { ...serverMove, t: localMove.t };
                    }
                    return serverMove;
                });
            });

            // 2. Utolsó lépés adatai
            const latestMove = serverHistory[serverHistory.length - 1];

            // 3. Tábla vizuális beállítása
            setFen(latestMove.fen);
            if (latestMove.from && latestMove.to) {
                setLastMove({ from: latestMove.from, to: latestMove.to });
            }

            // 4. Óra és kör szinkron
            const nextTurnColor = latestMove.fen.split(' ')[1]; 
            setActiveTimeColor(nextTurnColor);
            
            const moveCount = serverHistory.filter(m => m.m !== "start").length;
            lastPlayedMoveNum.current = moveCount;

            if (res.data.status) setStatus(res.data.status);
            if (res.data.opening) setOpening(res.data.opening);

            // Visszaadjuk az adatokat, hogy a hívó fél (pl. GameBoard) is lássa
            return res.data; 
        }
    } catch (err) { 
        console.error("Hiba a játék betöltésekor:", err); 
    }
}, [token, API_BASE, setFen, setLastMove, setActiveTimeColor, setStatus, setOpening, setHistory, setIsFlipped]);;


    const resetGame = useCallback(() => {
        setGameId(null);
        localStorage.removeItem('chessGameId');
        setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        setLastMove({ from: null, to: null });
        setHistory([]);
        setStatus("");
        setReason("");
        setViewIndex(-1);
        setActiveTimeColor(null);
        lastPlayedMoveNum.current = 0;
    }, []);


    const setSpectatorMode = useCallback(() => {
        setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        setLastMove({ from: null, to: null });
        setHistory([]);
        setActiveTimeColor(null);
        setStatus(""); 
        setReason("");
    },[]);


    const startNewGame = useCallback(async (bot, color = 'white', timeControl) => {
    // 1. BOT ADATOK VALIDÁLÁSA ÉS MENTÉSE
    if (bot && typeof bot === 'object' && bot.elo) {
        lastBotRef.current = bot;
    }
    const currentBot = (bot && typeof bot === 'object') ? bot : lastBotRef.current;

    // 2. IDŐZÍTÉS ÉS UI RESET
    const finalTimeControl = timeControl || lastTimeControl || "No Timer";
    const config = parseTimeControl(finalTimeControl);
    const initialTime = config.base || 600;

    whiteWarnedRef.current = false;
    blackWarnedRef.current = false;
    setActiveTimeColor(null);
    setLastMove({ from: null, to: null });
    setLastTimeControl(finalTimeControl);
    setOpening(null);
    setHistory([{ m: "start", wTime: initialTime, bTime: initialTime, num: 0 }]);
    setReason("");
    setStatus("ongoing");
    setViewIndex(-1);
    setWhiteTime(initialTime);
    setBlackTime(initialTime);
    setIncrement(config.inc || 0);

    try {
        // 3. BACKEND HÍVÁS
        const res = await axios.post(`${API_BASE}/create-game`,
            {
                color: color,
                bot_elo: currentBot.elo,
                bot_id: currentBot.id,
                bot_style: currentBot.style || "mix",
                time_category: initialTime < 180 ? "bullet" : initialTime < 600 ? "blitz" : "rapid",
                base_time: initialTime,
                time_control: finalTimeControl
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const { game_id: newId, player_color: assignedColor, fen: initialFen } = res.data;

        // --- KRITIKUS JAVÍTÁS: Szín szinkronizálása a Hook-on belül ---
        setIsFlipped(assignedColor === 'black');

        localStorage.setItem('chessGameId', newId);
        setGameId(newId);
        setFen(initialFen);
        setSelectedSquare(null);
        setValidMoves([]);

        // 4. LÉPÉSSZÁMLÁLÓ ÉS BOT ELSŐ LÉPÉSÉNEK DETEKTÁLÁSA
        const isBotMoved = initialFen !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

        if (isBotMoved) {
            lastPlayedMoveNum.current = 1;
            setActiveTimeColor('b'); // Bot (fehér) lépett, jön a sötét (játékos)

            const historyRes = await axios.get(`${API_BASE}/game/${newId}/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (historyRes.data.history) {
                const serverHistory = historyRes.data.history;
                setHistory(serverHistory);
                const firstMove = serverHistory.find(m => m.m !== "start");
                if (firstMove && firstMove.from && firstMove.to) {
                    setLastMove({ from: firstMove.from, to: firstMove.to });
                }
            }
        } else {
            lastPlayedMoveNum.current = 0;
            setActiveTimeColor('w'); // Sima kezdés (fehér jön)
            setLastMove({ from: null, to: null });
        }

        if (!isBotMoved) {
            await fetchGameState(newId);
        }

        playSound('game-start');
        turnStartTimeRef.current = Date.now();

        return assignedColor;
    } catch (err) {
        console.error("Hiba az új játék indításakor:", err);
        setOpening(null);
        // Hiba esetén is próbáljuk beállítani a flippet a kért szín alapján
        setIsFlipped(color === 'black');
        return color === 'black' ? 'black' : 'white';
    }
}, [token, API_BASE, playSound, fetchGameState, parseTimeControl, lastTimeControl, lastBotRef, setIsFlipped]); // setIsFlipped hozzáadva a függőségekhez

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
        const now = Date.now();
        const elapsed = (now - turnStartTimeRef.current) / 1000;
        const isWhiteTurn = activeTimeColor === 'w';
        const currentW = whiteTime;
        const currentB = blackTime;
        const saveWhite = isWhiteTurn ? currentW : whiteTime;
        const saveBlack = !isWhiteTurn ? currentB : blackTime;
        const myMoveForHistory = {
            m: moveAttempt.san,
            from, to,
            fen: chess.fen(),
            t: parseFloat(elapsed.toFixed(1)),
            num: lastPlayedMoveNum.current + 1,
            wTime: saveWhite,
            bTime: saveBlack
        };
        setHistory(prev => [...prev, myMoveForHistory]);
        if (isWhiteTurn) {
            setWhiteTime(prev => prev + increment);
            setActiveTimeColor('b');
        } else {
            setBlackTime(prev => prev + increment);
            setActiveTimeColor('w');
        }
        turnStartTimeRef.current = Date.now();
        setPendingPromotion(null);
        setFen(chess.fen());
        setLastMove({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);
        setIsDragging(false);
        lastPlayedMoveNum.current += 1;
        const moveNumAfterMyMove = lastPlayedMoveNum.current;

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
            if (res.data.is_game_over) {
                setStatus(res.data.status);
                setReason(res.data.reason);
                setActiveTimeColor(null);
                if (!res.data.bot_move) {
                    localStorage.removeItem('chessGameId');
                    return;
                }
            }
            const bot = res.data.bot_move;
            if (bot && bot.from && bot.to) {
                const botThinkingDelay = Math.random() * (2.8 - 1.5) + 1.5;
                setTimeout(() => {
                    if (lastPlayedMoveNum.current > moveNumAfterMyMove) {
                        console.log("Bot move already handled by polling.");
                        return;
                    }
                    const botSnapW = whiteTime;
                    const botSnapB = blackTime;
                    const isBotWhite = res.data.new_fen.split(' ')[1] === 'b';
                    const botMoveEntry = {
                        m: bot.san,
                        from: bot.from,
                        to: bot.to,
                        fen: res.data.new_fen,
                        t: parseFloat(((Date.now() - turnStartTimeRef.current) / 1000).toFixed(1)),
                        num: lastPlayedMoveNum.current + 1,
                        wTime: botSnapW,
                        bTime: botSnapB
                    };
                    setHistory(prev => [...prev, botMoveEntry]);
                    if (isBotWhite) setWhiteTime(prev => prev + increment);
                    else setBlackTime(prev => prev + increment);
                    const nextColor = res.data.new_fen.split(' ')[1];
                    setActiveTimeColor(nextColor);
                    turnStartTimeRef.current = Date.now();
                    setFen(res.data.new_fen);
                    setLastMove({ from: bot.from, to: bot.to });
                    lastPlayedMoveNum.current += 1;
                    if (res.data.status) setStatus(res.data.status);
                    if (res.data.reason) setReason(res.data.reason);
                    if (res.data.opening) setOpening(res.data.opening);
                    if (res.data.is_game_over) {
                        setActiveTimeColor(null);
                        localStorage.removeItem('chessGameId');
                    }
                    const isCheckmateStatus = res.data.status === "checkmate";
                    if (isCheckmateStatus) playSound('checkmate');
                    else if (bot.san?.includes('=')) playSound('promote');
                    else if (bot.san?.includes('+')) playSound('move-check');
                    else if (bot.san?.includes('O-O')) playSound('castle');
                    else if (bot.san?.includes('x')) playSound('capture');
                    else playSound('move');
                }, botThinkingDelay * 1000);
            }
        } catch (err) {
            console.error("Move error:", err);
        }
    };


const handleMouseDown = (e, row, col) => {
    // 1. Koordináták azonnal
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (status !== "ongoing" || viewIndex !== -1 || !gameId) return;

    const square = getSquareName(row, col);
    const chess = new Chess(fen);
    const piece = chess.get(square);

    // Click-Click kezelés
    if (selectedSquare && selectedSquare !== square && validMoves.includes(square)) {
        executeMove(selectedSquare, square);
        return;
    }

    const myColor = isFlipped ? 'b' : 'w';

    if (piece && piece.color === myColor && activeTimeColor === myColor) {
        // --- KRITIKUS: Szinkron state frissítés ---
        setMousePos({ x: clientX, y: clientY });
        setSelectedSquare(square);
        setHoverSquare(square);
        setIsDragging(true); // Ez az, ami "felemeli" a bábut

        // A backend kérést tedd egy külön szálra, ne várj rá (nincs await!)
        axios.post(`${API_BASE}/get-valid-moves`, { game_id: gameId, square: square }, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setValidMoves(res.data.valid_moves || []))
            .catch(() => setValidMoves([]));

        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({ 
            x: clientX - (rect.left + rect.width / 2), 
            y: clientY - (rect.top + rect.height / 2) 
        });
    }
};

 const handleMouseUp = async () => {
    if (!isDragging || !selectedSquare) return;

    const from = selectedSquare;
    const target = hoverSquare; // A useEffect által folyamatosan frissített mező
    
    setIsDragging(false);

    // Ha nincs cél, vagy ugyanaz a mező
    if (!target || target === from) {
        setHoverSquare(null);
        // Ne töröljük a kijelölést, hátha csak rákattintott a bábura
        return;
    }

    // HELYI SAKKMOTOR ELLENŐRZÉSE
    const chess = new Chess(fen);
    const moves = chess.moves({ square: from, verbose: true });
    const isValidMove = moves.some(m => m.to === target);

    if (isValidMove) {
        // Ha szabályos, azonnal küldjük
        await executeMove(from, target);
        setSelectedSquare(null);
        setValidMoves([]);
    } else {
        // Ha szabálytalan, visszaugrik
        playSound('illegal');
        setIsAlert(true);
        setTimeout(() => setIsAlert(false), 400);
        // Itt megtartjuk a kijelölést, mint a nagy sakkoldalakon
    }
    
    setHoverSquare(null);
};

    const handleResign = async () => {
        if (!window.confirm("Biztosan feladod vagy kilépsz?")) return;
        if (!gameId || !token) return;
        try {
            setActiveTimeColor(null);
            const res = await axios.post(`${API_BASE}/resign-game`,
                { game_id: gameId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.status) {
                setStatus(res.data.status);
                setReason(res.data.reason);
                if (res.data.status === "aborted") {
                    playSound('move');
                } else {
                    playSound('game-end');
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

    useEffect(() => {
        let interval;
        if (gameId && status === "ongoing") {
            interval = setInterval(async () => {
                if (!activeTimeColor || status !== "ongoing") {
                    if (interval) clearInterval(interval);
                    return;
                }
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
                            if (res.data.reason) setReason(res.data.reason);
                            const nextTurnColor = latestMove.fen.split(' ')[1];
                            setActiveTimeColor(nextTurnColor);
                            turnStartTimeRef.current = Date.now();
                            if (viewIndex === -1 && activeTimeColor) {
                                setFen(latestMove.fen);
                                if (latestMove.from && latestMove.to) {
                                    setLastMove({ from: latestMove.from, to: latestMove.to });
                                }
                                const m = latestMove.m;
                                setTimeout(() => {
                                    if (m.includes('#')) playSound('checkmate');
                                    else if (m.includes('+')) playSound('move-check');
                                    else if (m.includes('x')) playSound('capture');
                                    else if (m.includes('O-O')) playSound('castle');
                                    else playSound('move');
                                }, 50);
                            }
                            lastPlayedMoveNum.current = serverMoveCount;
                        }
                    }
                } catch (e) {
                    console.error("Polling error:", e);
                    if (e.response?.status === 404) clearInterval(interval);
                }
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [gameId, status, activeTimeColor, token, API_BASE, playSound, viewIndex]);

    
    useEffect(() => {
        let timer;
        if (gameId && status === "ongoing" && activeTimeColor) {
            const startTime = Date.now();
            const startValue = activeTimeColor === 'w' ? whiteTime : blackTime;
            timer = setInterval(async () => {
                const now = Date.now();
                const elapsed = (now - startTime) / 1000;
                const newValue = Math.max(0, startValue - elapsed);
                if (activeTimeColor === 'w') {
                    setWhiteTime(newValue);
                } else {
                    setBlackTime(newValue);
                }
                if (newValue <= 0) {
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
                            playSound(res.data.status === "aborted" ? 'move' : 'game-end');
                            localStorage.removeItem('chessGameId');
                        }
                    } catch (err) { console.error("Timeout error:", err); }
                }
            }, 50);
        }
        return () => clearInterval(timer);
    }, [gameId, status, activeTimeColor, API_BASE, token, playSound]);


    useEffect(() => {
        if (status !== "ongoing" || !activeTimeColor) return;
        if (whiteTime <= 10 && whiteTime > 0) {
            if (!whiteWarnedRef.current) {
                playSound('tenseconds');
                whiteWarnedRef.current = true;
            }
        } else if (whiteTime > 10) {
            whiteWarnedRef.current = false;
        }
        if (blackTime <= 10 && blackTime > 0) {
            if (!blackWarnedRef.current) {
                playSound('tenseconds');
                blackWarnedRef.current = true;
            }
        } else if (blackTime > 10) {
            blackWarnedRef.current = false;
        }
    }, [whiteTime, blackTime, status, playSound]);

  

    return {
        gameId, setGameId, fen, setFen, selectedSquare, setSelectedSquare, validMoves, setValidMoves,
        lastMove, setLastMove, history, setHistory, status, setStatus, isDragging, setIsDragging,
        viewIndex, setViewIndex, isAlert, setIsAlert, mousePos, setMousePos, dragOffset, setDragOffset,
        hoverSquare, setHoverSquare, getSquareName, fetchGameState, startNewGame, handleResign,
        executeMove, playSound, token, API_BASE, reason, setReason, pendingPromotion, setPendingPromotion,
        goToMove, handleMouseDown, handleMouseUp, renderNotation, offerDraw, resetGame, whiteTime, blackTime, activeTimeColor,parseTimeControl,setBlackTime, setWhiteTime, lastTimeControl, opening, setOpening, setSpectatorMode };
};