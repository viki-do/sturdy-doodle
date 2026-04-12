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
     */
    if (isLoading) {
        console.log("PANEL: Még töltünk, üres képernyő.");
        return <div className="flex-1 bg-[#262421]" />;
    }

    /**
     * 2. LÉPÉS: A döntés
     * JAVÍTÁS: Ha van bármilyen érvényes gameId, akkor a MoveListPanel-t mutatjuk.
     * Ez lehetővé teszi, hogy megnézd a lépéseket akkor is, ha a meccs "aborted" lett.
     */
    if (gameId && gameId !== "null") {
        console.log(`PANEL: Játék észlelve (${status}), MoveListPanel megjelenítése.`);
        return (
            <MoveListPanel 
                {...context} 
                onFlipBoard={() => context.setIsFlipped(!context.isFlipped)} 
            />
        );
    }

    /**
     * 3. LÉPÉS: Alapértelmezett állapot
     * Ha nincs gameId (null), akkor visszatérünk a választóhoz.
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