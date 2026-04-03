import React from 'react';
// JAVÍTÁS: AnimatePresence hozzáadva az importhoz
import { motion, AnimatePresence } from 'framer-motion';
import { Chess } from 'chess.js';

const piecesMap = {
    'r': 'black_rook', 'n': 'black_knight', 'b': 'black_bishop', 'q': 'black_queen', 'k': 'black_king', 'p': 'black_pawn',
    'R': 'white_rook', 'N': 'white_knight', 'B': 'white_bishop', 'Q': 'white_queen', 'K': 'white_king', 'P': 'white_pawn'
};

const ChessBoardGrid = ({ gameLogic, onMouseDown, onMouseUp }) => {
    const { 
        fen, selectedSquare, lastMove, validMoves, isDragging, 
        hoverSquare, mousePos, isAlert, status, 
        viewIndex, getSquareName 
    } = gameLogic;

    let whiteKingSquare = null;
    try {
        const gameInstance = new Chess(fen);
        whiteKingSquare = gameInstance.board().flat().find(p => p && p.type === 'k' && p.color === 'w')?.square;
    } catch (error) { console.warn(error); }

    const fenRows = fen.split(' ')[0].split('/');
    const fullBoard = fenRows.map(r => {
        const line = [];
        for (let char of r) {
            if (isNaN(char)) line.push(char);
            else for (let i = 0; i < parseInt(char); i++) line.push(null);
        }
        return line;
    });

    const boardCells = [];
    let draggedPieceData = null;

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const sqName = getSquareName(i, j);
            const isDark = (i + j) % 2 === 1;
            const piece = fullBoard[i] ? fullBoard[i][j] : null;
            const isSelected = selectedSquare === sqName;
            const isLast = lastMove.from === sqName || lastMove.to === sqName;
            const isValid = validMoves.includes(sqName);

            // Hover kiemelés
            let outlineStyle = 'none';
            if (isDragging && selectedSquare && sqName === hoverSquare) {
                outlineStyle = sqName === selectedSquare ? '3px solid #E7EDBD' : (isDark ? '3px solid #CEDAC3' : '3px solid #F8F8EF');
            }

            // Színlogika
            let currentBgColor = isDark ? 'bg-chess-dark' : 'bg-chess-light';
            if (isAlert && sqName === whiteKingSquare) {
                currentBgColor = isDark ? 'bg-[#DC2712]' : 'bg-[#FD1D19]';
            } else if (isSelected || isLast) {
                currentBgColor = isDark ? 'bg-[#b9cb43]' : 'bg-[#f5f681]';
            }

            // Ha ezt a bábut húzzuk, elmentjük az adatait
            if (isDragging && selectedSquare === sqName && piece) {
                draggedPieceData = { piece, i, j };
            }

            boardCells.push(
                <div 
                    key={sqName} 
                    onMouseDown={(e) => onMouseDown(e, i, j)} 
                    onMouseUp={() => onMouseUp(i, j)}
                    className={`w-21.25 h-21.25 flex justify-center items-center relative select-none transition-colors duration-150 ${currentBgColor} ${piece && status === "ongoing" && viewIndex === -1 ? 'cursor-grab' : 'cursor-default'}`}
                    style={{ 
                        outline: outlineStyle, 
                        outlineOffset: '-3px',
                        zIndex: sqName === hoverSquare ? 30 : 1 
                    }}
                >
                    {/* Számok */}
                    {j === 0 && (
                        <span className={`absolute top-0.5 left-1 text-[15px] font-semibold pointer-events-none ${(isSelected || isLast) ? (isDark ? 'text-[#f5f681]' : 'text-[#b9cb43]') : (isDark ? 'text-chess-light' : 'text-chess-dark')}`}>
                            {8 - i}
                        </span>
                    )}

                    {/* Betűk */}
                    {i === 7 && (
                        <span className={`absolute bottom-0.5 right-1 text-[15px] font-semibold pointer-events-none ${(isSelected || isLast) ? (isDark ? 'text-[#f5f681]' : 'text-[#b9cb43]') : (isDark ? 'text-chess-light' : 'text-chess-dark')}`}>
                            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][j]}
                        </span>
                    )}

                    {/* Érvényes lépés jelzése (Pötty vagy Kör) */}
                    {isValid && viewIndex === -1 && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            {piece ? (
                                /* ÜTÉS: Nagy üres kör a bábu körül */
                                <div className="w-[90%] h-[90%] border-[7px] border-black/15 rounded-full" />
                            ) : (
                                /* SIMA LÉPÉS: Kis teli pötty középen */
                                <div className="w-6.5 h-6.5 rounded-full bg-black/15" />
                            )}
                        </div>
                    )}

                    {/* Bábuk renderelése animációval */}
                    {/* Bábuk renderelése a ciklusban */}
{piece && (!isDragging || selectedSquare !== sqName) && (
    <motion.img
        // JAVÍTÁS: A layoutId legyen FIXEN a mező neve. 
        // Így a React nem akarja újratölteni a képet, csak animálja a változást.
        layout
        layoutId={`sq-${sqName}`} 
        key={`piece-${sqName}-${piece}`} 
        src={`/assets/pieces/${piecesMap[piece]}.png`}
        draggable="false"
        className="w-[90%] h-[90%] relative z-40"
        
        // --- HAJSZÁLPONTOS 0.20 MÁSODPERC ---
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
            type: "tween",
            ease: "easeOut",
            duration: 0.20 
        }}
    />
)}
                </div>
            );
        }
    }

    return (
        <div id="chess-board" className="w-170 h-170 grid grid-cols-8 border-2 border-chess-board-border relative z-0">
            {boardCells}

            <AnimatePresence>
                {isDragging && draggedPieceData && (
                    <motion.img
                        key="dragging-piece"
                        src={`/assets/pieces/${piecesMap[draggedPieceData.piece]}.png`}
                        draggable="false"
                        style={{ 
                            position: 'fixed', 
                            left: mousePos.x, 
                            top: mousePos.y, 
                            width: '72px', 
                            height: '72px', 
                            x: '-50%', 
                            y: '-50%', 
                            pointerEvents: 'none', 
                            zIndex: 99999, 
                            filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.4))'
                        }}
                        initial={false}
                        animate={{ scale: 1.1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChessBoardGrid;