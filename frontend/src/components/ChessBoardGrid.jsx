import React from 'react';
import { motion } from 'framer-motion';
import { Chess } from 'chess.js';

const piecesMap = {
    'r': 'black_rook', 'n': 'black_knight', 'b': 'black_bishop', 'q': 'black_queen', 'k': 'black_king', 'p': 'black_pawn',
    'R': 'white_rook', 'N': 'white_knight', 'B': 'white_bishop', 'Q': 'white_queen', 'K': 'white_king', 'P': 'white_pawn'
};

const ChessBoardGrid = ({ gameLogic, onMouseDown, onMouseUp }) => {
    const { fen, selectedSquare, lastMove, validMoves, isDragging, hoverSquare, mousePos, dragOffset, isAlert, status, viewIndex, getSquareName } = gameLogic;

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
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const sqName = getSquareName(i, j);
            const isDark = (i + j) % 2 === 1;
            const piece = fullBoard[i] ? fullBoard[i][j] : null;
            const isSelected = selectedSquare === sqName;
            const isLast = lastMove.from === sqName || lastMove.to === sqName;
            const isValid = validMoves.includes(sqName);

            let outlineStyle = 'none';
            if (isDragging && selectedSquare) {
                if (sqName === hoverSquare) {
                    outlineStyle = sqName === selectedSquare ? '3px solid #E7EDBD' : (isDark ? '3px solid #CEDAC3' : '3px solid #F8F8EF');
                }
            }

            // --- SZÍNLOGIKA FRISSÍTÉSE ---
            let currentBgColor = isDark ? 'bg-chess-dark' : 'bg-chess-light';
            
            if (isAlert && sqName === whiteKingSquare) {
                currentBgColor = isDark ? 'bg-[#DC2712]' : 'bg-[#FD1D19]';
            } 
            else if (isSelected || isLast) {
                // A kért egyedi sárgás-zöldes színek
                currentBgColor = isDark ? 'bg-[#b9cb43]' : 'bg-[#f5f681]';
            }

            boardCells.push(
                <div 
                    key={sqName} 
                    onMouseDown={(e) => onMouseDown(e, i, j)} 
                    onMouseUp={() => onMouseUp(i, j)}
                    className={`w-21.25 h-21.25 flex justify-center items-center relative select-none transition-colors duration-150 ${currentBgColor} ${isAlert && sqName === whiteKingSquare ? 'ring-4 ring-inset ring-red-600' : ''} ${piece && status === "ongoing" && viewIndex === -1 ? 'cursor-grab' : 'cursor-default'}`}
                    style={{ 
                        outline: outlineStyle, 
                        outlineOffset: '-3px', 
                        zIndex: selectedSquare === sqName ? 1000 : (sqName === hoverSquare ? 30 : 1) 
                    }}
                >
                    {/* --- SZÁMOK (Rank) - Dinamikus színnel --- */}
                    {j === 0 && (
                        <span className={`absolute top-0.5 left-1 text-[15px] font-semibold pointer-events-none ${(isSelected || isLast) ? (isDark ? 'text-[#f5f681]' : 'text-[#b9cb43]') : (isDark ? 'text-chess-light' : 'text-chess-dark')}`}>
                            {8 - i}
                        </span>
                    )}

                    {/* --- BETŰK (File) - Dinamikus színnel --- */}
                    {i === 7 && (
                        <span className={`absolute bottom-0.5 right-1 text-[15px] font-semibold pointer-events-none ${(isSelected || isLast) ? (isDark ? 'text-[#f5f681]' : 'text-[#b9cb43]') : (isDark ? 'text-chess-light' : 'text-chess-dark')}`}>
                            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][j]}
                        </span>
                    )}

                    {/* Érvényes lépés pötty */}
                    {isValid && viewIndex === -1 && !isDragging && <div className="w-6.5 h-6.5 rounded-full bg-black/15 absolute z-20" />}
                    
                    {piece && (
                        <motion.img
                            key={`piece-${sqName}-${piece}`}
                            layoutId={isDragging && selectedSquare === sqName ? undefined : `piece-${sqName}`}
                            src={`/assets/pieces/${piecesMap[piece]}.png`}
                            animate={isDragging && selectedSquare === sqName ? { scale: 1.15, filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.4))' } : { scale: 1, filter: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))' }}
                            style={isDragging && selectedSquare === sqName ? { 
                                position: 'fixed', 
                                left: mousePos.x - dragOffset.x, 
                                top: mousePos.y - dragOffset.y, 
                                width: '70px', 
                                height: '70px', 
                                x: '-50%', 
                                y: '-50%', 
                                pointerEvents: 'none', 
                                zIndex: 9999 
                            } : { 
                                width: '90%', 
                                height: '90%', 
                                zIndex: 40, 
                                position: 'relative' 
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.2, duration: 0.06 }}
                        />
                    )}
                </div>
            );
        }
    }
    return <div id="chess-board" className="w-170 h-170 grid grid-cols-8 border-2 border-chess-board-border relative">{boardCells}</div>;
};

export default ChessBoardGrid;