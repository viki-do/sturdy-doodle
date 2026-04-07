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
            if (res.data.opening) {
                setOpening(res.data.opening);
            } else {
                setOpening(null); // Tisztítás, ha nincs megnyitás
            }
        } catch (err) { console.error("Hiba:", err); }
    }, [token, API_BASE]);

 const executeMove = async (from, to, promotion = null) => {
    const chess = new Chess(fen);
    const piece = chess.get(from);
    
    // 1. Gyalogátváltozás kezelése (UI felugró ablak)
    if (piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1')) && !promotion) {
        setPendingPromotion({ from, to });
        setIsDragging(false);
        return;
    }

    const moveAttempt = chess.move({ from, to, promotion: promotion || 'q' });
    if (!moveAttempt) return;

    // --- AZONNALI HISTORY FRISSÍTÉS ---
    const moveTime = (parseTimeControl(lastTimeControl).base - (activeTimeColor === 'w' ? whiteTime : blackTime)).toFixed(1);
    
    const myMoveForHistory = {
        m: moveAttempt.san,
        from: from,
        to: to,
        fen: chess.fen(),
        t: Math.abs(moveTime),
        num: lastPlayedMoveNum.current + 1
    };

    setHistory(prev => [...prev, myMoveForHistory]);

    // --- SAJÁT LÉPÉS IDŐVÁLTÁSA ---
    if (activeTimeColor) {
        if (activeTimeColor === 'w') {
            setWhiteTime(prev => prev + increment); 
            setActiveTimeColor('b'); 
        } else {
            setBlackTime(prev => prev + increment); 
            setActiveTimeColor('w'); 
        }
    }

    // UI frissítése azonnal
    setPendingPromotion(null);
    setFen(chess.fen());
    setLastMove({ from, to });
    setSelectedSquare(null);
    setValidMoves([]);
    setIsDragging(false);
    lastPlayedMoveNum.current += 1;

    // --- SAJÁT LÉPÉS HANGJAI ---
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

        // --- MEGNYITÁS MENTÉSE ---
        if (res.data.opening) {
            setOpening(res.data.opening);
        } else {
            setOpening(null);
        }

        const bot = res.data.bot_move;
        if (bot && bot.from) {
            setFen(res.data.new_fen);
            setLastMove({ from: bot.from, to: bot.to });
            lastPlayedMoveNum.current += 1;
            
            // --- BOT LÉPÉSE UTÁNI IDŐVÁLTÁS ---
            if (activeTimeColor) {
                const nextColor = res.data.new_fen.split(' ')[1]; 
                setActiveTimeColor(nextColor);
                if (nextColor === 'w') setBlackTime(prev => prev + increment);
                else setWhiteTime(prev => prev + increment);
            }

            // --- BOT LÉPÉSÉNEK HANGJAI (JAVÍTOTT PRIORITÁS) ---
            setTimeout(() => {
                const isCheckmate = res.data.status === "checkmate";
                const isDraw = res.data.status && res.data.status !== "ongoing" && !isCheckmate;

                if (isCheckmate) {
                    playSound('checkmate');
                } 
                else if (isDraw) {
                    playSound('stalemate');
                }
                // Szigorúbb feltétel: csak ha van '=' jel (promotion)
                else if (bot.san?.includes('=')) {
                    playSound('promote');
                }
                // Sakk (+) prioritása magasabb, mint az ütésé vagy sima lépésé
                else if (bot.san?.includes('+')) {
                    playSound('move-check');
                }
                else if (bot.san?.includes('O-O')) {
                    playSound('castle');
                }
                else if (bot.san?.includes('x')) {
                    playSound('capture');
                }
                else {
                    playSound('move');
                }
            }, 220);
        }
        
        fetchGameState(gameId);
    } catch (err) { 
        console.error("Hiba a lépés beküldésekor:", err);
        fetchGameState(gameId); 
    }
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
    

