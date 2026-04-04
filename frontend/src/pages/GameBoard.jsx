import React, { useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ChessBoardGrid from '../components/ChessBoardGrid';
import MoveListPanel from '../components/MoveListPanel';
import PlaySelectionPanel from '../components/PlaySelectionPanel';
import BotSelectionPanel from '../components/BotSelectionPanel';
import { useChessGame } from '../hooks/useChessGame';
import axios from 'axios';
import { Chess } from 'chess.js';

const GameBoard = () => {
    const gameLogic = useChessGame();
    const [isSelectingBot, setIsSelectingBot] = useState(false);
    const [delayedShowPopup, setDelayedShowPopup] = useState(false);

    const {
        status, history, viewIndex, startNewGame, handleResign, fetchGameState,
        token, gameId, setGameId, setFen, setLastMove, setViewIndex,
        getSquareName, fen, setSelectedSquare, setIsDragging, setHoverSquare,
        setValidMoves, API_BASE, setIsAlert, selectedSquare, validMoves, isDragging,
        setDragOffset, setMousePos, playSound, reason
    } = gameLogic;

    const isGameActive = !!gameId && gameId !== "null";
    const isUIActive = !!gameId && gameId !== "null" && status === "ongoing";
    const isReviewing = status === "resigned" || status === "checkmate";

    // Popup időzítő a játék végén
   useEffect(() => {
    let timer;
    // Csak akkor indítjuk a timert, ha vége a játéknak ÉS még nem látszik a popup
    if (status !== "ongoing" && isGameActive) {
        timer = setTimeout(() => {
            setDelayedShowPopup(true);
        }, 800);
    } else {
        // Ha újra "ongoing" lesz (új játék), azonnal tüntessük el
        setDelayedShowPopup(false);
    }

    return () => {
        if (timer) clearTimeout(timer);
    };
}, [status, isGameActive]); // Ide nem kötelező a setDelayedShowPopup, de a hiba eltűnik tőle

    const playNavigationSound = useCallback((notation) => {
        if (!notation || notation === "start") return;
        setTimeout(() => {
            if (notation.includes('#')) playSound('checkmate');
            else if (notation.includes('+')) playSound('move-check');
            else if (notation.includes('O-O')) playSound('castle');
            else if (notation.includes('x')) playSound('capture');
            else playSound('move');
        }, 50);
    }, [playSound]);

    const goToMove = useCallback((index, isWhiteOnly = false) => {
        setSelectedSquare(null);
        if (index === -1 || index >= history.length - 1) {
            setViewIndex(-1);
            const latest = history[history.length - 1];
            if (latest) {
                setFen(latest.fen);
                setLastMove({ from: latest.from, to: latest.to });
                playNavigationSound(latest.m);
            }
            return;
        }

        const move = history[index];
        if (!move) return;
        playNavigationSound(move.m);
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
    }, [history, setFen, setLastMove, setViewIndex, setSelectedSquare, playNavigationSound]);

const handleMouseDown = async (e, row, col) => {
    // 1. LÉPÉSEK TILTÁSA: Ha nem "ongoing" (tehát resigned vagy checkmate), 
    // vagy ha éppen nem az élő állást nézzük (viewIndex !== -1), akkor ne csináljon semmit.
    if (status !== "ongoing" || viewIndex !== -1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2)
    });
    setMousePos({ x: e.clientX, y: e.clientY });

    // Biztonsági ellenőrzés a gameId-re
    if (!gameId || gameId === "null") return;
    
    const square = getSquareName(row, col);

    // Tábla aktuális állásának feldolgozása a FEN-ből
    const pieces = fen.split(' ')[0].split('/').map(r => {
        const line = [];
        for (let char of r) {
            if (isNaN(char)) line.push(char);
            else for (let i = 0; i < parseInt(char); i++) line.push(null);
        }
        return line;
    });
    const piece = pieces[row] ? pieces[row][col] : null;

    // Ha már ki volt választva egy mező, és egy érvényes célmezőre kattintunk (Move végrehajtása)
    if (selectedSquare && selectedSquare !== square && validMoves.includes(square)) {
        await gameLogic.executeMove(selectedSquare, square);
        return;
    }

    // Új bábu kijelölése (Csak ha a saját bábunk - nagybetűs a FEN-ben)
    if (piece && piece === piece.toUpperCase()) {
        setIsDragging(true);
        setHoverSquare(square);
        
        if (selectedSquare === square) return;
        setSelectedSquare(square);

        try {
            const res = await axios.post(`${API_BASE}/get-valid-moves`,
                { game_id: gameId, square: square },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setValidMoves(res.data.valid_moves || []);
        } catch (err) {
            setValidMoves([]);
        }
    } else {
        // Ha üres mezőre vagy ellenfél bábujára kattintunk, töröljük a kijelölést
        setSelectedSquare(null);
        setValidMoves([]);
        setHoverSquare(null);
    }
};

    const handleMouseUp = async (row, col) => {
        if (!isDragging) return;
        const target = getSquareName(row, col);
        setIsDragging(false);

        if (target === selectedSquare) {
            setHoverSquare(null);
            return;
        }

        if (validMoves.includes(target)) {
            await gameLogic.executeMove(selectedSquare, target);
        } else {
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
            if (!token || status === "resigned") return;
            try {
                const res = await axios.get(`${API_BASE}/get-active-game`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.data.game_id && res.data.game_id !== "null") {
                    setGameId(res.data.game_id);
                    await fetchGameState(res.data.game_id);
                } else {
                    setGameId(null);
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
                    const col = Math.floor((e.clientX - board.left) / (board.width / 8));
                    const row = Math.floor((e.clientY - board.top) / (board.height / 8));
                    if (col >= 0 && col < 8 && row >= 0 && row < 8) setHoverSquare(getSquareName(row, col));
                    else setHoverSquare(null);
                }
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isDragging, getSquareName, setMousePos, setHoverSquare]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const latestIndex = history.length - 1;
            if (e.key === 'ArrowLeft') {
                const currentIdx = viewIndex === -1 ? latestIndex : parseInt(viewIndex);
                if (currentIdx >= 0) goToMove(currentIdx - 1);
            } else if (e.key === 'ArrowRight') {
                if (viewIndex === -1) return;
                const currentIdx = parseInt(viewIndex);
                if (currentIdx >= latestIndex - 1) goToMove(-1);
                else goToMove(currentIdx + 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewIndex, history, goToMove]);

    const renderNotation = (text) => {
        if (!text || text === "start") return "";
        const icons = { 'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘' };
        return icons[text[0]] ? <span className="flex items-center"><span className="text-[1.3em] mr-0.5 leading-none">{icons[text[0]]}</span>{text.substring(1)}</span> : text;
    };

    return (
        <div className="flex justify-center items-center h-screen w-full bg-[#1e1e1e] gap-6 p-4 overflow-hidden select-none relative">
            
            {/* 1. EVALUATION BAR */}
            <div className="w-8 h-170 bg-[#2b2b2b] flex flex-col justify-end overflow-hidden self-center border border-chess-bg shrink-0">
                <div className="bg-white w-full h-[50%] transition-all duration-500 shadow-[0_0_10px_rgba(255,255,255,0.1)]"></div>
            </div>

            {/* 2. TÁBLA SZEKCIÓ */}
            <div className="flex flex-col justify-center items-center h-full shrink-0">
                {/* OPPONENT INFO */}
                <div className="w-170 flex items-center gap-3 px-1 h-12 mb-1 shrink-0">
                    <div className="w-9 h-9 bg-[#2b2a27] rounded-md flex items-center justify-center border border-chess-bg">
                        <i className="fas fa-user text-[#808080] text-xl"></i>
                    </div>
                    <div className="flex flex-col leading-tight">
                        <span className="text-[#bab9b8] font-bold text-[14px]">Opponent</span>
                        <div className="h-4"></div>
                    </div>
                </div>

               {/* BOARD */}
<div className="relative shrink-0 p-0 m-0">
    <div 
        id="chess-board" 
        className="w-170 h-170 bg-[#2b2b2b] relative"
        style={{ 
            // Csak akkor engedünk egeret a táblára, ha tart a játék
            pointerEvents: (status === "ongoing" && viewIndex === -1) ? 'auto' : 'none',
            display: 'block'
        }}
    >
        <ChessBoardGrid 
            gameLogic={gameLogic} 
            onMouseDown={handleMouseDown} 
            onMouseUp={handleMouseUp} 
        />
        
        {/* EXTRA BIZTONSÁGI RÉTEG - Csak akkor látszik, ha NINCS popup */}
        {status !== "ongoing" && !delayedShowPopup && (
            <div 
                className="absolute inset-0 z-4000 bg-transparent cursor-default" 
                onClick={(e) => e.stopPropagation()} 
            />
        )}

        {/* 4. GAME OVER POPUP */}
        <AnimatePresence>
    {delayedShowPopup && (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center z-5000 rounded-sm pointer-events-auto"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                // Adtam hozzá relative-ot a pozicionáláshoz
                className="bg-[#262421] p-10 rounded-3xl text-center border border-chess-bg shadow-[0_20px_50px_rgba(0,0,0,0.6)] max-w-sm w-85 relative"
            >
                {/* BEZÁRÓ GOMB (X) */}
                <button 
                    onClick={() => setDelayedShowPopup(false)}
                    className="absolute top-4 right-5 text-[#989795] hover:text-white transition-colors text-xl"
                >
                    <i className="fas fa-times"></i>
                </button>

                <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-widest">
                    {status === "checkmate" ? "Checkmate" : 
                     status === "resigned" ? "Resigned" : 
                     status === "draw" || status === "stalemate" ? "Draw" : "Game Over"}
                </h1>
                
                <p className="text-[#bab9b8] mb-8 font-semibold italic text-sm">
                    {reason ? reason : (status === "ongoing" ? "" : "Game Over")}
                </p>
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={async () => {
                            setDelayedShowPopup(false);
                            await startNewGame();
                            window.location.reload(); 
                        }} 
                        className="w-full py-4 bg-[#81b64c] text-white rounded-xl text-xl font-bold hover:bg-[#a3d16a] transition-all shadow-lg active:scale-95"
                    >
                        New Game
                    </button>
                    <button 
                        onClick={() => setDelayedShowPopup(false)} 
                        className="w-full py-3 bg-transparent text-[#bab9b8] rounded-xl text-lg font-bold hover:text-white transition-colors cursor-pointer"
                    >
                        Review Game
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )}
</AnimatePresence>
    </div>
</div>

    {/* YOU INFO */}
    <div className="w-170 flex items-center gap-3 px-1 h-12 mt-1 shrink-0">
        <div className="w-9 h-9 bg-[#2b2a27] rounded-md flex items-center justify-center border border-chess-bg">
            <i className="fas fa-user text-[#808080] text-xl"></i>
        </div>
        <div className="flex flex-col leading-tight">
            <span className="text-[#bab9b8] font-bold text-[14px]">You</span>
            <div className="h-4"></div>
        </div>
    </div>
</div>

            {/* 3. JOBB OLDALI PANEL */}
            
            <div className="w-112.5 shrink-0 h-170 self-center flex flex-col">
    {gameId ? (
        <MoveListPanel 
            history={history}
            viewIndex={viewIndex}
            status={status}
            goToMove={goToMove}
            handleResign={handleResign}
            renderNotation={renderNotation}
            startNewGame={startNewGame}
        />
    ) : isSelectingBot ? (
        <BotSelectionPanel 
            onBack={() => setIsSelectingBot(false)} 
            onSelectBot={(difficulty) => {
                startNewGame(difficulty);
                setIsSelectingBot(false);
            }}
        />
    ) : (
        <PlaySelectionPanel 
            onStartGame={startNewGame} 
            onPlayBots={() => setIsSelectingBot(true)}
        />
    )}
</div>

        </div>
    );
};

export default GameBoard;