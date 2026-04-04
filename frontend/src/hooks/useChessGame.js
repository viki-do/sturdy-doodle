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
    const [reason, setReason] = useState(""); 
    const [pendingPromotion, setPendingPromotion] = useState(null);

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
            // 1. Alapadatok beállítása
            setGameId(id);
            localStorage.setItem('chessGameId', id);
            setHistory(res.data.history);
            
            // 2. Státusz frissítése a szerver válasza alapján (ongoing, resigned, checkmate, draw, stb.)
            if (res.data.status) {
                setStatus(res.data.status);
            }

            // 3. A részletes indoklás beállítása a Popup számára
            // (Ezt a state-et ne felejtsd el definiálni a hook elején: const [reason, setReason] = useState("");)
            if (res.data.reason) {
                setReason(res.data.reason);
            } else {
                setReason(""); // Tisztítás, ha még tart a játék
            }
            
            // 4. Tábla pozíció frissítése az utolsó lépésre
            setViewIndex(-1); 
            if (res.data.history.length > 0) {
                const latest = res.data.history[res.data.history.length - 1];
                setFen(latest.fen);
                if (latest.from && latest.to) {
                    setLastMove({ from: latest.from, to: latest.to });
                }
            }
        }
    } catch (err) { 
        console.error("Hiba a játékállapot lekérésekor:", err); 
    }
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

   const executeMove = async (from, to, promotion = null) => {
    const chess = new Chess(fen);
    
    // 1. PROMÓTÁLÁS ELLENŐRZÉSE
    // Megnézzük, hogy gyalog lép-e az utolsó sorra (fehérnél 8, feketénél 1)
    const piece = chess.get(from);
    const isPromotion = piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1'));

    // Ha promótálás történik, de még nincs megadva, hogy mivé (promotion paraméter null)
    if (isPromotion && !promotion) {
        setPendingPromotion({ from, to }); // Ez nyitja meg a választó UI-t a táblán
        return; // Kilépünk, nem küldjük el a lépést a backendnek, amíg nincs választás
    }

    // 2. LÉPÉS VÉGREHAJTÁSA LOKÁLISAN (Optimista frissítés)
    // Ha nem promóció, vagy már megvan a választott figura, végrehajtjuk.
    // Alapértelmezés 'q' (vezér), ha valami hiba folytán nem érkezne meg a választás.
    const moveAttempt = chess.move({ from, to, promotion: promotion || 'q' });

    if (!moveAttempt) return;

    // UI állapotok alaphelyzetbe állítása
    setPendingPromotion(null);
    setFen(chess.fen());
    setLastMove({ from, to });
    setSelectedSquare(null);
    setValidMoves([]);
    setIsDragging(false);

    // SAJÁT HANGOK LEJÁTSZÁSA
    setTimeout(() => {
        if (chess.isCheckmate()) playSound('checkmate');
        else if (chess.isStalemate() || chess.isDraw()) playSound('stalemate');
        else if (chess.isCheck()) playSound('move-check');
        else if (moveAttempt.flags.includes('k') || moveAttempt.flags.includes('q')) playSound('castle');
        else if (moveAttempt.flags.includes('p')) playSound('promote'); // Promótálás hangja
        else if (moveAttempt.captured) playSound('capture');
        else playSound('move');
    }, 225);

    // 3. SZERVER ÉRTESÍTÉSE
    try {
        // Fontos: A move string most már 5 karakteres lesz, ha van promóció: e7e8q
        const res = await axios.post(`${API_BASE}/move`,
            { 
                game_id: gameId, 
                move: `${from}${to}${promotion || ""}` 
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // BOT VÁLASZÁNAK KEZELÉSE
        setTimeout(() => {
            const bot = res.data.bot_move;
            if (bot && bot.from) {
                setFen(res.data.new_fen);
                setLastMove({ from: bot.from, to: bot.to });

                setTimeout(() => {
                    // BOT HANGOK
                    if (res.data.is_checkmate) playSound('game-end');
                    else if (bot.is_check) playSound('move-check');
                    else if (bot.is_capture) playSound('capture');
                    // Ha a bot promótál (pl. a FEN-ben megjelenik egy 'q' a szélen)
                    else if (res.data.new_fen.includes('q') && (bot.to.endsWith('1') || bot.to.endsWith('8'))) {
                        playSound('promote');
                    }
                    else if (bot.from === 'e8' && (bot.to === 'g8' || bot.to === 'c8')) {
                        playSound('castle');
                    }
                    else playSound('move');
                }, 225);
            }
            // Frissítjük a játék állapotát (reason, history, status)
            fetchGameState(gameId);
        }, 600);

    } catch (err) {
        console.error("Move error:", err);
        fetchGameState(gameId); // Hiba esetén szinkronizálunk a szerverrel
    }
};

    const resetGame = useCallback(() => {
        localStorage.removeItem('chessGameId');
        setGameId(null);
        setHistory([]);
        setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        setStatus("ongoing");
        setViewIndex(-1);
        setLastMove({ from: null, to: null });
    }, []);

const handleResign = async () => {
        if (!window.confirm("Biztosan feladod a játszmát?")) return;
        
        const currentId = gameId;
        playSound('game-end'); 
        
        localStorage.removeItem('chessGameId');
        
        // Optimista UI frissítés
        setStatus("resigned");
        setReason("Black wins by resignation");

        try {
            await axios.post(`${API_BASE}/resign-game`, 
                { game_id: currentId }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Lekérjük a végleges állapotot a szervertől
            await fetchGameState(currentId);
            
        } catch (err) { 
            console.error("Hiba a feladás során:", err);
            setStatus("resigned");
            setReason("Black wins by resignation");
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
                        // Ha közben a státusz megváltozott (pl. feladtuk), állítsuk le
                        if (res.data.status && res.data.status !== "ongoing") {
                            setStatus(res.data.status);
                            clearInterval(interval);
                        }

                        if (res.data.history.length !== history.length) {
                            const newHistory = res.data.history;
                            const latestMove = newHistory[newHistory.length - 1];
                            const m = latestMove.m;

                            setHistory(newHistory);

                            if (newHistory.length % 2 === 0 && latestMove.fen !== fen) {
                                setFen(latestMove.fen);
                                setLastMove({ from: latestMove.from, to: latestMove.to });

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
        executeMove, playSound, token, API_BASE, resetGame, reason, setReason, pendingPromotion, setPendingPromotion
    };
};