// EFFECT 2: A hang figyelése - CSAK EGYSZER 10 mp-nél
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

   
const startNewGame = useCallback(async (difficulty = 400, color = 'white', timeControl) => {
    // 1. MEGHATÁROZZUK A TÉNYLEGES IDŐT
    // Ha a gomb küldte (timeControl), azt használjuk, különben a mentettet, vagy a No Timer-t.
    const finalTimeControl = timeControl || lastTimeControl || "No Timer";
    
    // Alaphelyzetbe állítjuk a figyelmeztető ref-eket az új meccshez
    whiteWarnedRef.current = false;
    blackWarnedRef.current = false;
    
    // Azonnali UI reset: megállítjuk az órát, amíg a szerver válaszol
    setActiveTimeColor(null);
    setUserChoiceColor(color);
    setDifficultyChoice(difficulty);
    setLastMove({ from: null, to: null }); 
    setLastTimeControl(finalTimeControl);

    // 2. IDŐZÍTŐ ELŐKÉSZÍTÉSE
    const config = parseTimeControl(finalTimeControl);
    if (config.base) {
        setWhiteTime(config.base);
        setBlackTime(config.base);
        setIncrement(config.inc);
    } else {
        // Alapértelmezett 10 perc, de az activeTimeColor null marad, így nem ketyeg
        setWhiteTime(600); 
        setBlackTime(600);
        setIncrement(0);
    }

    try {
        // 3. RANDOM SZÍN KEZELÉSE
        // Ha a felhasználó a '?' gombra nyomott, itt sorsolunk egyet a backend híváshoz
        let colorToSend = color;
        if (color === 'random') {
            colorToSend = Math.random() < 0.5 ? 'white' : 'black';
        }

        // 4. BACKEND HÍVÁS
        const res = await axios.post(`${API_BASE}/create-game`,
            { 
                user_id: userId, 
                difficulty: difficulty, 
                color: colorToSend, 
                time_category: "rapid", 
                base_time: config.base || 600,
                time_control: finalTimeControl 
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // A szerver visszaküldi a végleges adatokat
        const newId = res.data.game_id;
        const assignedColor = res.data.player_color; // Ez lesz 'white' vagy 'black'
        
        localStorage.setItem('chessGameId', newId);
        
        // State-ek takarítása
        setHistory([]);
        setReason("");
        setViewIndex(-1);
        setGameId(newId);
        setStatus("ongoing");
        setSelectedSquare(null);
        setValidMoves([]);
        setFen(res.data.fen); // A kezdeti FEN (ha fekete vagy, ebben már benne van a bot lépése)

        // 5. ÓRA ÉS LÉPÉSSZÁMLÁLÓ SZINKRONIZÁLÁSA
        if (assignedColor === 'black') {
            // Ha a felhasználó fekete, a bot (fehér) már lépett egyet
            lastPlayedMoveNum.current = 1;
            setActiveTimeColor('b'); // A sötét órája kezd ketyegni
        } else {
            // Ha a felhasználó fehér, ő kezd
            lastPlayedMoveNum.current = 0;
            setActiveTimeColor('w'); // A világos órája kezd ketyegni
        }

        // Frissítjük a history-t a szerverről (hogy a bot kezdőlépése látszódjon a listában)
        await fetchGameState(newId); 
        
        playSound('game-start');

        // Visszatérünk a színnel, hogy a GameBoard tudja billenteni a táblát (isFlipped)
        return assignedColor;

    } catch (err) { 
        console.error("Hiba az új játék indításakor:", err);
        return 'white'; 
    }
}, [userId, token, API_BASE, playSound, fetchGameState, parseTimeControl, lastTimeControl]);

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
        // Küldjük a resigned: true-t, a move pedig lehet "null"
        const res = await axios.post(`${API_BASE}/move`, 
            { 
                game_id: gameId, 
                resigned: true,
                move: "null" 
            }, 
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
    } catch (err) { 
        console.error("Resign error:", err); 
    }
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