
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from 'react';
import { useChessGame } from '../hooks/useChessGame';

const ChessContext = createContext();

export const ChessProvider = ({ children }) => {
    // Itt hívjuk meg a hook-ot CSAK EGYSZER az egész appban
    const chess = useChessGame();

    return (
        <ChessContext.Provider value={chess}>
            {children}
        </ChessContext.Provider>
    );
};

// Ezzel a függvénnyel fogjuk elérni az adatokat a komponensekben
export const useChess = () => {
    const context = useContext(ChessContext);
    if (!context) {
        throw new Error("useChess must be used within a ChessProvider");
    }
    return context;
};