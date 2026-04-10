import React, { useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ChessBoardGrid from '../components/ChessBoardGrid';
import MoveListPanel from '../components/MoveListPanel';
import PlaySelectionPanel from '../components/PlaySelectionPanel';
import BotSelectionPanel from '../components/BotSelectionPanel';
import { useChessGame } from '../hooks/useChessGame.jsx';
import ClockIcon from '../components/ClockIcon';
import axios from 'axios';
import { Chess } from 'chess.js';
import { botCategories } from '../constants/bots.js';
const GameBoard = () => {
    const gameLogic = useChessGame();
    const [isSelectingBot, setIsSelectingBot] = useState(false);
    const [delayedShowPopup, setDelayedShowPopup] = useState(false);
    const [isPopupClosed, setIsPopupClosed] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedTime, setSelectedTime] = useState("No Timer");
    const [currentOpening, setCurrentOpening] = useState(null);
    const [opponent, setOpponent] = useState(null);
    const [previewOpponent, setPreviewOpponent] = useState(null);
    const {

        status, history, viewIndex, startNewGame, handleResign, fetchGameState,
        token, gameId, setGameId, setFen, setLastMove, setViewIndex,
        getSquareName, fen, setSelectedSquare, setIsDragging, setHoverSquare,
        setValidMoves, API_BASE, setIsAlert, selectedSquare, validMoves, isDragging,
        setDragOffset, setMousePos, playSound, reason, pendingPromotion, setPendingPromotion,
        renderNotation, whiteTime, blackTime, activeTimeColor, setBlackTime, setWhiteTime,
        lastTimeControl, executeMove,setHistory
    } = gameLogic;

    // --- ÚJ FÜGGVÉNYEK ---

    const handleSelectionColorChange = (color) => {
        if (color === 'random') {
            setIsFlipped(false);
        } else {
            setIsFlipped(color === 'black');
        }
    };

    const handleClosePopup = () => {
        setDelayedShowPopup(false);
        setIsPopupClosed(true);
        setLastMove({ from: null, to: null });

    };

  const formatSeconds = (totalSeconds) => {
    const total = Math.max(0, Number(totalSeconds) || 0);
    // 2. 10 másodperc ALATT: 0:09.4 formátum (tizedesekkel)

    if (total < 10) {
        const secs = Math.floor(total);
        const tenths = Math.floor((total * 10) % 10);
        return `0:0${secs}.${tenths}`;
    }

    // 3. 10 másodperc FELETT: Sima MM:SS (lefelé kerekítve)
    // A Math.floor biztosítja, hogy ha 50.9 másodperced van, az 50-nek látszódjon.
    // Ez szinkronban lesz a MoveListPanel tizedeseivel.
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
    // Kényszerítsük a baseTime-ot is pontos számra
    const baseTime = Number(config?.base) || 600;
    if (viewIndex === -1) {
        return color === 'w' ? whiteTime : blackTime;
    }
    if (viewIndex === 0 || history[viewIndex]?.m === "start") {
        return baseTime;
    }
    const move = history[viewIndex];
    if (!move) return baseTime;

    // Itt ne kerekítsünk, csak adjuk vissza a nyers számot,
    // a formatSeconds majd elintézi a kerekítést a kijelzőn!
    return color === 'w' ? move.wTime : move.bTime;
};

// GameBoard.jsx belseje
const [analysisData, setAnalysisData] = useState(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);

const handleRunFullAnalysis = async () => {
    if (!gameId || gameId === "null") return;
    setIsAnalyzing(true);
    try {
        // Meghívjuk a te új /analyze-full-game végpontodat
        const res = await axios.post(`${API_BASE}/analyze-full-game/${gameId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setAnalysisData(res.data); // Itt van az accuracy és a summary
        // Frissítjük a history tömböt a kapott elemzési címkékkel
        setHistory(prev => prev.map(h => {
            const moveAnalysis = res.data.analysis.find(a => a.move_number === h.num);
            if (moveAnalysis) {
                return {
                    ...h,
                    analysisLabel: moveAnalysis.label, // pl: "blunder"
                    eval: moveAnalysis.eval,           // pl: -1.2
                    bestMove: moveAnalysis.best_move   // pl: "Nf3"
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

    const isGameActive = !!gameId && gameId !== "null";
    const [isStarting, setIsStarting] = useState(false);
   const handleBotSelect = async (bot, color, time) => {
    setIsStarting(true);
    // Itt a 'bot' egy teljes objektum kell legyen (név, elo, id, img)
    const assignedColor = await startNewGame(bot, color, time);
    if (assignedColor) {
        setOpponent(bot);
        setIsSelectingBot(false);
        setIsFlipped(assignedColor === 'black');
    }
    setIsStarting(false);
};

    useEffect(() => {
        let timer;
        if (status !== "ongoing" && status !== "" && isGameActive) {
            if (!isPopupClosed) {
                timer = setTimeout(() => {
                    setDelayedShowPopup(true);
                }, 500);
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
        const myColor = isFlipped ? 'b' : 'w';
        if (piece && piece.color === myColor) {
            setIsDragging(true);
            setHoverSquare(square);
            setSelectedSquare(square);
            try {
                const res = await axios.post(`${API_BASE}/get-valid-moves`,
                    { game_id: gameId, square: square },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setValidMoves(res.data.valid_moves || []);
            } catch (err) { setValidMoves([]); }
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

    useEffect(() => {
        const initialize = async () => {
            if (!token) return;
            try {
                const res = await axios.get(`${API_BASE}/get-active-game`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.data.game_id) {
                    setGameId(res.data.game_id);
                    setIsFlipped(res.data.player_color === 'black');
                    const botElo = res.data.bot_elo;
                    let bData = null;
                    for (const cat of botCategories) {
                        const found = cat.bots.find(b => b.elo === botElo);
                        if (found) { bData = found; break; }
                    }
                    setOpponent(bData);
                    await fetchGameState(res.data.game_id);
                }
            } catch (e) { setGameId(null); }
        };
        initialize();
    }, [token]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setMousePos({ x: e.clientX, y: e.clientY });
                const board = document.getElementById('chess-board')?.getBoundingClientRect();
                if (board) {
                    let col = Math.floor((e.clientX - board.left) / (board.width / 8));
                    let row = Math.floor((e.clientY - board.top) / (board.height / 8));
                    if (isFlipped) {
                        col = 7 - col;
                        row = 7 - row;
                    }
                    if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                        setHoverSquare(getSquareName(row, col));
                    } else {
                        setHoverSquare(null);
                    }
                }
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
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

            {/* Bal oldali kiértékelő sáv (példa helye) */}

            <div className="w-8 h-170 bg-[#2b2b2b] flex flex-col justify-end border border-chess-bg shrink-0">
                <div className="bg-white w-full h-[50%] transition-all"></div>
            </div>
            <div className="flex flex-col justify-center items-center h-full shrink-0">

                {/* ELLENFÉL SZAKASZ (FENT) */}

                <div className="w-170 flex items-center justify-between px-1 h-12 mb-1 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#2b2a27] rounded-md flex items-center justify-center border border-chess-bg overflow-hidden">
                            {(isSelectingBot ? previewOpponent?.img : opponent?.img) ? (
                                <img src={isSelectingBot ? previewOpponent.img : opponent.img} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <i className="fas fa-robot text-[#808080] text-xl"></i>
                            )}
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-[#bab9b8] font-bold text-[14px] leading-none">
                                {(isSelectingBot ? previewOpponent?.name : opponent?.name) || 'Opponent'}
                            </span>
                            {((isSelectingBot ? previewOpponent : opponent)) && (
                                <span className="text-[#8b8987] text-[11px] font-bold">
                                    ({isSelectingBot ? previewOpponent?.elo : opponent?.elo})
                                </span>
                            )}
                        </div>
                    </div>
                    {/* ELLENFÉL ÓRÁJA */}

                    {(isGameActive || isSelectingBot) && selectedTime !== "No Timer" && (
                        <div className={`px-3 py-1.5 rounded flex items-center justify-between border shadow-lg min-w-35 transition-all duration-300 ${
                            isFlipped ? "bg-white text-[#2b2a27]" : "bg-[#262421] text-white"
                        } ${activeTimeColor === (isFlipped ? 'w' : 'b') && viewIndex === -1 ? "ring-2 ring-[#81b64c] border-transparent" : "border-white/10"}`}>
                            <div className="shrink-0">
                                <ClockIcon
                                    isActive={viewIndex === -1 && activeTimeColor === (isFlipped ? 'w' : 'b')}
                                    currentSeconds={isFlipped ? getDisplayTime('w') : getDisplayTime('b')}
                                />
                            </div>
                            <span className="flex-1 text-right font-sans font-bold text-2xl tabular-nums leading-none ml-2">
                                {formatSeconds(isFlipped ? getDisplayTime('w') : getDisplayTime('b'))}
                            </span>
                        </div>
                    )}
                </div>

                {/* TÁBLA ÉS POPUPOK */}
                <div className="relative shrink-0 p-0 m-0">
                    <div id="chess-board" className="w-170 h-170 bg-[#2b2b2b] relative"
                         style={{ pointerEvents: (status === "ongoing" && viewIndex === -1) ? 'auto' : 'none' }}>
                        <ChessBoardGrid
                            gameLogic={{ ...gameLogic, isFlipped }}
                            onMouseDown={handleMouseDown}
                            onMouseUp={handleMouseUp}
                        />
                        {/* GYALOGÁTVÁLTOZÁS POPUP */}
                        <AnimatePresence>
                            {pendingPromotion && (
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
                        {/* JÁTÉK VÉGE POPUP */}

                        <AnimatePresence>
                            {delayedShowPopup && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center z-9999 rounded-sm pointer-events-auto">
                                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#262421] p-10 rounded-3xl text-center border border-chess-bg shadow-2xl max-w-sm w-85 relative">
                                        <button onClick={handleClosePopup} className="absolute top-4 right-5 text-[#989795] hover:text-white text-xl cursor-pointer">
                                            <i className="fas fa-times"></i>
                                        </button>
                                        <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-widest">
                                            {status === "checkmate" ? "Checkmate" : status === "resigned" ? "Resigned" : status === "aborted" ? "Aborted" : "Game Over"}
                                        </h1>
                                         <p className="text-[#bab9b8] mb-8 font-semibold italic text-sm">
                                            {status === "resigned"
                                                ? (isFlipped ? "White wins by resignation" : "Black wins by resignation")
                                                : (reason || "Match finished")
                                            }
                                         </p>
                                        <div className="flex flex-col gap-3">
                                            <button onClick={() => { setDelayedShowPopup(false); gameLogic.resetGame(); setIsSelectingBot(true); setSelectedTime("No Timer"); }} className="w-full py-4 bg-[#81b64c] text-white rounded-xl text-xl font-bold hover:bg-[#a3d16a] transition-all shadow-lg active:scale-95 cursor-pointer">
                                                New Game
                                            </button>
                                            <button onClick={handleClosePopup} className="w-full py-3 bg-transparent text-[#bab9b8] rounded-xl text-lg font-bold hover:text-white transition-colors cursor-pointer">
                                                Game Review
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                {/* SAJÁT SZAKASZ (LENT) */}

                <div className="w-170 flex items-center justify-between px-1 h-12 mt-1 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#2b2a27] rounded-md flex items-center justify-center border border-chess-bg overflow-hidden">
                            <i className="fas fa-user text-[#808080] text-xl"></i>
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-[#bab9b8] font-bold text-[14px] leading-none">You</span>
                        </div>
                    </div>
                    {(isGameActive || isSelectingBot) && selectedTime !== "No Timer" && (
                        <div className={`px-3 py-1.5 rounded flex items-center justify-between border shadow-lg min-w-35 transition-all duration-300 ${
                            isFlipped ? "bg-[#262421] text-white" : "bg-white text-[#2b2a27]"
                        } ${activeTimeColor === (isFlipped ? 'b' : 'w') && viewIndex === -1 ? "ring-2 ring-[#81b64c] border-transparent" : "border-white/10"}`}>
                            <div className="shrink-0">
                                <ClockIcon
                                    isActive={viewIndex === -1 && activeTimeColor === (isFlipped ? 'b' : 'w')}
                                    currentSeconds={isFlipped ? getDisplayTime('b') : getDisplayTime('w')}
                                />
                            </div>
                            <span className="flex-1 text-right font-sans font-bold text-2xl tabular-nums leading-none ml-2">
                                {formatSeconds(isFlipped ? getDisplayTime('b') : getDisplayTime('w'))}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* OLDALPANEL (MoveList, BotSelection, PlaySelection) */}

            <div className="w-112.5 shrink-0 h-170 self-center flex flex-col">
                {isGameActive ? (
                    <MoveListPanel
                        {...gameLogic}
                        opening={gameLogic.opening}
                        status={status}
                        reason={reason}
                        selectedTime={selectedTime}
                        isPopupClosed={isPopupClosed}
                        isPopupVisible={delayedShowPopup}
                        isFlipped={isFlipped}
                        onFlipBoard={() => setIsFlipped(!isFlipped)}
                        setIsSelectingBot={(val) => {
                            if (val === true) {
                                setSelectedTime("No Timer");
                                gameLogic.resetGame();
                            }
                            setIsSelectingBot(val);
                        }}
                        goToMove={goToMove}
                        handleRunFullAnalysis={handleRunFullAnalysis}
                        analysisData={analysisData}
                        isAnalyzing={isAnalyzing}
                    />
                ) : isSelectingBot ? (
                    <BotSelectionPanel
                        onBack={() => {
                            setSelectedTime("No Timer");
                            setIsSelectingBot(false);
                        }}
                        onSelectBot={handleBotSelect}
                        onTimeChange={handleTimeChange}
                        onColorChange={handleSelectionColorChange}
                        onPreviewChange={setPreviewOpponent}
                    />
                ) : (
                    <PlaySelectionPanel onPlayBots={() => setIsSelectingBot(true)} />
                )}
            </div>
        </div>
    );
};  

export default GameBoard;