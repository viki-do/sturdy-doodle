import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import MoveListPanel from './MoveListPanel';
import BotSelectionPanel from './BotSelectionPanel';

const BotSelectionOrGame = () => {
    const context = useOutletContext();
    const navigate = useNavigate();
    
    // Csak azokat a változókat destruktúráljuk, amikre tényleg szükség van itt a döntéshez
    const { 
        gameId, 
        isGameActiveUI, 
        history, 
        status,
        handleBotSelect,
        handleTimeChange,
        handleSelectionColorChange,
        setPreviewOpponent
    } = context;

    // Definiáljuk a játék végét jelző állapotokat
    const isGameOver = ["resigned", "checkmate", "draw", "stalemate", "aborted", "finished"].includes(status);
    
    // A DÖNTÉS: Maradjunk a MoveListPanelen, ha:
    // 1. Van érvényes játék ID
    // 2. A játék fut VAGY vége van
    // 3. A UI aktív állapotban van (vagy már vannak lépések a history-ban)
    const shouldShowMoveList = gameId && (status === "ongoing" || isGameOver) && (isGameActiveUI || (history && history.length > 1));

    if (shouldShowMoveList) {
        return (
            <MoveListPanel 
                {...context} // Átadjuk az összes adatot a panelnek (benne a gameLogic-ot is)
            />
        );
    }

    // Ha nincs aktív/befejezett meccs megjelenítés alatt, jöhet a bot lista
    return (
        <BotSelectionPanel 
            onBack={() => navigate('/play')}
            onSelectBot={handleBotSelect}
            onTimeChange={handleTimeChange}
            onColorChange={handleSelectionColorChange}
            onPreviewChange={setPreviewOpponent}
        />
    );
};

export default BotSelectionOrGame;