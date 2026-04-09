import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const ProfilePage = ({ archiveMode = false }) => {
    const { username: urlUsername } = useParams();
    const navigate = useNavigate();
    
    const [user, setUser] = useState({ username: '', email: '', provider: '', joined: 'Apr 8, 2026' });
    const [history, setHistory] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedGameType, setSelectedGameType] = useState("All Recent Games");
    const [isResultOpen, setIsResultOpen] = useState(false);
    const [selectedResult, setSelectedResult] = useState("Any Result");
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [dropdownDirection, setDropdownDirection] = useState('down');
    const resultButtonRef = useRef(null);
    const [showStartDate, setShowStartDate] = useState(false);
    const [showEndDate, setShowEndDate] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const token = localStorage.getItem('chessToken');
    const API_BASE = "http://localhost:8000";
    const gameTypes = ["All Recent Games", "Daily Games", "Live Games", "Live Chess 960", "Bughouse", "3 Check", "Crazyhouse", "King of the Hill"];
    
    const resultOptions = [
        { label: "Any Result", type: "main" },
        { label: "Won", type: "header" },
        { label: "Won By timeout", type: "sub" },
        { label: "Won By checkmate", type: "sub" },
        { label: "Won By resignation", type: "sub" },
        { label: "Won By abandonment", type: "sub" },
        { label: "Lost", type: "header" },
        { label: "Lost By timeout", type: "sub" },
        { label: "Lost By checkmate", type: "sub" },
        { label: "Lost By resignation", type: "sub" },
        { label: "Lost By abandonment", type: "sub" },
        { label: "Draw", type: "header" },
        { label: "Draw By Agreement", type: "sub" },
        { label: "Draw By Repetition", type: "sub" },
        { label: "Draw By Stalemate", type: "sub" },
        { label: "Draw By Insufficient Material", type: "sub" },
        { label: "Draw By Timeout vs Insufficient Material", type: "sub" },
        { label: "Draw By 50 Move Rule", type: "sub" },
    ];

    const toggleResultDropdown = (e) => {
        e.stopPropagation();
        if (!isResultOpen && resultButtonRef.current) {
            const rect = resultButtonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            if (spaceBelow < 450 && spaceAbove > spaceBelow) {
                setDropdownDirection('up');
            } else {
                setDropdownDirection('down');
            }
        }
        setIsResultOpen(!isResultOpen);
        setIsDropdownOpen(false);
    };

    const fetchProfile = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/profile`, { headers: { Authorization: `Bearer ${token}` } });
            setUser(res.data);
        } catch (err) { console.error("Profil hiba:", err); }
    }, [token]);

    useEffect(() => {
        fetchProfile();
        setHistory([
            { id: 1, type: '10 min', opponent: 'hellsin21', elo: 636, myElo: 423, result: '0-1', moves: 7, date: 'Apr 9, 2026', win: false },
            { id: 2, type: '10 min', opponent: 'aswinaee', elo: 705, myElo: 528, result: '1-0', moves: 66, date: 'Apr 9, 2026', win: false },
            { id: 3, type: '5 min', opponent: 'Heman21th', elo: 647, myElo: 709, result: '0-1', accuracy: '52.4', moves: 39, date: 'Apr 8, 2026', win: true },
            { id: 4, type: '5 min', opponent: 'Ms_king00006', elo: 569, myElo: 677, result: '0-1', moves: 33, date: 'Apr 8, 2026', win: true },
            { id: 5, type: '5 min', opponent: 'hatemibrahim', elo: 687, myElo: 647, result: '0-1', moves: 37, date: 'Apr 8, 2026', win: false },
            { id: 6, type: '10 min', opponent: 'hellsin21', elo: 636, myElo: 423, result: '0-1', moves: 7, date: 'Apr 9, 2026', win: false },
            { id: 7, type: '10 min', opponent: 'aswinaee', elo: 705, myElo: 528, result: '1-0', moves: 66, date: 'Apr 9, 2026', win: false },
            { id: 8, type: '5 min', opponent: 'Heman21th', elo: 647, myElo: 709, result: '0-1', accuracy: '52.4', moves: 39, date: 'Apr 8, 2026', win: true },
            { id: 9, type: '5 min', opponent: 'Ms_king00006', elo: 569, myElo: 677, result: '0-1', moves: 33, date: 'Apr 8, 2026', win: true },
            { id: 10, type: '5 min', opponent: 'hatemibrahim', elo: 687, myElo: 647, result: '0-1', moves: 37, date: 'Apr 8, 2026', win: false },{ id: 1, type: '10 min', opponent: 'hellsin21', elo: 636, myElo: 423, result: '0-1', moves: 7, date: 'Apr 9, 2026', win: false },
            { id: 11, type: '10 min', opponent: 'aswinaee', elo: 705, myElo: 528, result: '1-0', moves: 66, date: 'Apr 9, 2026', win: false },
            { id: 12, type: '5 min', opponent: 'Heman21th', elo: 647, myElo: 709, result: '0-1', accuracy: '52.4', moves: 39, date: 'Apr 8, 2026', win: true },
            { id: 13, type: '5 min', opponent: 'Ms_king00006', elo: 569, myElo: 677, result: '0-1', moves: 33, date: 'Apr 8, 2026', win: true },
            { id: 14, type: '5 min', opponent: 'hatemibrahim', elo: 687, myElo: 647, result: '0-1', moves: 37, date: 'Apr 8, 2026', win: false },{ id: 1, type: '10 min', opponent: 'hellsin21', elo: 636, myElo: 423, result: '0-1', moves: 7, date: 'Apr 9, 2026', win: false },
            { id: 15, type: '10 min', opponent: 'aswinaee', elo: 705, myElo: 528, result: '1-0', moves: 66, date: 'Apr 9, 2026', win: false },
            { id: 16, type: '5 min', opponent: 'Heman21th', elo: 647, myElo: 709, result: '0-1', accuracy: '52.4', moves: 39, date: 'Apr 8, 2026', win: true },
            { id: 17, type: '5 min', opponent: 'Ms_king00006', elo: 569, myElo: 677, result: '0-1', moves: 33, date: 'Apr 8, 2026', win: true },
            { id: 18, type: '5 min', opponent: 'hatemibrahim', elo: 687, myElo: 647, result: '0-1', moves: 37, date: 'Apr 8, 2026', win: false },
            { id: 19, type: '10 min', opponent: 'hellsin21', elo: 636, myElo: 423, result: '0-1', moves: 7, date: 'Apr 9, 2026', win: false },
            { id: 20, type: '10 min', opponent: 'aswinaee', elo: 705, myElo: 528, result: '1-0', moves: 66, date: 'Apr 9, 2026', win: false },
            { id: 21, type: '5 min', opponent: 'Heman21th', elo: 647, myElo: 709, result: '0-1', accuracy: '52.4', moves: 39, date: 'Apr 8, 2026', win: true },
            { id: 22, type: '5 min', opponent: 'Ms_king00006', elo: 569, myElo: 677, result: '0-1', moves: 33, date: 'Apr 8, 2026', win: true },
            { id: 23, type: '5 min', opponent: 'hatemibrahim', elo: 687, myElo: 647, result: '0-1', moves: 37, date: 'Apr 8, 2026', win: false },
            { id: 24, type: '10 min', opponent: 'hellsin21', elo: 636, myElo: 423, result: '0-1', moves: 7, date: 'Apr 9, 2026', win: false },
            { id: 25, type: '10 min', opponent: 'aswinaee', elo: 705, myElo: 528, result: '1-0', moves: 66, date: 'Apr 9, 2026', win: false },
            { id: 26, type: '5 min', opponent: 'Heman21th', elo: 647, myElo: 709, result: '0-1', accuracy: '52.4', moves: 39, date: 'Apr 8, 2026', win: true },
            { id: 27, type: '5 min', opponent: 'Ms_king00006', elo: 569, myElo: 677, result: '0-1', moves: 33, date: 'Apr 8, 2026', win: true },
            { id: 28, type: '5 min', opponent: 'hatemibrahim', elo: 687, myElo: 647, result: '0-1', moves: 37, date: 'Apr 8, 2026', win: false },{ id: 1, type: '10 min', opponent: 'hellsin21', elo: 636, myElo: 423, result: '0-1', moves: 7, date: 'Apr 9, 2026', win: false },
            { id: 29, type: '10 min', opponent: 'aswinaee', elo: 705, myElo: 528, result: '1-0', moves: 66, date: 'Apr 9, 2026', win: false },
            { id: 30, type: '5 min', opponent: 'Heman21th', elo: 647, myElo: 709, result: '0-1', accuracy: '52.4', moves: 39, date: 'Apr 8, 2026', win: true },
            { id: 31, type: '5 min', opponent: 'Ms_king00006', elo: 569, myElo: 677, result: '0-1', moves: 33, date: 'Apr 8, 2026', win: true },
            { id: 32, type: '5 min', opponent: 'hatemibrahim', elo: 687, myElo: 647, result: '0-1', moves: 37, date: 'Apr 8, 2026', win: false },{ id: 1, type: '10 min', opponent: 'hellsin21', elo: 636, myElo: 423, result: '0-1', moves: 7, date: 'Apr 9, 2026', win: false },
            { id: 33, type: '10 min', opponent: 'aswinaee', elo: 705, myElo: 528, result: '1-0', moves: 66, date: 'Apr 9, 2026', win: false },
            { id: 34, type: '5 min', opponent: 'Heman21th', elo: 647, myElo: 709, result: '0-1', accuracy: '52.4', moves: 39, date: 'Apr 8, 2026', win: true },
            { id: 35, type: '5 min', opponent: 'Ms_king00006', elo: 569, myElo: 677, result: '0-1', moves: 33, date: 'Apr 8, 2026', win: true },
            { id: 36, type: '5 min', opponent: 'hatemibrahim', elo: 687, myElo: 647, result: '0-1', moves: 37, date: 'Apr 8, 2026', win: false },
        ]);
    }, [fetchProfile, archiveMode]);

    useEffect(() => {
        const closeAll = () => { setIsDropdownOpen(false); setIsResultOpen(false); };
        window.addEventListener('click', closeAll);
        return () => window.removeEventListener('click', closeAll);
    }, []);

    const handleSeeMore = () => {
    navigate(`/member/${user.username}/games`); // Átvált a 10-ről 50-es nézetre
};


    // Kiszámoljuk a lebegő lista stílusát
    const getDropdownStyle = () => {
        if (!resultButtonRef.current) return {};
        const rect = resultButtonRef.current.getBoundingClientRect();
        const listHeight = 520; // becsült magasság
        
        let style = {
            width: rect.width,
            left: rect.left,
            position: 'fixed',
            zIndex: 9999
        };

        if (dropdownDirection === 'up') {
            // Ha felfelé nyílik, de nem férne ki a képernyő tetejéig (10px margó)
            const calculatedTop = Math.max(10, rect.top - listHeight);
            style.top = calculatedTop + 'px';
            style.maxHeight = (rect.top - calculatedTop + 40) + 'px'; // rácsúszhat a gombra, hogy kiférjen
        } else {
            // Lefelé nyílás
            style.top = rect.bottom + 'px';
            style.maxHeight = (window.innerHeight - rect.bottom - 10) + 'px';
        }
        return style;
    };

    return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#bab9b8] font-sans pb-10">
        <div className="max-w-6xl mx-auto pt-8 px-4">
            
            {/* 1. PROFIL HEADER */}
            <div className="bg-[#262421] rounded-t-lg p-8 border-x border-t border-[#3c3a37] flex flex-col md:flex-row gap-8 relative">
                <div className="w-40 h-40 bg-[#312e2b] rounded-sm flex items-center justify-center border border-[#3c3a37] overflow-hidden shrink-0">
                    <img src="/assets/pieces/white_pawn.png" alt="avatar" className="w-24 opacity-50" />
                </div>
                <div className="flex-1 space-y-4 text-white">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-bold">{user.username || urlUsername}</h1>
                        <span className="text-2xl">🇭🇺</span> <span className="text-blue-400 text-xl">💎</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#8b8987] text-sm group cursor-pointer w-fit italic">
                        <span>Enter a status here</span> <i className="fas fa-edit opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </div>
                </div>
                <button className="absolute top-8 right-8 bg-[#3c3a37] hover:bg-[#4a4845] text-white px-4 py-1.5 rounded text-sm font-bold">Edit Profile</button>
            </div>

            {/* 2. STICKY TABS */}
            <div className="sticky top-0 z-40 bg-[#21201d] border border-[#3c3a37] flex items-center px-4 shadow-xl">
                {['Overview', 'Games', 'Stats', 'Friends', 'Awards', 'Clubs'].map((tab) => (
                    <button 
                        key={tab} 
                        onClick={() => tab === 'Overview' ? navigate('/profile') : tab === 'Games' ? handleSeeMore() : null}
                        className={`px-6 py-4 text-sm font-bold border-b-4 transition-all ${((archiveMode && tab === 'Games') || (!archiveMode && tab === 'Overview')) ? 'border-[#81b64c] text-white bg-[#262421]' : 'border-transparent hover:text-white'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* 3. FŐ TARTALOM - Itt az items-start a kulcs! */}
            <div className="flex flex-col lg:flex-row gap-6 mt-6 items-start">
                
                {/* BAL OLDAL - COMPACT GAME HISTORY */}
                <div className="flex-1 bg-[#262421] rounded-lg border border-[#3c3a37] overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[#3c3a37] bg-[#2b2926] flex justify-between items-center text-white">
                        <h3 className="font-bold text-lg">Game History ({history.length})</h3>
                        <div className="flex gap-4 text-[#666]">
                            <i className="far fa-square cursor-pointer hover:text-white transition-colors"></i>
                            <i className="far fa-clock cursor-pointer hover:text-white transition-colors"></i>
                            <i className="fas fa-download cursor-pointer hover:text-white transition-colors"></i>
                        </div>
                    </div>
                    
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-[#1e1e1e] text-[#8b8987] font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="p-4 w-12"></th>
                                <th className="px-2 py-3">Players</th>
                                <th className="px-4 py-3 text-center">Result</th>
                                <th className="px-4 py-3 text-center">Accuracy</th>
                                <th className="px-4 py-3 text-center">Moves</th>
                                <th className="px-4 py-3 text-right">Date <i className="fas fa-caret-down ml-1"></i></th>
                                <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="accent-[#81b64c]" /></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3c3a37]">
                            {history.map((game) => {
                                const whiteWon = game.result === "1-0";
                                const blackWon = game.result === "0-1";
                                const whitePlayer = game.iWasWhite ? { name: user.username, elo: game.myElo, isMe: true } : { name: game.opponent, elo: game.elo, isMe: false };
                                const blackPlayer = !game.iWasWhite ? { name: user.username, elo: game.myElo, isMe: true } : { name: game.opponent, elo: game.elo, isMe: false };

                                return (
                                    <tr key={game.id} className="hover:bg-[#2b2926] transition-colors cursor-pointer group h-[60px]">
                                        <td className="px-4 py-2 w-16 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className={`${game.type?.includes('min') ? 'text-[#81b64c]' : 'text-yellow-500'} text-lg`}>
                                                    <i className={`fas ${game.type?.includes('min') ? 'fa-stopwatch' : 'fa-sun'}`}></i>
                                                </div>
                                                <div className="text-[9px] uppercase font-bold text-[#666] mt-0.5">{game.type}</div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-1">
                                            <div className="flex flex-col justify-center gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 bg-white rounded-sm ${whiteWon ? 'ring-1 ring-[#81b64c]' : ''}`}></div>
                                                    <span className={`text-[13px] truncate ${whitePlayer.isMe ? 'font-bold text-white' : 'text-[#bab9b8]'}`}>
                                                        {whitePlayer.name} <span className="text-[#666] font-normal text-[11px]">({whitePlayer.elo})</span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 bg-[#3c3a37] rounded-sm ${blackWon ? 'ring-1 ring-[#81b64c]' : ''}`}></div>
                                                    <span className={`text-[13px] truncate ${blackPlayer.isMe ? 'font-bold text-white' : 'text-[#bab9b8]'}`}>
                                                        {blackPlayer.name} <span className="text-[#666] font-normal text-[11px]">({blackPlayer.elo})</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 w-24">
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="flex flex-col text-[13px] font-bold text-[#8b8987] leading-none text-right gap-1.5">
                                                    <span className={whiteWon ? 'text-white' : ''}>{whiteWon ? '1' : '0'}</span>
                                                    <span className={blackWon ? 'text-white' : ''}>{blackWon ? '1' : '0'}</span>
                                                </div>
                                                <div className={`w-5 h-5 flex items-center justify-center rounded-sm ${game.win ? 'bg-[#81b64c]' : 'bg-[#fa412d]'}`}>
                                                    <i className={`fas ${game.win ? 'fa-plus' : 'fa-minus'} text-[8px] text-white`}></i>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 w-20 text-center">
                                            <div className="flex flex-col text-[11px] font-bold leading-none items-center gap-2">
                                                <span className="text-[#8b8987]">{Array.isArray(game.accuracy) ? game.accuracy[0] : '—'}</span>
                                                <span className="text-white">{Array.isArray(game.accuracy) ? game.accuracy[1] : '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-center text-white font-medium text-[13px]">{game.moves}</td>
                                        <td className="px-4 py-2 text-right text-[#bab9b8] text-[12px] whitespace-nowrap font-medium">{game.date}</td>
                                        <td className="px-4 py-2 w-10 text-center align-middle">
                                            <input type="checkbox" className="w-4 h-4 rounded border-[#454241] bg-[#1e1e1e] accent-[#81b64c]" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {!archiveMode && (
                        <div onClick={handleSeeMore} className="p-4 bg-[#1e1e1e] hover:bg-[#2b2926] text-center font-bold text-sm cursor-pointer border-t border-[#3c3a37] text-[#bab9b8] transition-colors">
                            See More <i className="fas fa-chevron-right ml-2 text-[10px]"></i>
                        </div>
                    )}
                </div>

                {/* JOBB OLDAL - SEARCH PANEL (Fix szélesség és magasság) */}
                <div className="w-full lg:w-[320px] flex flex-col gap-4">
                    <div className="bg-[#262421] p-5 rounded-lg border border-[#3c3a37] h-auto flex flex-col relative">
                        <h3 className="font-bold text-white text-[15px] mb-4">Search Games</h3>
                        
                        <div className="space-y-3">
                            <SimpleSelect label={selectedGameType} onClick={() => setIsDropdownOpen(!isDropdownOpen)} />
                            
                            <div className="relative" ref={resultButtonRef}>
                                <SimpleSelect label={selectedResult} onClick={toggleResultDropdown} />
                                {isResultOpen && (
                                    <div className="fixed bg-white border border-gray-300 shadow-2xl py-1 flex flex-col overflow-y-auto z-[9999]" style={getDropdownStyle()}>
                                        {resultOptions.map((opt, i) => (
                                            <div key={i} onClick={() => { if(opt.type !== 'header') { setSelectedResult(opt.label); setIsResultOpen(false); } }}
                                                className={`px-4 py-1.5 text-[13px] transition-colors ${opt.type === 'header' ? 'text-black font-bold cursor-default pt-2 pb-1' : 'text-black cursor-pointer hover:bg-[#5da9ff] hover:text-white'} ${opt.type === 'sub' ? 'pl-8' : ''}`}>
                                                {opt.type === 'sub' ? `- ${opt.label}` : opt.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <input type="text" placeholder="Opponent" className="w-full bg-[#1e1e1e] border border-[#3c3a37] p-2.5 rounded text-sm text-white outline-none placeholder-[#666] hover:border-[#454241] focus:border-[#81b64c]" />

                            {isAdvancedOpen && (
                                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                                    {["Opponent Title", "Openings", "Color", "Match Type", "Newest", "Rated + Unrated"].map(l => (
                                        <SimpleSelect key={l} label={l} />
                                    ))}

                                    <div className="flex gap-2 relative">
                                        <div className="relative flex-1">
                                            <div onClick={() => { setShowStartDate(!showStartDate); setShowEndDate(false); }} className="w-full bg-[#1e1e1e] border border-[#3c3a37] p-2.5 rounded text-[11px] text-[#bab9b8] flex justify-between items-center cursor-pointer hover:border-[#666]">
                                                <span>{startDate || "Start Date"}</span> <i className="far fa-calendar text-[#666]"></i>
                                            </div>
                                            {showStartDate && <CustomCalendar onSelect={(d) => {setStartDate(d); setShowStartDate(false);}} />}
                                        </div>
                                        <div className="relative flex-1">
                                            <div onClick={() => { setShowEndDate(!showEndDate); setShowStartDate(false); }} className="w-full bg-[#1e1e1e] border border-[#3c3a37] p-2.5 rounded text-[11px] text-[#bab9b8] flex justify-between items-center cursor-pointer hover:border-[#666]">
                                                <span>{endDate || "End Date"}</span> <i className="far fa-calendar text-[#666]"></i>
                                            </div>
                                            {showEndDate && <CustomCalendar onSelect={(d) => {setEndDate(d); setShowEndDate(false);}} />}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-[#8b8987] uppercase tracking-tighter">Rating Range</label>
                                        <div className="flex gap-2 w-full">
                                            <div className="flex-1 min-w-0">
                                                <input type="text" placeholder="Min" className="w-full bg-[#1e1e1e] border border-[#3c3a37] p-2.5 rounded text-sm text-white outline-none placeholder-[#666] hover:border-[#454241]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <input type="text" placeholder="Max" className="w-full bg-[#1e1e1e] border border-[#3c3a37] p-2.5 rounded text-sm text-white outline-none placeholder-[#666] hover:border-[#454241]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-1">
                                <button className="flex-1 bg-[#81b64c] hover:bg-[#a3d16a] text-white font-bold py-2.5 rounded shadow-lg transition-all text-sm">Search</button>
                                <button className="flex-1 bg-[#3c3a37] hover:bg-[#4a4845] text-white font-bold py-2.5 rounded text-sm">Reset</button>
                            </div>
                        </div>

                        <button onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="w-full text-center text-[11px] font-bold text-[#8b8987] hover:text-white uppercase tracking-widest pt-4 flex items-center justify-center gap-1 transition-colors">
                            {isAdvancedOpen ? 'Hide' : 'Advanced'} <i className={`fas fa-chevron-${isAdvancedOpen ? 'up' : 'down'} text-[8px]`}></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
};

const SimpleSelect = ({ label, onClick }) => (
    <div 
        onClick={onClick}
        className="w-full bg-[#1e1e1e] border border-[#3c3a37] p-2.5 rounded text-sm text-[#bab9b8] flex justify-between items-center cursor-pointer hover:border-[#666]"
    >
        <span className="truncate">{label}</span>
        <i className="fas fa-caret-down text-[#666]"></i>
    </div>
);

const CustomCalendar = ({ onSelect }) => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1); // Csak illusztráció a napokhoz
    const prevDays = [29, 30, 31];
    const nextDays = [1, 2];

    return (
        <div className="absolute top-full right-0 mt-2 bg-[#262421] border border-[#3c3a37] rounded shadow-2xl z-[200] w-64 p-4 select-none animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
                <i className="fas fa-chevron-left text-[#bab9b8] cursor-pointer hover:text-white px-2"></i>
                <span className="text-white font-bold text-sm">April 2026</span>
                <i className="fas fa-chevron-right text-[#bab9b8] cursor-pointer hover:text-white px-2"></i>
            </div>
            
            <div className="grid grid-cols-7 text-center gap-y-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <span key={d} className="text-[10px] text-[#666] font-bold mb-2">{d}</span>
                ))}
                
                {prevDays.map(d => <span key={`p-${d}`} className="text-sm text-[#444] p-1.5">{d}</span>)}
                
                {days.map(d => (
                    <button 
                        key={d} 
                        onClick={() => onSelect(`Apr ${d}, 2026`)}
                        className={`text-sm p-1.5 rounded transition-colors ${d === 9 ? 'bg-[#81b64c] text-white font-bold' : 'text-[#bab9b8] hover:bg-[#312e2b]'}`}
                    >
                        {d}
                    </button>
                ))}

                {nextDays.map(d => <span key={`n-${d}`} className="text-sm text-[#444] p-1.5">{d}</span>)}
            </div>
        </div>
    );
};

export default ProfilePage;