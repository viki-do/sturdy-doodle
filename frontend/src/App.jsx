import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GameBoard from './pages/GameBoard';
import ProfilePage from './pages/ProfilePage';

const App = () => {
  // Ellenőrizzük, hogy van-e elmentett tokenünk
  const token = localStorage.getItem('chessToken');
  const isAuthenticated = !!token;

  return (
    <Router>
      <Routes>
        {/* Bejelentkezés */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Regisztráció */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Játék felület (csak bejelentkezve) */}
        <Route 
          path="/play" 
          element={isAuthenticated ? <GameBoard /> : <Navigate to="/login" />} 
        />
        
        <Route path="/profile" element={<ProfilePage />} />

        {/* Alapértelmezett átirányítás */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/play" /> : <Navigate to="/login" />} 
        />

        {/* Ha ismeretlen URL-re megy, dobja a főoldalra */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;