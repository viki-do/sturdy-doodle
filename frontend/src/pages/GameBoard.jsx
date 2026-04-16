import React, { useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import ChessBoardGrid from '../components/ChessBoardGrid';
// JAVÍTÁS: useChessGame helyett useChess Context importálása
import { useChess } from '../context/ChessContext';
import ClockIcon from '../components/ClockIcon';
import axios from 'axios';
import { Chess } from 'chess.js';
import { botCategories } from '../constants/bots.js';

const GameBoard = () => {
    
    // --- 1. MINDEN STATE DEKLARÁCIÓ AZ ELEJÉRE ---

    const [isStarting, setIsStarting] = useState(false);
    const [isGameActiveUI, setIsGameActiveUI] = useState(false);
    const [isSelectingBot, setIsSelectingBot] = useState(false);
    const [delayedShowPopup, setDelayedShowPopup] = useState(false);
    const [isPopupClosed, setIsPopupClosed] = useState(false);
    const [selectedTime, setSelectedTime] = useState("No Timer");
    const [currentOpening, setCurrentOpening] = useState(null);
    const [opponent, setOpponent] = useState(null);
    const [isViewingGame, setIsViewingGame] = useState(false);
    const [previewOpponent, setPreviewOpponent] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [analysisData, setAnalysisData] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [userName, setUserName] = useState("You");


    // --- 2. HOOK ÉS NAVIGÁCIÓ ---

    // JAVÍTÁS: useChessGame() helyett useChess() - így a központi állapotot kapod meg
    const gameLogic = useChess(); 
    const navigate = useNavigate();
    const location = useLocation();

    const {
        status, history, viewIndex, startNewGame, handleResign, fetchGameState,
        token, gameId, setGameId, setFen, setLastMove, setViewIndex, isFlipped, setIsFlipped,
        getSquareName, fen, setSelectedSquare, setIsDragging, setHoverSquare,isLoading, initializeGame,
        setValidMoves, API_BASE, setIsAlert, selectedSquare, validMoves, isDragging,
        setDragOffset, setMousePos, playSound, reason, pendingPromotion, setPendingPromotion,
        renderNotation, whiteTime, blackTime, activeTimeColor, setBlackTime, setWhiteTime,
        lastTimeControl, executeMove, setHistory, setSpectatorMode, handleMouseDown, handleMouseUp, 
    } = gameLogic;

    // --- ÚJ FÜGGVÉNYEK ---

    const isGameActive = !!gameId && gameId !== "null";

    // const getInitialTimeDisplay = (timeStr) => {
    //     const config = gameLogic.parseTimeControl(timeStr);
    //     return config.base || 600; // Alapértelmezett 10 perc, ha nincs válaszva
    // };

    useEffect(() => {
    // Bejelentkezéskor elmentett név lekérése
    const storedName = localStorage.getItem('chessUsername'); 
    if (storedName) {
        setUserName(storedName);
    }
    }, []);

    useEffect(() => {
    initializeGame();
    }, [initializeGame]);

// GameBoard.jsx - Az összes UI és Reset logika egyben (JAVÍTOTT)
    useEffect(() => {
    const handleStateSync = async () => {
        if (gameLogic.isLoading) return;

        // 1. HA VAN ÉLŐ JÁTÉK: UI aktiválása és adatok betöltése
        if (gameLogic.gameId && gameLogic.status === "ongoing") {
            setIsGameActiveUI(true);

            if (!opponent) {
                try {
                    const res = await axios.get(`${API_BASE}/get-active-game`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (res.data.game_id) {
                        setIsFlipped(res.data.player_color === 'black');
                        
                        let bData = null;
                        for (const cat of botCategories) {
                            const found = cat.bots.find(b => b.elo === res.data.bot_elo);
                            if (found) { bData = found; break; }
                        }
                        setOpponent(bData);
                    }
                } catch (e) { console.error("Hiba az ellenfél pótlásakor"); }
            }
        } 
        /**
         * 2. TAKARÍTÁS (Főmenüben)
         * CSAK AKKOR takarítunk, ha a /play oldalon vagyunk, 
         * NINCS aktív játék, ÉS nem éppen most indítunk egy újat (isStarting)!
         */
        else if (location.pathname === '/play' && !isStarting) {
            setIsGameActiveUI(false);
            setOpponent(null);
            setPreviewOpponent(null);

            if (gameLogic.gameId && gameLogic.status !== "ongoing") {
                gameLogic.resetGame();
            }
        }
    };

    handleStateSync();
    // Hozzáadtuk az isStarting-ot a függőségi listához is!
    }, [gameLogic.isLoading, gameLogic.gameId, gameLogic.status, location.pathname, isStarting]);

    const handleSelectionColorChange = (color) => {
        if (color === 'random') {
            setIsFlipped(false);
        } else {
            setIsFlipped(color === 'black');
        }
    };

    const handleClosePopup = () => {
        setDelayedShowPopup(false);
        setIsPopupClosed(true); // Ez jelzi a rendszernek, hogy manuálisan bezárták
        setLastMove({ from: null, to: null });
    };

    const formatSeconds = (totalSeconds) => {
        const total = Math.max(0, Number(totalSeconds) || 0);
        if (total < 10) {
            const secs = Math.floor(total);
            const tenths = Math.floor((total * 10) % 10);
            return `0:0${secs}.${tenths}`;
        }
        const roundedTotal = Math.floor(total);
        const hours = Math.floor(roundedTotal / 3600);
        const mins = Math.floor((roundedTotal % 3600) / 60);
        const secs = roundedTotal % 60;
        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getDisplayTime = (color) => {
        const config = gameLogic.parseTimeControl(lastTimeControl);
        const baseTime = Number(config?.base) || 600;
        if (viewIndex === -1) {
            return color === 'w' ? whiteTime : blackTime;
        }
        if (viewIndex === 0 || history[viewIndex]?.m === "start") {
            return baseTime;
        }
        const move = history[viewIndex];
        if (!move) return baseTime;
        return color === 'w' ? move.wTime : move.bTime;
    };

    
    const handlePlayBotsMenuClick = async () => {
    // 1. Megnézzük a hook-ot: van-e érvényes játék ID?
    if (gameLogic.gameId) {
        try {
            // 2. Beállítjuk a UI-t aktívra (tábla feloldása)
            setIsGameActiveUI(true);
            
            // 3. Biztosítjuk az ellenfél adatait (ha esetleg elvesztek volna)
            if (!opponent) {
                const res = await axios.get(`${API_BASE}/get-active-game`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                if (res.data.bot_elo) {
                    let bData = null;
                    for (const cat of botCategories) {
                        const found = cat.bots.find(b => b.elo === res.data.bot_elo);
                        if (found) { bData = found; break; }
                    }
                    setOpponent(bData);
                }
            }
            
            // 4. Navigálunk a bots oldalra (ahol a MoveListPanel lakik)
            navigate('bots'); 
        } catch (err) {
            navigate('bots');
        }
    } else {
        // Ha nincs játék, alaphelyzet és irány a botválasztó
        setIsGameActiveUI(false);
        gameLogic.resetGame();
        navigate('bots');
    }
    };

    const handleRunFullAnalysis = async () => {
    if (!gameId || gameId === "null") return;
    setIsAnalyzing(true);
    try {
        const res = await axios.post(`${API_BASE}/analyze-full-game/${gameId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        setAnalysisData(res.data);
        
        setHistory(prev => prev.map(h => {
            // Megkeressük a backend elemzésében a sorszám alapján (num)
            const moveAnalysis = res.data.analysis.find(a => a.move_number === h.num);
            if (moveAnalysis) {
                return {
                    ...h,
                    analysisLabel: moveAnalysis.label.toLowerCase(), // Ikonok miatt kisbetű!
                    eval: moveAnalysis.eval,
                    bestMove: moveAnalysis.best_move
                };
            }
            return h;
        }));
    } catch (err) {
        console.error("Analysis error:", err);
    } finally {
        setIsAnalyzing(false);
    }
};

    const handleBotSelect = async (bot, color, time) => {
    setIsStarting(true);
    
    // 1. Azonnal mutassuk a botot a fejlécben
    setOpponent(bot); 
    setPreviewOpponent(bot);

    try {
        // 2. Új játék indítása
        const assignedColor = await startNewGame(bot, color, time);
        
        if (assignedColor) {
            // 3. Ha elindult, rögzítsük véglegesre az ellenfelet
            setOpponent(bot);
            setIsSelectingBot(false);
            setIsFlipped(assignedColor === 'black');
            setIsGameActiveUI(true);
        }
    } catch (err) {
        console.error("Hiba indításkor:", err);
    } finally {
        setIsStarting(false);
    }
};

    // JAVÍTOTT POPUP EFFECT
    useEffect(() => {
        let timer;
        // Csak akkor indítjuk a timert, ha vége a játéknak ÉS még nem zárták be kézzel
        if (status !== "ongoing" && status !== "" && isGameActive) {
            if (!isPopupClosed) {
                timer = setTimeout(() => {
                    setDelayedShowPopup(true);
                }, 500);
            } else {
                // Ha manuálisan bezárták, kényszerítjük a láthatóság kikapcsolását
                setDelayedShowPopup(false);
            }
        } else if (status === "ongoing") {
            setDelayedShowPopup(false);
            setIsPopupClosed(false);
        }

        return () => { if (timer) clearTimeout(timer); };
    }, [status, isGameActive, isPopupClosed]);

    const goToMove = useCallback((index, isWhiteOnly = false) => {
        setSelectedSquare(null);
        const playNavSound = (notation) => {
            if (!notation || notation === "start") return;
            if (notation.includes('#')) playSound('checkmate');
            else if (notation.includes('+')) playSound('move-check');
            else if (notation.includes('O-O')) playSound('castle');
            else if (notation.includes('x')) playSound('capture');
            else playSound('move');
        };

        if (index === -1 || index >= history.length - 1) {
            setViewIndex(-1);
            const latest = history[history.length - 1];
            if (latest) {
                setFen(latest.fen);
                setLastMove({ from: latest.from, to: latest.to });
                playNavSound(latest.m);
            }
            return;
        }

        const move = history[index];
        if (!move) return;
        playNavSound(move.m);
        if (isWhiteOnly) {
            const tempChess = new Chess(move.fen);
            const undone = tempChess.undo();
            if (undone) {
                setFen(tempChess.fen());
                setLastMove({ from: undone.from, to: undone.to });
                setViewIndex(index + "_white");
            }
        } else {
            setFen(move.fen);
            setLastMove({ from: move.from, to: move.to });
            setViewIndex(index);
        }
    }, [history, setFen, setLastMove, setViewIndex, setSelectedSquare, playSound]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const currentIdx = viewIndex === -1 ? history.length - 1 : parseInt(viewIndex);
            if (e.key === 'ArrowLeft') {
                if (currentIdx > 0) goToMove(currentIdx - 1);
            } else if (e.key === 'ArrowRight') {
                if (viewIndex !== -1) {
                    if (currentIdx < history.length - 1) goToMove(currentIdx + 1);
                    else goToMove(-1);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewIndex, history, goToMove]);


    useEffect(() => {
    const handleMove = (e) => {
       if (isDragging) {
        // Ha érintés történik, meg kell akadályozni az oldal görgetését!
        if (e.type === 'touchmove' && e.cancelable) {
            e.preventDefault(); 
        }

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // AZONNALI frissítés
        setMousePos({ x: clientX, y: clientY });

            // 2. Tábla pozíciójának lekérése
            const board = document.getElementById('chess-board')?.getBoundingClientRect();
            if (board) {
                let col = Math.floor((clientX - board.left) / (board.width / 8));
                let row = Math.floor((clientY - board.top) / (board.height / 8));

                // Fordított tábla kezelése
                if (isFlipped) {
                    col = 7 - col;
                    row = 7 - row;
                }

                // 3. Ha a táblán belül vagyunk, frissítjük, melyik mező felett állunk
                if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                    const currentSq = getSquareName(row, col);
                    setHoverSquare(currentSq);
                } else {
                    setHoverSquare(null);
                }
            }
        }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });

    return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('touchmove', handleMove);
    };
}, [isDragging, getSquareName, setMousePos, setHoverSquare, isFlipped]);

    const handleTimeChange = (time) => {
        setSelectedTime(time);
        const config = gameLogic.parseTimeControl(time);
        if (config.base) {
            setWhiteTime(config.base);
            setBlackTime(config.base);
        } else {
            setWhiteTime(600);
            setBlackTime(600);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen w-full bg-[#1e1e1e] gap-6 p-4 overflow-hidden select-none relative">
            <div className="w-8 h-170 bg-[#2b2b2b] flex flex-col justify-end border border-chess-bg shrink-0">
                <div className="bg-white w-full h-[50%] transition-all"></div>
            </div>

            <div className="flex flex-col justify-center items-center h-full shrink-0">
            {/* ELLENFÉL ADATAI (Felső sáv) */}
            <div className="w-170 flex items-center justify-between px-1 h-12 mb-1 shrink-0">
                <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#2b2a27] rounded-md flex items-center justify-center border border-chess-bg overflow-hidden">
                    {/* JAVÍTOTT KÉP LOGIKA */}
                    {opponent?.img || previewOpponent?.img ? (
                        <img 
                            src={opponent?.img || previewOpponent?.img} 
                            alt="" 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <i className="fas fa-robot text-[#808080] text-xl"></i>
                    )}
                </div>
                <div className="flex flex-col justify-center">
                    {/* JAVÍTOTT NÉV LOGIKA */}
                    <span className="text-[#bab9b8] font-bold text-[14px] leading-none">
                        {opponent?.name || previewOpponent?.name || 'Opponent'}
                    </span>
                    
                    {/* JAVÍTOTT ELO LOGIKA */}
                    {(opponent?.elo || previewOpponent?.elo) && (
                        <span className="text-[#8b8987] text-[11px] font-bold">
                            ({opponent?.elo || previewOpponent?.elo})
                        </span>
                    )}
                </div>
            </div>

                {/* ELLENFÉL ÓRÁJA */}
                {/* JAVÍTÁS: Csak akkor mutassunk órát, ha van aktív játék VAGY a botválasztó menüben vagyunk */}
                {((isGameActiveUI || location.pathname.includes('/bots')) && 
                selectedTime !== "No Timer" && 
                !location.pathname.includes('/analysis')) && (
                    <div className={`px-3 py-1.5 rounded flex items-center justify-between border shadow-lg min-w-35 transition-all duration-300 ${
                        isFlipped ? "bg-white text-[#2b2a27]" : "bg-[#262421] text-white"
                    } ${activeTimeColor === (isFlipped ? 'w' : 'b') && viewIndex === -1 ? "ring-2 ring-[#81b64c] border-transparent" : "border-white/10"}`}>
                        <div className="shrink-0">
                            <ClockIcon
                                isActive={viewIndex === -1 && activeTimeColor === (isFlipped ? 'w' : 'b')}
                                currentSeconds={isGameActiveUI ? (isFlipped ? getDisplayTime('w') : getDisplayTime('b')) : (gameLogic.parseTimeControl(selectedTime).base || 600)}
                            />
                        </div>
                        <span className="flex-1 text-right font-sans font-bold text-2xl tabular-nums leading-none ml-2">
                            {formatSeconds(isGameActiveUI ? (isFlipped ? getDisplayTime('w') : getDisplayTime('b')) : (gameLogic.parseTimeControl(selectedTime).base || 600))}
                        </span>
                    </div>
                )}
            </div>

            {/* SAKKTÁBLA */}
            <div className="relative shrink-0 p-0 m-0">
                <div id="chess-board" className="w-170 h-170 bg-[#2b2b2b] relative"
                    style={{ pointerEvents: isGameActiveUI ? 'auto' : 'none' }}>
                    <ChessBoardGrid 
                        gameLogic={
                            location.pathname === '/play' 
                                ? { 
                                    ...gameLogic, 
                                    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
                                    isFlipped: false,
                                    lastMove: { from: null, to: null },
                                    validMoves: [],
                                    selectedSquare: null
                                } 
                                : { ...gameLogic, isFlipped }
                        } 
                        onMouseDown={handleMouseDown} 
                        onMouseUp={handleMouseUp} 
                    />

                    <AnimatePresence>
                        {isGameActiveUI && pendingPromotion && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute z-5000 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
                                style={{
                                    left: `${(isFlipped ? (104 - pendingPromotion.to.charCodeAt(0)) : (pendingPromotion.to.charCodeAt(0) - 97)) * 12.5}%`,
                                    top: ((!isFlipped && pendingPromotion.to.endsWith('8')) || (isFlipped && pendingPromotion.to.endsWith('1'))) ? '0' : 'auto',
                                    bottom: ((!isFlipped && pendingPromotion.to.endsWith('1')) || (isFlipped && pendingPromotion.to.endsWith('8'))) ? '0' : 'auto',
                                    width: '12.5%'
                                }}>
                                {['q', 'n', 'r', 'b'].map((type) => (
                                    <button key={type} onClick={() => executeMove(pendingPromotion.from, pendingPromotion.to, type)} className="w-full aspect-square hover:bg-gray-100 p-1 border-b border-gray-100">
                                        <img src={`/assets/pieces/${isFlipped ? 'black' : 'white'}_${type === 'q' ? 'queen' : type === 'n' ? 'knight' : type === 'r' ? 'rook' : 'bishop'}.png`} alt={type} />
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {isGameActiveUI && delayedShowPopup && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center z-9999 rounded-sm pointer-events-auto">
                                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#262421] p-10 rounded-3xl text-center border border-chess-bg shadow-2xl max-w-sm w-85 relative">
                                    <button onClick={handleClosePopup} className="absolute top-4 right-5 text-[#989795] hover:text-white text-xl cursor-pointer">
                                        <i className="fas fa-times"></i>
                                    </button>
                                    <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-widest">{status}</h1>
                                    <p className="text-[#bab9b8] mb-8 font-semibold italic text-sm">{reason || "Match finished"}</p>
                                    <div className="flex flex-col gap-3">
                                        <button onClick={() => { setIsGameActiveUI(false); gameLogic.resetGame(); navigate('/play/bots'); }} className="w-full py-4 bg-[#81b64c] text-white rounded-xl text-xl font-bold hover:bg-[#a3d16a] transition-all shadow-lg cursor-pointer">
                                            New Game
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* SAJÁT ADATOK (Alsó sáv) */}
            <div className="w-170 flex items-center justify-between px-1 h-12 mt-1 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#2b2a27] rounded-md flex items-center justify-center border border-chess-bg overflow-hidden">
                        <i className="fas fa-user text-[#808080] text-xl"></i>
                    </div>
                    <div className="flex flex-col justify-center">
                        {/* JAVÍTÁS: "You" helyett a változó használata */}
                        <span className="text-[#bab9b8] font-bold text-[14px] leading-none">
                            {userName}
                        </span>
                    </div>
                </div>

                {/* SAJÁT ÓRA */}
                {/* JAVÍTÁS: Itt is ugyanaz a feltétel, /play alatt ne legyen óra válogatás közben se */}
                {((isGameActiveUI || location.pathname.includes('/bots')) && 
                selectedTime !== "No Timer" && 
                !location.pathname.includes('/analysis')) && (
                    <div className={`px-3 py-1.5 rounded flex items-center justify-between border shadow-lg min-w-35 transition-all duration-300 ${
                        isFlipped ? "bg-[#262421] text-white" : "bg-white text-[#2b2a27]"
                    } ${activeTimeColor === (isFlipped ? 'b' : 'w') && viewIndex === -1 ? "ring-2 ring-[#81b64c] border-transparent" : "border-white/10"}`}>
                        <div className="shrink-0">
                            <ClockIcon
                                isActive={viewIndex === -1 && activeTimeColor === (isFlipped ? 'b' : 'w')}
                                currentSeconds={isGameActiveUI ? (isFlipped ? getDisplayTime('b') : getDisplayTime('w')) : (gameLogic.parseTimeControl(selectedTime).base || 600)}
                            />
                        </div>
                        <span className="flex-1 text-right font-sans font-bold text-2xl tabular-nums leading-none ml-2">
                            {formatSeconds(isGameActiveUI ? (isFlipped ? getDisplayTime('b') : getDisplayTime('w')) : (gameLogic.parseTimeControl(selectedTime).base || 600))}
                        </span>
                    </div>
                )}
            </div>
        </div>

            <div className="w-112.5 shrink-0 h-170 self-center flex flex-col">
                <Outlet context={{ 
                ...gameLogic, 
                gameId: gameLogic.gameId,
                status: gameLogic.status,
                isLoading: gameLogic.isLoading,
                isGameActiveUI, 
                setIsGameActiveUI, 
                opponent, // EZ KELL IDE!
                setOpponent,
                isFlipped,
                setIsFlipped,
                handleBotSelect, // A GameBoard-os verzió
                handlePlayBotsMenuClick,
                handleTimeChange,
                handleSelectionColorChange,
                setPreviewOpponent,
                isPopupClosed,
                setIsPopupClosed,
                setIsPopupVisible:delayedShowPopup,
                handleRunFullAnalysis, // <--- EZ HIÁNYZOTT
                analysisData,          // <--- EZ HIÁNYZOTT
                isAnalyzing,
            }} />
            </div>
        </div>
    );
}; 

export default GameBoard;