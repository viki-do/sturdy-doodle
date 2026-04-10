import React, { useEffect, useCallback, useState } from 'react';
import ChessBoardGrid from '../components/ChessBoardGrid';
import MoveListPanel from '../components/MoveListPanel';
import { useChessGame } from '../hooks/useChessGame.jsx';
import axios from 'axios';
import { Chess } from 'chess.js';

const AnalyzeBoard = () => {
    const gameLogic = useChessGame();
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const {
        history, viewIndex, setFen, setLastMove, setViewIndex,
        getSquareName, fen, setSelectedSquare, setValidMoves, API_BASE,
        selectedSquare, validMoves, isDragging, setHistory, playSound,
        token, renderNotation, setStatus, setOpening
    } = gameLogic;

    // --- AZONNALI ELEMZÉS LÉPÉSENKÉNT ---
    const executeAnalysisMove = async (from, to, promotion = 'q') => {
        const chess = new Chess(fen);
        const fenBefore = fen;
        const prevEval = history.length > 0 ? (history[history.length - 1].rawEval || 30) : 30;

        const moveAttempt = chess.move({ from, to, promotion });
        if (!moveAttempt) return;

        // 1. Frissítjük a táblát azonnal (UI válaszsebesség)
        const newFen = chess.fen();
        setFen(newFen);
        setLastMove({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);

        // 2. Meghívjuk a backendet az elemzésért
        setIsAnalyzing(true);
        try {
            // Itt a sandbox végpontot hívjuk, amit a game.py-hoz adtunk/adunk
            const res = await axios.post(`${API_BASE}/analyze-sandbox-move`, {
                fen_before: fenBefore,
                move: moveAttempt.san,
                prev_eval: prevEval
            }, { headers: { Authorization: `Bearer ${token}` } });

            const analysisEntry = {
                num: history.length,
                m: moveAttempt.san,
                from, to,
                fen: newFen,
                analysisLabel: res.data.label, // !! vagy ? stb.
                eval: res.data.eval / 100,
                rawEval: res.data.eval,
                bestMove: res.data.best_move,
                t: 0 // Elemző módban nincs időkényszer
            };

            setHistory(prev => [...prev, analysisEntry]);
            if (res.data.opening) setOpening(res.data.opening);

            // Hang lejátszása az értékelés alapján
            if (res.data.label === "brilliant") playSound('castle'); // Vagy egyedi hang
            else if (moveAttempt.captured) playSound('capture');
            else playSound('move');

        } catch (err) {
            console.error("Analysis failed", err);
            // Ha a sandbox végpont még nincs kész, csak simán adjuk hozzá a history-hoz
            setHistory(prev => [...prev, { m: moveAttempt.san, from, to, fen: newFen, num: prev.length }]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Módosított handleMouseDown: nem korlátozzuk a színt, bárki léphet
    const handleMouseDown = async (e, row, col) => {
        const square = getSquareName(row, col);
        const chess = new Chess(fen);
        const piece = chess.get(square);

        if (selectedSquare && selectedSquare !== square && validMoves.includes(square)) {
            await executeAnalysisMove(selectedSquare, square);
            return;
        }

        // Csak akkor jelöljük ki, ha az ő színe jön
        if (piece && piece.color === chess.turn()) {
            setSelectedSquare(square);
            try {
                // Szabályos lépések lekérése a backendtől vagy chess.js-től
                const moves = chess.moves({ square, verbose: true }).map(m => m.to);
                setValidMoves(moves);
            } catch (err) { setValidMoves([]); }
        } else {
            setSelectedSquare(null);
            setValidMoves([]);
        }
    };

    const handleMouseUp = async (row, col) => {
        if (!selectedSquare) return;
        const target = getSquareName(row, col);
        if (target === selectedSquare) return;
        if (validMoves.includes(target)) {
            await executeAnalysisMove(selectedSquare, target);
        } else {
            setSelectedSquare(null);
            setValidMoves([]);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen w-full bg-[#1e1e1e] gap-6 p-4 overflow-hidden select-none relative">
            {/* Tábla szekció */}
            <div className="flex flex-col justify-center items-center h-full shrink-0">
                <div className="w-170 flex items-center justify-between px-1 h-8 mb-1">
                    <span className="text-[#8b8987] font-bold text-sm uppercase tracking-wider">Analysis Mode</span>
                </div>

                <div className="relative shrink-0">
                    <div id="chess-board" className="w-170 h-170 bg-[#2b2b2b] relative">
                        <ChessBoardGrid
                            gameLogic={{ ...gameLogic, isFlipped }}
                            onMouseDown={handleMouseDown}
                            onMouseUp={handleMouseUp}
                        />
                    </div>
                </div>
                
                <div className="w-170 h-8 mt-1"></div>
            </div>

            {/* Oldalpanel - MoveListPanel */}
            <div className="w-112.5 shrink-0 h-170 self-center flex flex-col">
                <MoveListPanel
                    {...gameLogic}
                    status="analysis" // Speciális státusz a panelnek
                    isPopupClosed={true}
                    isPopupVisible={false}
                    isFlipped={isFlipped}
                    onFlipBoard={() => setIsFlipped(!isFlipped)}
                    goToMove={(idx) => {
                        const move = history[idx];
                        if (move) {
                            setFen(move.fen);
                            setLastMove({ from: move.from, to: move.to });
                            setViewIndex(idx);
                        } else if (idx === -1) {
                            setViewIndex(-1);
                            setFen(history[history.length-1]?.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                        }
                    }}
                    isAnalyzing={isAnalyzing}
                />
            </div>
        </div>
    );
};

export default AnalyzeBoard;