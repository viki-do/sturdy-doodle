import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GameBoard from './pages/GameBoard';
import ProfilePage from './pages/ProfilePage';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import GameArchive from './pages/GameArchive';
import AnalyzeBoard from './components/AnalyzeBoard';

const App = () => {
    const token = localStorage.getItem('chessToken');
    const isAuthenticated = !!token;

    return (
        <Router>
            <div className="flex min-h-screen bg-[#1e1e1e]">
                {/* A Navbar csak bejelentkezett felhasználóknak látszik */}
                {isAuthenticated && <Navbar />}

                <main className={`flex-1 ${isAuthenticated ? 'overflow-y-auto h-screen' : ''}`}>
                    <Routes>
                        {/* --- PUBLIKUS ÚTVONALAK --- */}
                        <Route 
                            path="/login" 
                            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/home" />} 
                        />
                        <Route 
                            path="/register" 
                            element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/home" />} 
                        />

                        {/* --- VÉDETT ÚTVONALAK --- */}
                        <Route 
                            path="/home" 
                            element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />} 
                        />
                        <Route 
                            path="/play" 
                            element={isAuthenticated ? <GameBoard /> : <Navigate to="/login" />} 
                        />
                        {/* 2. ÚJ ÚTVONAL AZ ELEMZÉSHEZ */}
                        <Route 
                            path="/analysis" 
                            element={isAuthenticated ? <AnalyzeBoard /> : <Navigate to="/login" />} 
                        />
                
                        
                        {/* 1. Alap Profil oldal (10 játékos nézet + See More) */}
                        <Route 
                            path="/member/:username" 
                            element={isAuthenticated ? <ProfilePage archiveMode={false} /> : <Navigate to="/login" />} 
                        />

                        {/* 2. Kibővített Profil (50 játékos nézet See More után) */}
                        <Route 
                            path="/member/:username/games" 
                            element={isAuthenticated ? <ProfilePage archiveMode={true} /> : <Navigate to="/login" />} 
                        />

                        {/* 3. Teljes Játék Archívum (Külön UI, Home -> Game History-ról ide jutunk) */}
                        <Route 
                            path="/games/archive/:username"
                            element={isAuthenticated ? <GameArchive /> : <Navigate to="/login" />} 
                        />

                        {/* Alapértelmezett átirányítások */}
                        <Route 
                            path="/profile" 
                            element={<Navigate to={`/member/${localStorage.getItem('chessUsername') || 'user'}`} />} 
                        />
                        <Route 
                            path="/" 
                            element={isAuthenticated ? <Navigate to="/home" /> : <Navigate to="/login" />} 
                        />
                    </Routes>
                </main>
            </div>
        </Router>
    );
};

export default App;