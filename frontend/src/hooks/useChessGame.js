import { useState,  useCallback } from 'react';
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
                setHistory(res.data.history);
                setStatus("ongoing"); 
                setViewIndex(-1); 
                if (res.data.history.length > 0) {
                    const latest = res.data.history[res.data.history.length - 1];
                    setFen(latest.fen);
                    if (latest.from && latest.to) setLastMove({ from: latest.from, to: latest.to });
                }
            }
        } catch (err) { console.error(err); }
    }, [token]);

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
        } catch (err) { console.error(err); }
    }, [userId, token]);

    const executeMove = async (from, to) => {
        try {
            const res = await axios.post(`${API_BASE}/move`,
                { game_id: gameId, move: `${from}${to}` },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setFen(res.data.new_fen);
            if (res.data.last_move_from) setLastMove({ from: res.data.last_move_from, to: res.data.last_move_to });
            await fetchGameState(gameId);
            if (res.data.is_checkmate) setStatus("checkmate");
        } catch (err) { console.error(err); }
        setSelectedSquare(null);
        setValidMoves([]);
        setIsDragging(false);
    };

    const handleResign = async () => {
        if (!window.confirm("Biztosan feladod a játszmát?")) return;
        localStorage.removeItem('chessGameId');
        const currentId = gameId;
        setGameId(null);
        setStatus("resigned");
        try {
            await axios.post(`${API_BASE}/resign-game`, { game_id: currentId }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (err) { console.error(err); }
    };

    return {
        gameId, fen, selectedSquare, validMoves, lastMove, history, status, isDragging, viewIndex, isAlert, mousePos, dragOffset, hoverSquare,
        setFen, setSelectedSquare, setValidMoves, setLastMove, setHistory, setStatus, setIsDragging, setViewIndex, setIsAlert, setMousePos, setDragOffset, setHoverSquare,
        getSquareName, fetchGameState, startNewGame, handleResign, executeMove, token, API_BASE
    };
};