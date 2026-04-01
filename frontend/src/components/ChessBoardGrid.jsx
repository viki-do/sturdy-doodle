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

            let currentBgColor = isDark ? 'bg-chess-dark' : 'bg-chess-light';
            if (isAlert && sqName === whiteKingSquare) currentBgColor = isDark ? 'bg-[#DC2712]' : 'bg-[#FD1D19]';
            else if (isSelected || isLast) currentBgColor = 'bg-chess-highlight';

            boardCells.push(
                <div 
                    key={sqName} 
                    onMouseDown={(e) => onMouseDown(e, i, j)} 
                    onMouseUp={() => onMouseUp(i, j)}
                    className={`w-21.25 h-21.25 flex justify-center items-center relative select-none transition-colors duration-150 ${currentBgColor} ${isAlert && sqName === whiteKingSquare ? 'ring-4 ring-inset ring-red-600' : ''} ${piece && status === "ongoing" && viewIndex === -1 ? 'cursor-grab' : 'cursor-default'}`}
                    style={{ outline: outlineStyle, outlineOffset: '-3px', zIndex: sqName === hoverSquare ? 30 : 1 }}
                >
                    {isValid && viewIndex === -1 && !isDragging && <div className="w-6.5 h-6.5 rounded-full bg-black/15 absolute z-20" />}
                    {piece && (
                        <motion.img
                            layoutId={isDragging && selectedSquare === sqName ? undefined : `${piece}-${i}-${j}`}
                            src={`/assets/pieces/${piecesMap[piece]}.png`}
                            animate={isDragging && selectedSquare === sqName ? { scale: 1.15, filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.4))' } : { scale: 1, filter: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))' }}
                            style={isDragging && selectedSquare === sqName ? { position: 'fixed', left: mousePos.x - dragOffset.x, top: mousePos.y - dragOffset.y, width: '70px', height: '70px', x: '-50%', y: '-50%', pointerEvents: 'none', zIndex: 1000 } : { width: '90%', height: '90%', zIndex: 40, position: 'relative' }}
                            transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
                        />
                    )}
                </div>
            );
        }
    }
    return <div id="chess-board" className="w-170 h-170 grid grid-cols-8 border-2 border-chess-board-border relative">{boardCells}</div>;
};

export default ChessBoardGrid;