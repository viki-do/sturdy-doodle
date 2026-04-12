import React, { useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import BotSelectionPanel from './BotSelectionPanel';
import MoveListPanel from './MoveListPanel';

const BotSelectionOrGame = () => {
    const context = useOutletContext();
    const navigate = useNavigate();

    // Adatok kinyerése a contextből
    const { 
        gameId, 
        status, 
        isLoading, 
        handleBotSelect, 
        handleTimeChange, 
        handleSelectionColorChange, 
        setPreviewOpponent,
        isGameActiveUI 
    } = context;

    // --- DIAGNOSZTIKAI LOGOK ---
    useEffect(() => {
        console.log("=== BotSelectionOrGame Render Log ===");
        console.log("ID:", gameId);
        console.log("Státusz:", status || "üres");
        console.log("Töltés (isLoading):", isLoading);
        console.log("UI Aktív (isGameActiveUI):", isGameActiveUI);
        console.log("=====================================");
    }, [gameId, status, isLoading, isGameActiveUI]);

    /**
     * 1. LÉPÉS: Várakozás
     * Ha a hook (useChessGame) még dolgozik, nem döntünk el semmit.
     */
    if (isLoading) {
        console.log("PANEL: Még töltünk, üres képernyő.");
        return <div className="flex-1 bg-[#262421]" />;
    }

    /**
     * 2. LÉPÉS: A döntés
     * Ha van érvényes gameId és a játék folyamatban van, mehet a MoveList.
     * Az F5 után itt dől el, hogy visszakapod-e a játékot.
     */
    if (gameId && (status === "ongoing" || status === "checkmate" || status === "resigned")) {
        console.log("PANEL: Játék észlelve, MoveListPanel megjelenítése.");
        return (
            <MoveListPanel 
                {...context} 
                onFlipBoard={() => context.setIsFlipped(!context.isFlipped)} 
            />
        );
    }

    /**
     * 3. LÉPÉS: Alapértelmezett állapot
     * Ha nincs játék, akkor a választó panelt mutatjuk.
     */
    console.log("PANEL: Nincs aktív játék, BotSelectionPanel megjelenítése.");
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