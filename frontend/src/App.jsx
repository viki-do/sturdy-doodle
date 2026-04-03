import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GameBoard from './pages/GameBoard';
import ProfilePage from './pages/ProfilePage';
import Navbar from './components/Navbar'; // Ez a vertikális Sidebarod

const App = () => {
    // Ellenőrizzük a tokent az azonosításhoz
    const token = localStorage.getItem('chessToken');
    const isAuthenticated = !!token;

    return (
        <Router>
            <div className="flex min-h-screen bg-[#1e1e1e]">
                {/* 1. GLOBÁLIS SIDEBAR: Csak ha be van jelentkezve */}
                {isAuthenticated && <Navbar />}

                {/* 2. TARTALMI RÉSZ: Ez tölti ki a Sidebar melletti helyet */}
                <main className={`flex-1 ${isAuthenticated ? 'overflow-y-auto h-screen' : ''}`}>
                    <Routes>
                        {/* --- PUBLIKUS ÚTVONALAK --- */}
                        {/* Ha már be van lépve és a loginra menne, dobjuk a játékhoz */}
                        <Route 
                            path="/login" 
                            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/play" />} 
                        />
                        <Route 
                            path="/register" 
                            element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/play" />} 
                        />

                        {/* --- VÉDETT ÚTVONALAK (Csak bejelentkezve) --- */}
                        <Route 
                            path="/play" 
                            element={isAuthenticated ? <GameBoard /> : <Navigate to="/login" />} 
                        />
                        <Route 
                            path="/profile" 
                            element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} 
                        />

                        {/* --- EGYÉB OLDALAK (Opcionális placeholder-ek a Sidebarhoz) --- */}
                        <Route 
                            path="/puzzles" 
                            element={isAuthenticated ? <div className="p-10 text-white text-2xl">Puzzles hamarosan...</div> : <Navigate to="/login" />} 
                        />
                        <Route 
                            path="/learn" 
                            element={isAuthenticated ? <div className="p-10 text-white text-2xl">Tanulás szekció hamarosan...</div> : <Navigate to="/login" />} 
                        />

                        {/* --- REDIRECT LOGIKA --- */}
                        {/* A gyökér könyvtár (/) kezelése */}
                        <Route 
                            path="/" 
                            element={isAuthenticated ? <Navigate to="/play" /> : <Navigate to="/login" />} 
                        />

                        {/* Minden más ismeretlen útvonalat dobjunk vissza a kezdőre */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
};

export default App;