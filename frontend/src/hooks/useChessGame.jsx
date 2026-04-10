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
    const turnStartTimeRef = useRef(Date.now());
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
    const firstChar = text[0];

    // Ha a kezdőkarakter egy figura betűjele (K, Q, R, B, N)
    if (icons[firstChar]) {
        return (
            <span className="flex items-center">
                {/* Az ikon megjelenítése */}
                <span className="text-[1.3em] mr-0.5 leading-none">{icons[firstChar]}</span>
                {/* A teljes szöveg megjelenítése (pl. Nf6), nem vágjuk le a betűt! */}
                {text}
            </span>
        );
    }
    // Gyaloglépéseknél (pl. e4) vagy sáncolásnál (O-O) nincs ikon, marad az eredeti szöveg
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

    // --- 1. MATEMATIKA: CSAK A VALÓSÁGOT RÖGZÍTJÜK ---
    const now = Date.now();
    // Mennyi telt el a kör eleje óta (Date.now különbség)
    const elapsed = (now - turnStartTimeRef.current) / 1000;
    const isWhiteTurn = activeTimeColor === 'w';

    // A JELENLEGI state-ből indulunk ki (whiteTime/blackTime), 
    // mert a ketyegő useEffect Date.now() alapú, tehát ez az érték PONTOS.
    const currentW = whiteTime;
    const currentB = blackTime;

    // Kiszámoljuk a history-ba kerülő időket
    // Itt válik el a két szín: csak az egyiket csökkentjük!
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

    // --- 2. ÁTVÁLTÁS ÉS BÓNUSZ ---
    // Itt adjuk hozzá az incrementet az élő órához
    if (isWhiteTurn) {
        setWhiteTime(prev => prev + increment);
        setActiveTimeColor('b');
    } else {
        setBlackTime(prev => prev + increment);
        setActiveTimeColor('w');
    }

    // ÚJ KÖR INDUL - Itt nullázzuk a stopperórát a következő játékosnak
    turnStartTimeRef.current = Date.now();

    // UI/Logic reset
    setPendingPromotion(null);
    setFen(chess.fen());
    setLastMove({ from, to });
    setSelectedSquare(null);
    setValidMoves([]);
    setIsDragging(false);
    lastPlayedMoveNum.current += 1;

    // Hangok (minden opcióval)
    setTimeout(() => {
        if (chess.isCheckmate()) playSound('checkmate');
        else if (chess.isStalemate() || chess.isDraw() || chess.isThreefoldRepetition()) playSound('stalemate');
        else if (moveAttempt.flags.includes('p') || moveAttempt.flags.includes('cp')) playSound('promote');
        else if (moveAttempt.flags.includes('k') || moveAttempt.flags.includes('q')) playSound('castle');
        else if (chess.isCheck()) playSound('move-check');
        else if (moveAttempt.captured || moveAttempt.flags.includes('e')) playSound('capture');
        else playSound('move');
    }, 10);

    // --- 3. BOT LÉPÉS KEZELÉSE ÉS JÁTÉK VÉGE ---
    try {
        const res = await axios.post(`${API_BASE}/move`, 
            { game_id: gameId, move: `${from}${to}${promotion || ""}` }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // --- ÚJ: ELLENŐRIZZÜK AZONNAL, HOGY VÉGE VAN-E (pl. Mattot adtál) ---
        if (res.data.is_game_over) {
            setStatus(res.data.status); // Beállítja: "checkmate", "draw", stb.
            setReason(res.data.reason); // Beállítja a szöveget: "White wins by checkmate"
            setActiveTimeColor(null);    // Megállítja az órát
            
            // Ha a botnak már nem kell lépnie (mert te mattot adtál), itt megállunk
            if (!res.data.bot_move) {
                localStorage.removeItem('chessGameId');
                return; 
            }
        }

        const bot = res.data.bot_move;
        if (bot && bot.from) {
            const botThinkingDelay = Math.random() * (2.8 - 1.5) + 1.5;

            setTimeout(() => {
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
                
                // --- BOT LÉPÉSE UTÁNI JÁTÉK VÉGE ELLENŐRZÉS (Ha a bot mattolt téged) ---
                if (res.data.status) setStatus(res.data.status);
                if (res.data.reason) setReason(res.data.reason);
                if (res.data.opening) setOpening(res.data.opening);

                if (res.data.is_game_over) {
                    setActiveTimeColor(null);
                    localStorage.removeItem('chessGameId');
                }

                // Bot hangok
                const isCheckmateStatus = res.data.status === "checkmate";
                if (isCheckmateStatus) playSound('checkmate');
                else if (bot.san?.includes('=')) playSound('promote');
                else if (bot.san?.includes('+')) playSound('move-check');
                else if (bot.san?.includes('O-O')) playSound('castle');
                else if (bot.san?.includes('x')) playSound('capture');
                else playSound('move');

            }, botThinkingDelay * 1000);
        }
    } catch (err) { console.error("Move error:", err); }
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
        // Rögzítjük a pillanatot, amikor elindul ez a kör
        const startTime = Date.now();
        // Elmentjük, mennyi idő volt az órán az indításkor
        const startValue = activeTimeColor === 'w' ? whiteTime : blackTime;

        timer = setInterval(async () => {
            const now = Date.now();
            // Kiszámoljuk, pontosan hány másodperc telt el az indítás óta
            const elapsed = (now - startTime) / 1000;
            const newValue = Math.max(0, startValue - elapsed);

            // Csak az éppen aktív órát frissítjük
            if (activeTimeColor === 'w') {
                setWhiteTime(newValue);
            } else {
                setBlackTime(newValue);
            }

            // Lejárt az idő (Zászlóleesés)
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
    const initialTime = config.base || 600;

    // --- AZONNALI UI TISZTÍTÁS ---
    whiteWarnedRef.current = false;
    blackWarnedRef.current = false;
    setActiveTimeColor(null);
    setLastMove({ from: null, to: null });
    setLastTimeControl(finalTimeControl);
    
    // Itt nullázzuk a megnyitást, hogy ne maradjon ott az előző meccs neve
    setOpening(null); 
    
    // Itt állítjuk be a kezdő history-t a NaN ellen
    setHistory([{ m: "start", wTime: initialTime, bTime: initialTime, num: 0 }]);
    
    setReason("");
    setViewIndex(-1);
    setWhiteTime(initialTime);
    setBlackTime(initialTime);
    setIncrement(config.inc || 0);

    try {
        // 2. BACKEND HÍVÁS
        const res = await axios.post(`${API_BASE}/create-game`,
            {
                color: color,
                bot_elo: bot.elo,
                bot_id: bot.id,
                bot_style: bot.style || "mix",
                time_category: initialTime < 180 ? "bullet" : initialTime < 600 ? "blitz" : "rapid",
                base_time: initialTime,
                time_control: finalTimeControl
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const { game_id: newId, player_color: assignedColor, fen: initialFen } = res.data;
        
        // Mentés és alapállapot beállítása
        localStorage.setItem('chessGameId', newId);
        setGameId(newId);
        setFen(initialFen);
        setStatus("ongoing");
        setSelectedSquare(null);
        setValidMoves([]);

        // 3. LÉPÉSSZÁMLÁLÓ ÉS ÓRA INDÍTÁSA
        // Megnézzük, történt-e már lépés (pl. bot kezdett fehérrel)
        const isBotMoved = initialFen !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        
        if (isBotMoved) {
            lastPlayedMoveNum.current = 1;
            setActiveTimeColor('b'); // Ha a bot (fehér) már lépett, a sötét (játékos) jön
        } else {
            lastPlayedMoveNum.current = 0;
            setActiveTimeColor('w'); // Sima kezdés (fehér jön)
        }

        // 4. SZINKRON ÉS HANG
        // Frissítjük a szerverről jövő adatokat (státusz, esetleges kezdőlépések)
        await fetchGameState(newId);
        playSound('game-start');
        
        // IDŐMÉRÉS INDÍTÁSA: Ekkor kezd el ketyegni az óra
        turnStartTimeRef.current = Date.now(); 
        
        return assignedColor;
    } catch (err) {
        console.error("Hiba az új játék indításakor:", err);
        // Hiba esetén is nullázzuk az opening-et, ne mutasson fals adatot
        setOpening(null);
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