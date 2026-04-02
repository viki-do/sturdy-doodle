import React, { useEffect,useCallback} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import ChessBoardGrid from '../components/ChessBoardGrid';
import MoveListPanel from '../components/MoveListPanel';
import { useChessGame } from '../hooks/useChessGame';
import axios from 'axios';
import { Chess } from 'chess.js';

const GameBoard = () => {
    const gameLogic = useChessGame();
    
    const { 
        status, history, viewIndex, startNewGame, handleResign, fetchGameState,
        token, gameId, setGameId, setFen, setLastMove, setViewIndex, 
        getSquareName, fen, setSelectedSquare, setIsDragging, setHoverSquare, 
        setValidMoves, API_BASE, playSound, setIsAlert, selectedSquare, validMoves, isDragging,
        setDragOffset, setMousePos
    } = gameLogic;

    // --- NAVIGATION ---
    
    // --- NAVIGATION (useCallback-be csomagolva) ---
    const goToMove = useCallback((index, isWhiteOnly = false) => {
        setSelectedSquare(null); // Kijelölés törlése navigációkor

        // Ha az index -1, vagy elértük az utolsó lépést, váltsunk ÉLŐ módba
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
        if (!move) return;

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
    }, [history, setFen, setLastMove, setViewIndex, setSelectedSquare]); 
    // --- MOUSE HANDLERS (Ez hiányzott a legutóbb!) ---
    const handleMouseDown = async (e, row, col) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({ x: e.clientX - (rect.left + rect.width / 2), y: e.clientY - (rect.top + rect.height / 2) });
        setMousePos({ x: e.clientX, y: e.clientY });

        if (!gameId || gameId === "null" || viewIndex !== -1) return;
        const square = getSquareName(row, col);

        const pieces = fen.split(' ')[0].split('/').map(r => {
            const line = [];
            for (let char of r) { 
                if (isNaN(char)) line.push(char); 
                else for (let i = 0; i < parseInt(char); i++) line.push(null); 
            }
            return line;
        });
        const piece = pieces[row] ? pieces[row][col] : null;

        if (selectedSquare && validMoves.includes(square)) {
            await gameLogic.executeMove(selectedSquare, square);
            return;
        }

        if (piece && status === "ongoing" && piece === piece.toUpperCase()) {
            setSelectedSquare(square); setIsDragging(true); setHoverSquare(square);
            try {
                const res = await axios.post(`${API_BASE}/get-valid-moves`, { game_id: gameId, square: square }, { headers: { Authorization: `Bearer ${token}` } });
                setValidMoves(res.data.valid_moves || []);
            } catch (err) { setValidMoves([]); }
        } else {
            if (selectedSquare && square !== selectedSquare) {
                playSound('illegal');
                setIsAlert(true);
                setTimeout(() => setIsAlert(false), 400);
            }
            setSelectedSquare(null); setValidMoves([]); setHoverSquare(null);
        }
    };

    const handleMouseUp = async (row, col) => {
    if (!isDragging) return;
    
    const target = getSquareName(row, col);
    setIsDragging(false); // Azonnal állítsuk le a vizuális húzást

    // 1. ESET: Saját magára ejtettük vissza (Meggondoltuk magunkat)
    if (target === selectedSquare) {
        setHoverSquare(null);
        return;
    }

    // 2. ESET: Érvényes lépés mezőre ejtettük (Végrehajtás)
    if (validMoves.includes(target)) {
        await gameLogic.executeMove(selectedSquare, target);
    } 
    // 3. ESET: Érvénytelen mezőre ejtettük
    else {
        // Itt a titok: NEM játszunk hangot és NEM adunk riasztást.
        // Egyszerűen csak nullázzuk a kijelöléseket.
        setSelectedSquare(null);
        setValidMoves([]);
        setHoverSquare(null);
        
        // Csak akkor adjunk hibaüzenetet/hangot, ha a felhasználó olyat akart ütni, amit nem szabad
        // vagy ha kifejezetten "lépni" próbált egy nem szomszédos, de érvénytelen helyre.
        // Ha ezt is el akarod hagyni, hagyd üresen ezt a részt.
    }
};

    // --- INITIALIZATION ---
    useEffect(() => {
        const initialize = async () => {
            if (!token || status === "resigned") return;
            try {
                const res = await axios.get(`${API_BASE}/get-active-game`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.data.game_id && res.data.game_id !== "null") {
                    setGameId(res.data.game_id); 
                    await fetchGameState(res.data.game_id);
                } else {
                    await startNewGame();
                }
            } catch (e) {
                localStorage.removeItem('chessGameId');
                await startNewGame();
            }
        };
        initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // --- MOUSE MOVE TRACKING ---
useEffect(() => {
    const handleMouseMove = (e) => {
        if (isDragging) {
            // Frissítjük az egér pozícióját a Hook-ban
            setMousePos({ x: e.clientX, y: e.clientY });

            // Kiszámoljuk, melyik mező felett járunk éppen a keret kiemeléshez
            const board = document.getElementById('chess-board')?.getBoundingClientRect();
            if (board) {
                const col = Math.floor((e.clientX - board.left) / (board.width / 8));
                const row = Math.floor((e.clientY - board.top) / (board.height / 8));
                
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
}, [isDragging, getSquareName, setMousePos, setHoverSquare]);

    // --- KEYBOARD NAVIGATION ---
// --- KEYBOARD NAVIGATION ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const latestIndex = history.length - 1;

            if (e.key === 'ArrowLeft') {
                const currentIdx = viewIndex === -1 ? latestIndex : parseInt(viewIndex);
                if (currentIdx >= 0) {
                    goToMove(currentIdx - 1);
                }
            } else if (e.key === 'ArrowRight') {
                if (viewIndex === -1) return;
                const currentIdx = parseInt(viewIndex);
                if (currentIdx >= latestIndex - 1) {
                    goToMove(-1);
                } else {
                    goToMove(currentIdx + 1);
                }
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
        <div className="bg-chess-bg min-h-screen text-white font-sans">
            <Navbar />
            <div className="flex justify-center p-10 gap-7.5">
                <div className="relative">
                    {/* Itt adjuk át a hiányzó handlereket a Gridnek! */}
                    <ChessBoardGrid 
                        gameLogic={gameLogic} 
                        onMouseDown={handleMouseDown} 
                        onMouseUp={handleMouseUp} 
                    />
                    
                    <AnimatePresence>
                    {status !== "ongoing" && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            // Itt a z-indexet emeld meg 1000-re vagy legalább 500-ra
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 p-10 rounded-xl z-1000 text-center border border-[#454241] shadow-2xl"
                        >
                            <h1 className="text-[36px] mb-2.5 font-bold">
                                {status === "checkmate" ? "Checkmate" : "Game Over"}
                            </h1>
                            <button 
                                onClick={startNewGame} 
                                className="px-7.5 py-3 bg-[#81b64c] text-white rounded-sm text-[18px] font-bold hover:bg-[#a3d16a] transition-colors"
                            >
                                New Game
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
                </div>

                <MoveListPanel 
                    history={history}
                    viewIndex={viewIndex}
                    status={status}
                    goToMove={goToMove}
                    handleResign={handleResign}
                    renderNotation={renderNotation}
                />
            </div>
        </div>
    );
};

export default GameBoard;