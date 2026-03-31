import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { AnimatePresence, motion } from 'framer-motion';
import { Chess } from 'chess.js';

const GameBoard = () => {
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
    const [hoverSquare, setHoverSquare] = useState(null); // Melyik mező felett vagyunk épp

    const userId = localStorage.getItem('chessUserId');
    const token = localStorage.getItem('chessToken');

    const getSquareName = (row, col) => {
        const filesArr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        return `${filesArr[col]}${8 - row}`;
    };

    const renderNotation = (text) => {
        if (!text || text === "start") return "";
        const icons = { 'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘' };
        const firstChar = text[0];
        if (icons[firstChar]) {
            return (
                <span className="flex items-center">
                    <span className="text-[1.3em] mr-0.5 leading-none align-middle">
                        {icons[firstChar]}
                    </span>
                    {text.substring(1)}
                </span>
            );
        }
        return text;
    };

    const fetchGameState = useCallback(async (id) => {
        if (!id || id === "null" || !token) return;
        try {
            const res = await axios.get(`${API_BASE}/game/${id}/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.history) {
                setHistory(res.data.history);
                setStatus("ongoing"); 
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
            console.error("Hiba a betöltésnél:", err);
        }
    }, [token]);

    const goToMove = useCallback((index) => {
        if (index >= -1 && index < history.length) {
            setViewIndex(index);
            const move = index === -1 ? history[history.length - 1] : history[index];
            if (move) {
                setFen(move.fen);
                setLastMove({ from: move.from || null, to: move.to || null });
            }
        }
    }, [history]);

    const startNewGame = useCallback(async () => {
        try {
            const res = await axios.post(`${API_BASE}/create-game`,
                { 
                    user_id: userId, 
                    time_category: "rapid", 
                    base_time: 600
                },
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
            console.log("Új játék elindítva, ID elmentve:", newId);
        } catch (err) {
            console.error("Hiba a játék indításakor:", err);
        }
    }, [userId, token]);

    const handleResign = async () => {
        if (!window.confirm("Biztosan feladod a játszmát?")) return;
        localStorage.removeItem('chessGameId');
        const currentId = gameId;
        const currentToken = token;
        setGameId(null);
        setStatus("resigned");
        setValidMoves([]);
        try {
            if (currentId && currentToken) {
                await axios.post(`${API_BASE}/resign-game`, 
                    { game_id: currentId },
                    { headers: { Authorization: `Bearer ${currentToken}` } }
                );
            }
        } catch (err) {
            console.error("Szerver hiba, de helyileg lezártuk.");
        }
    };

    useEffect(() => {
        let isSubscribed = true;
        const initializeGame = async () => {
            if (!token || status === "resigned") return;
            try {
                const res = await axios.get(`${API_BASE}/get-active-game`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!isSubscribed) return;
                if (res.data.game_id && res.data.game_id !== "null") {
                    setGameId(res.data.game_id);
                    localStorage.setItem('chessGameId', res.data.game_id);
                    setStatus("ongoing"); 
                    fetchGameState(res.data.game_id);
                } else {
                    if (!localStorage.getItem('chessGameId')) {
                        console.log("Teljesen tiszta lap, új játék indítása...");
                        startNewGame();
                    }
                }
            } catch (initializeError) {
                console.error("Hiba az inicializáláskor:", initializeError);
            }
        };
        initializeGame();
        return () => { isSubscribed = false; };
    }, [token, status, fetchGameState, startNewGame]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (status === "ongoing" && viewIndex === -1) return;
            if (e.key === "ArrowLeft") {
                const current = viewIndex === -1 ? history.length - 1 : viewIndex;
                if (current > 0) goToMove(current - 1);
            } else if (e.key === "ArrowRight") {
                if (viewIndex !== -1 && viewIndex < history.length - 1) {
                    goToMove(viewIndex + 1);
                } else if (viewIndex !== -1) {
                    goToMove(-1);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [viewIndex, history, status, goToMove]);

    const handleMouseDown = async (e, row, col) => {
    // 1. Koordináták és Offset kiszámítása a "lebegéshez"
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Kiszámoljuk, mennyivel van arrébb az egér a bábu közepétől (ez akadályozza meg az ugrást)
    setDragOffset({
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2)
    });
    
    setMousePos({ x: e.clientX, y: e.clientY });

    const currentId = localStorage.getItem('chessGameId');
    const currentToken = localStorage.getItem('chessToken') || token;
    
    if (!currentId || currentId === "null" || viewIndex !== -1) return;

    const square = getSquareName(row, col);

    // --- LÉPÉSI KÍSÉRLET (Ha már ki volt jelölve valami) ---
    if (selectedSquare) {
        if (validMoves.includes(square)) {
            await executeMove(selectedSquare, square);
            return;
        } 
        
        const gameInstance = new Chess(fen);
        if (gameInstance.inCheck() && square !== selectedSquare) {
             setIsAlert(true);
             setTimeout(() => setIsAlert(false), 400);
        }
    }

    // --- BÁBU KIJELÖLÉSE ÉS EMELÉSE ---
    const fenRows = fen.split(' ')[0].split('/');
    const fullBoard = fenRows.map(r => {
        const line = [];
        for (let char of r) {
            if (isNaN(char)) line.push(char);
            else for (let i = 0; i < parseInt(char); i++) line.push(null);
        }
        return line;
    });

    const piece = fullBoard[row] ? fullBoard[row][col] : null;

    if (piece && status === "ongoing") {
        const isWhitePiece = piece === piece.toUpperCase();
        
        if (isWhitePiece) {
            setSelectedSquare(square);
            setIsDragging(true); // Elindul a lebegtetés
            setHoverSquare(square); // Alapból az aktuális mező a hover
            
            try {
                const res = await axios.post(`${API_BASE}/get-valid-moves`,
                    { game_id: currentId, square: square },
                    { headers: { Authorization: `Bearer ${currentToken}` } }
                );
                setValidMoves(res.data.valid_moves || []);
            } catch (err) {
                console.error("Valid moves hiba:", err);
                setValidMoves([]);
            }
        }
        } else {
            setSelectedSquare(null);
            setValidMoves([]);
            setHoverSquare(null);
        }
    };

        const executeMove = async (from, to) => {
        const currentId = localStorage.getItem('chessGameId');
        const currentToken = localStorage.getItem('chessToken') || token;
        try {
            const res = await axios.post(`${API_BASE}/move`,
                { game_id: currentId, move: `${from}${to}` },
                { headers: { Authorization: `Bearer ${currentToken}` } }
            );
            setFen(res.data.new_fen);
            if (res.data.last_move_from) {
                setLastMove({ from: res.data.last_move_from, to: res.data.last_move_to });
            }
            await fetchGameState(currentId);
            if (res.data.is_checkmate) setStatus("checkmate");
        } catch (err) {
            console.error("Lépési hiba:", err);
        }
        setSelectedSquare(null);
        setValidMoves([]);
        setIsDragging(false);
    };

    useEffect(() => {
    const handleMouseMove = (e) => {
        if (isDragging) {
            setMousePos({ x: e.clientX, y: e.clientY });
            
            // Kiszámoljuk, melyik mező felett vagyunk (getBoundingClientRect segítségével)
            const board = document.getElementById('chess-board').getBoundingClientRect();
            const col = Math.floor((e.clientX - board.left) / (board.width / 8));
            const row = Math.floor((e.clientY - board.top) / (board.height / 8));
            
            if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                setHoverSquare(getSquareName(row, col));
            } else {
                setHoverSquare(null);
            }
        }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isDragging]);

    const handleMouseUp = async (row, col) => {
    if (!isDragging) return;
    const target = getSquareName(row, col);
    
    if (selectedSquare && target !== selectedSquare) {
        if (validMoves.includes(target)) {
            await executeMove(selectedSquare, target);
        } else {
            // Rossz helyre dobta le sakk közben
            const gameInstance = new Chess(fen);
            if (gameInstance.inCheck()) {
                setIsAlert(true);
                setTimeout(() => setIsAlert(false), 400);
            }
            setIsDragging(false);
        }
    } else {
        setIsDragging(false);
    }
};

    const game = new Chess(fen);
    const whiteKingSquare = game.board().flat()
    .find(p => p && p.type === 'k' && p.color === 'w')?.square;

    const renderBoard = () => {
    const board = [];
    const pieces = {
        'r': 'black_rook', 'n': 'black_knight', 'b': 'black_bishop', 'q': 'black_queen', 'k': 'black_king', 'p': 'black_pawn',
        'R': 'white_rook', 'N': 'white_knight', 'B': 'white_bishop', 'Q': 'white_queen', 'K': 'white_king', 'P': 'white_pawn'
    };

    // 1. Fehér király megkeresése (Sakk villanáshoz)
    let whiteKingSquare = null;
    try {
        const gameInstance = new Chess(fen);
        whiteKingSquare = gameInstance.board().flat()
            .find(p => p && p.type === 'k' && p.color === 'w')?.square;
    } catch (e) {
        console.warn("Sakk motor hiba");
    }

    const fenRows = fen.split(' ')[0].split('/');
    const fullBoard = fenRows.map(r => {
        const line = [];
        for (let char of r) {
            if (isNaN(char)) line.push(char);
            else for (let i = 0; i < parseInt(char); i++) line.push(null);
        }
        return line;
    });

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const sqName = getSquareName(i, j);
            const isDark = (i + j) % 2 === 1;
            const piece = fullBoard[i] ? fullBoard[i][j] : null;
            const isSelected = selectedSquare === sqName;
            const isLast = lastMove.from === sqName || lastMove.to === sqName;
            const isValid = validMoves.includes(sqName);
            
            // --- ÚJ SZEGÉLY LOGIKA ---
            let outlineStyle = 'none';
            if (isDragging && selectedSquare) {
                if (sqName === hoverSquare) {
                    if (sqName === selectedSquare) {
                        outlineStyle = '3px solid #E7EDBD'; // Ugyanaz a mező (lebegés alatt)
                    } else {
                        outlineStyle = isDark ? '3px solid #CEDAC3' : '3px solid #F8F8EF'; // Új mező felett
                    }
                }
            }

            // Alapszín beállítása
            let currentBgColor = isDark ? 'bg-chess-dark' : 'bg-chess-light';

            if (isAlert && sqName === whiteKingSquare) {
                currentBgColor = isDark ? 'bg-[#DC2712]' : 'bg-[#FD1D19]';
            } else if (isSelected || isLast) {
                currentBgColor = 'bg-chess-highlight';
            }

            board.push(
                <div 
                    key={sqName} 
                    onMouseDown={(e) => handleMouseDown(e, i, j)} 
                    onMouseUp={() => handleMouseUp(i, j)}
                    className={`w-21.25 h-21.25 flex justify-center items-center relative select-none transition-colors duration-150
                        ${currentBgColor}
                        ${isAlert && sqName === whiteKingSquare ? 'ring-4 ring-inset ring-red-600' : ''}
                        ${piece && status === "ongoing" && viewIndex === -1 ? 'cursor-grab' : 'cursor-default'}`}
                    style={{ 
                        outline: outlineStyle, 
                        outlineOffset: '-3px',
                        zIndex: sqName === hoverSquare ? 30 : 1 
                    }}
                >
                    {/* Érvényes lépés jelző pötty */}
                    {isValid && viewIndex === -1 && !isDragging && (
                        <div className="w-6.5 h-6.5 rounded-full bg-black/15 absolute z-20" />
                    )}

                    {/* Bábu megjelenítése */}
                    {piece && (
                        <motion.img
                            layoutId={isDragging && selectedSquare === sqName ? undefined : `${piece}-${i}-${j}`}
                            key={`${piece}-${i}-${j}`} 
                            src={`/assets/pieces/${pieces[piece]}.png`}
                            alt={piece}
                            draggable="false"
                            animate={isDragging && selectedSquare === sqName ? {
                                scale: 1.15,
                                filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.4))',
                            } : {
                                scale: 1,
                                filter: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
                            }}
                            style={isDragging && selectedSquare === sqName ? {
                                position: 'fixed',
                                left: mousePos.x - dragOffset.x,
                                top: mousePos.y - dragOffset.y,
                                width: '80px',
                                height: '80px',
                                x: '-50%', // Középre igazítás az egérhez képest
                                y: '-50%',
                                pointerEvents: 'none', // Hogy az egér "átlásson" rajta a mezőkre
                                zIndex: 1000,
                            } : {
                                width: '90%',
                                height: '90%',
                                zIndex: 40,
                                position: 'relative'
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 25,
                                mass: 0.8
                            }}
                        />
                    )}
                </div>
            );
        }
    }
    return board;
};

    return (
        <div className="bg-chess-bg min-h-screen text-white font-sans">
            <Navbar />
            <div className="flex justify-center p-10 gap-7.5">
                {/* Board grid container */}
                <div className="w-170 h-170 grid grid-cols-8 border-2 border-chess-board-border relative">
                    {renderBoard()}
                    
                    <AnimatePresence>
                        {status !== "ongoing" && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.5 }} 
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 p-10 rounded-xl z-100 text-center border border-[#454241]"
                            >
                                <h1 className="text-[36px] mb-2.5 font-bold">
                                    {status === "checkmate" ? "Checkmate" : "Game Over"}
                                </h1>
                                <button 
                                    onClick={startNewGame}
                                    className="px-7.5 py-3 bg-[#81b64c] text-white border-none rounded-sm text-[18px] font-bold cursor-pointer hover:bg-[#a3d16a] transition-colors"
                                >
                                    New Game
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Sidebar panel */}
                <div className="w-95 h-170 bg-chess-panel rounded-sm flex flex-col">
                    <div className="p-3.75 bg-chess-panel-header border-b border-chess-bg text-[#bab9b8] text-[14px]">
                        Move List
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2.5 no-scrollbar">
                        {history.filter(m => m.m !== "start").map((move, index) => {
                            const parts = (move.m || "").split(' ');
                            return (
                                <div 
                                    key={index} 
                                    className={`grid grid-cols-[40px_1fr_1fr] p-[8px_0] border-b border-chess-bg items-center
                                        ${index === viewIndex ? 'bg-white/10' : (index % 2 === 0 ? 'bg-white/3' : 'bg-transparent')}`}
                                >
                                    <div className="text-[#666] text-center">{index + 1}.</div>
                                    <div onClick={() => goToMove(index)} className="cursor-pointer font-bold px-1">
                                        {renderNotation(parts[0])}
                                    </div>
                                    <div onClick={() => goToMove(index)} className="cursor-pointer font-bold px-1">
                                        {renderNotation(parts[1])}
                                    </div>
                                </div>
                            );
                        })}
                        {status !== "ongoing" && (
                            <div className="text-center p-5 text-[24px] font-bold">
                                {status === "resigned" ? "0-1" : (status === "checkmate" ? "0-1" : "½-½")}
                            </div>
                        )}
                    </div>

                    {/* Navigation and Action Area */}
                    <div className="mt-auto">
                        {status !== "ongoing" && (
                            <div className="flex justify-center gap-2 p-3.75 bg-[#1b1a18]">
                                <NavButton onClick={() => goToMove(0)} icon="fa-step-backward" />
                                <NavButton onClick={() => goToMove(viewIndex === -1 ? history.length - 2 : viewIndex - 1)} icon="fa-chevron-left" />
                                <NavButton onClick={() => goToMove(-1)} icon="fa-play" />
                                <NavButton onClick={() => goToMove(viewIndex === -1 ? -1 : viewIndex + 1)} icon="fa-chevron-right" />
                                <NavButton onClick={() => goToMove(-1)} icon="fa-step-forward" />
                            </div>
                        )}
                        
                        {status === "ongoing" && (
                             <div className="p-3.75 text-center bg-chess-panel-header">
                                <button 
                                    onClick={handleResign} 
                                    className="px-5 py-2.5 bg-[#454241] text-[#bab9b8] border-none rounded-sm cursor-pointer hover:bg-[#555] transition-colors"
                                >
                                    Resign
                                </button>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NavButton = ({ onClick, icon }) => (
    <button 
        onClick={onClick}
        className="w-15 h-11.25 bg-[#32312f] border-none rounded-lg text-[#bab9b8] text-[18px] cursor-pointer flex justify-center items-center transition-colors hover:bg-[#403f3d]"
    >
        <i className={`fas ${icon}`}></i>
    </button>
);

export default GameBoard;