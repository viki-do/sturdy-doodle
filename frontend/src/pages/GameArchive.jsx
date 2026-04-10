import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';

const GameArchive = () => {
    const { username } = useParams();
    const [viewMode, setViewMode] = useState('Recent');
    const [selectedGameType, setSelectedGameType] = useState("My Games");
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    // Példa adatok a kép alapján
    const games = [
        { id: 1, type: 'bot', opponent: 'Maximum', elo: 3200, myElo: 484, result: '0-1', accuracy: ['80.4', '95.3'], moves: 18, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 2, type: 'bot', opponent: 'Maximum', elo: 3200, myElo: 484, result: '0-1', accuracy: ['95.9', '100'], moves: 5, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 3, type: '10 min', opponent: 'avizzean', elo: 510, myElo: 484, result: '0-1', accuracy: ['75.8', '81.9'], moves: 46, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 4, type: '3 days', opponent: 'nickplaysc...', elo: 1013, myElo: 1171, result: '1-0', accuracy: ['56.9', '44.9'], moves: 18, date: 'Apr 4, 2026', win: true, iWasWhite: true },
        { id: 5, type: '1 day', opponent: 'sam2love', elo: 1299, myElo: 1131, result: '1-0', accuracy: ['85.4', '77.8'], moves: 34, date: 'Apr 4, 2026', win: true, iWasWhite: false },
        { id: 6, type: 'bot', opponent: 'Maximum', elo: 3200, myElo: 484, result: '0-1', accuracy: ['80.4', '95.3'], moves: 18, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 7, type: 'bot', opponent: 'Maximum', elo: 3200, myElo: 484, result: '0-1', accuracy: ['95.9', '100'], moves: 5, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 8, type: '10 min', opponent: 'avizzean', elo: 510, myElo: 484, result: '0-1', accuracy: ['75.8', '81.9'], moves: 46, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 9, type: '3 days', opponent: 'nickplaysc...', elo: 1013, myElo: 1171, result: '1-0', accuracy: ['56.9', '44.9'], moves: 18, date: 'Apr 4, 2026', win: true, iWasWhite: true },
        { id: 10, type: '1 day', opponent: 'sam2love', elo: 1299, myElo: 1131, result: '1-0', accuracy: ['85.4', '77.8'], moves: 34, date: 'Apr 4, 2026', win: true, iWasWhite: false },
        { id: 11, type: 'bot', opponent: 'Maximum', elo: 3200, myElo: 484, result: '0-1', accuracy: ['80.4', '95.3'], moves: 18, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 12, type: 'bot', opponent: 'Maximum', elo: 3200, myElo: 484, result: '0-1', accuracy: ['95.9', '100'], moves: 5, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 13, type: '10 min', opponent: 'avizzean', elo: 510, myElo: 484, result: '0-1', accuracy: ['75.8', '81.9'], moves: 46, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 14, type: '3 days', opponent: 'nickplaysc...', elo: 1013, myElo: 1171, result: '1-0', accuracy: ['56.9', '44.9'], moves: 18, date: 'Apr 4, 2026', win: true, iWasWhite: true },
        { id: 15, type: '1 day', opponent: 'sam2love', elo: 1299, myElo: 1131, result: '1-0', accuracy: ['85.4', '77.8'], moves: 34, date: 'Apr 4, 2026', win: true, iWasWhite: false },
        { id: 16, type: 'bot', opponent: 'Maximum', elo: 3200, myElo: 484, result: '0-1', accuracy: ['80.4', '95.3'], moves: 18, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 17, type: 'bot', opponent: 'Maximum', elo: 3200, myElo: 484, result: '0-1', accuracy: ['95.9', '100'], moves: 5, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 18, type: '10 min', opponent: 'avizzean', elo: 510, myElo: 484, result: '0-1', accuracy: ['75.8', '81.9'], moves: 46, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 19, type: '3 days', opponent: 'nickplaysc...', elo: 1013, myElo: 1171, result: '1-0', accuracy: ['56.9', '44.9'], moves: 18, date: 'Apr 4, 2026', win: true, iWasWhite: true },
        { id: 20, type: '1 day', opponent: 'sam2love', elo: 1299, myElo: 1131, result: '1-0', accuracy: ['85.4', '77.8'], moves: 34, date: 'Apr 4, 2026', win: true, iWasWhite: false },
        { id: 21, type: 'bot', opponent: 'Maximum', elo: 3200, myElo: 484, result: '0-1', accuracy: ['80.4', '95.3'], moves: 18, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 22, type: 'bot', opponent: 'Maximum', elo: 3200, myElo: 484, result: '0-1', accuracy: ['95.9', '100'], moves: 5, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 23, type: '10 min', opponent: 'avizzean', elo: 510, myElo: 484, result: '0-1', accuracy: ['75.8', '81.9'], moves: 46, date: 'Apr 4, 2026', win: false, iWasWhite: true },
        { id: 24, type: '3 days', opponent: 'nickplaysc...', elo: 1013, myElo: 1171, result: '1-0', accuracy: ['56.9', '44.9'], moves: 18, date: 'Apr 4, 2026', win: true, iWasWhite: true },
        { id: 25, type: '1 day', opponent: 'sam2love', elo: 1299, myElo: 1131, result: '1-0', accuracy: ['85.4', '77.8'], moves: 34, date: 'Apr 4, 2026', win: true, iWasWhite: false },
    ];

    return (
        <div className="min-h-screen bg-[#1e1e1e] text-[#bab9b8] p-4 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                
                {/* 1. FEJLÉC IKONNAL */}
                <div className="flex items-center gap-3 mb-6">
                    <img src="/assets/logos/board-archive.svg" className="w-10 h-10" alt="archive" />
                    <h2 className="text-[26px] font-bold text-white tracking-tight">Game History (221)</h2>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* BAL OLDAL: ARCHÍVUM TÁBLÁZAT */}
                    <div className="flex-1 min-w-0">
                        
                        {/* TABOK */}
                        <div className="flex items-center justify-between bg-[#262421] border-x border-t border-[#3c3a37] rounded-t-lg px-2">
                            <div className="flex">
                                {['Recent', 'Daily', 'Live', 'Bot', 'Coach'].map((tab) => (
                                    <button 
                                        key={tab}
                                        onClick={() => setViewMode(tab)}
                                        className={`px-5 py-4 text-sm font-bold transition-all border-b-2 ${
                                            viewMode === tab ? 'border-[#81b64c] text-white' : 'border-transparent hover:text-white'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-4 px-4 text-[#666] text-lg">
                                <i className="far fa-square cursor-pointer hover:text-white transition-colors"></i>
                                <i className="far fa-clock cursor-pointer hover:text-white transition-colors"></i>
                                <i className="fas fa-download cursor-pointer hover:text-white transition-colors"></i>
                            </div>
                        </div>

                        {/* TOTAL ÉS FELSŐ LAPOZÓ */}
                        <div className="bg-[#262421] border-x border-t border-[#3c3a37] flex justify-between items-center px-4 py-2">
                            <span className="text-[11px] font-bold text-[#8b8987]">Total: 221</span>
                            <div className="flex gap-1">
                                <button className="w-7 h-7 flex items-center justify-center bg-[#3c3a37] text-[#666] rounded-sm text-xs"><i className="fas fa-chevron-left"></i></button>
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button key={n} className={`w-7 h-7 rounded-sm font-bold text-xs ${n === 1 ? 'bg-[#454241] text-white' : 'text-[#bab9b8] hover:bg-[#312e2b]'}`}>{n}</button>
                                ))}
                                <button className="w-7 h-7 flex items-center justify-center bg-[#312e2b] text-[#bab9b8] rounded-sm text-xs"><i className="fas fa-chevron-right"></i></button>
                                <button className="px-3 h-7 bg-[#312e2b] text-[#bab9b8] rounded-sm text-[11px] font-bold ml-1">Last</button>
                            </div>
                        </div>

                        {/* TÁBLÁZAT */}
                        <div className="bg-[#262421] border border-[#3c3a37] overflow-hidden rounded-b-lg">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-[#1e1e1e] text-[#8b8987] font-bold uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-4 w-16"></th>
                                        <th className="px-2 py-3">Players</th>
                                        <th className="px-4 py-3 text-center">Result</th>
                                        <th className="px-4 py-3 text-center">Accuracy</th>
                                        <th className="px-4 py-3 text-center">Moves</th>
                                        <th className="px-4 py-3 text-right">Date <i className="fas fa-caret-down ml-1"></i></th>
                                        <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="accent-[#81b64c]" /></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#3c3a37]">
                                    {games.map((game) => {
                                        const whiteWon = (game.result === "1-0");
                                        const blackWon = (game.result === "0-1");
                                        const whitePlayer = game.iWasWhite ? { name: "viki1003", elo: game.myElo, isMe: true } : { name: game.opponent, elo: game.elo, isMe: false };
                                        const blackPlayer = !game.iWasWhite ? { name: "viki1003", elo: game.myElo, isMe: true } : { name: game.opponent, elo: game.elo, isMe: false };

                                        return (
                                            <tr key={game.id} className="hover:bg-[#2b2926] transition-colors cursor-pointer group h-[85px]">
                                                {/* Kategória Ikon */}
                                                <td className="px-4 py-2 text-center align-middle">
                                                    {game.type === 'bot' ? (
                                                        <div className="text-blue-300 text-2xl opacity-80"><i className="fas fa-robot"></i></div>
                                                    ) : (
                                                        <div className="flex flex-col items-center">
                                                            <div className={`${game.type.includes('min') ? 'text-[#81b64c]' : 'text-yellow-500'} text-xl`}><i className={`fas ${game.type.includes('min') ? 'fa-stopwatch' : 'fa-sun'}`}></i></div>
                                                            <div className="text-[9px] uppercase font-bold text-[#666] mt-1 whitespace-nowrap">{game.type}</div>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Players */}
                                                <td className="px-2 py-2">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-3 h-3 bg-white rounded-sm ${whiteWon ? 'ring-2 ring-[#81b64c]' : ''}`}></div>
                                                            {whitePlayer.isMe && <span className="text-blue-400 text-[10px]"><i className="fas fa-gem"></i></span>}
                                                            <span className={`text-[13px] ${whitePlayer.isMe ? 'font-bold text-white' : 'text-[#bab9b8]'}`}>
                                                                {whitePlayer.name} <span className="text-[#666] font-normal">({whitePlayer.elo})</span>
                                                                {!whitePlayer.isMe && <span className="ml-1 opacity-60">🇭🇺</span>}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-3 h-3 bg-[#3c3a37] rounded-sm ${blackWon ? 'ring-2 ring-[#81b64c]' : ''}`}></div>
                                                            {blackPlayer.isMe && <span className="text-blue-400 text-[10px]"><i className="fas fa-gem"></i></span>}
                                                            <span className={`text-[13px] ${blackPlayer.isMe ? 'font-bold text-white' : 'text-[#bab9b8]'}`}>
                                                                {blackPlayer.name} <span className="text-[#666] font-normal">({blackPlayer.elo})</span>
                                                                {!blackPlayer.isMe && <span className="ml-1 opacity-60">🌎</span>}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Result */}
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <div className="flex flex-col text-[13px] font-bold text-[#8b8987] leading-tight text-right w-4">
                                                            <span className={whiteWon ? 'text-white' : ''}>{whiteWon ? '1' : '0'}</span>
                                                            <span className={blackWon ? 'text-white' : ''}>{blackWon ? '1' : '0'}</span>
                                                        </div>
                                                        <div className={`w-6 h-6 flex items-center justify-center rounded-sm ${game.win ? 'bg-[#81b64c]' : 'bg-[#fa412d]'}`}>
                                                            <i className={`fas ${game.win ? 'fa-plus' : 'fa-minus'} text-[10px] text-white`}></i>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Accuracy */}
                                                <td className="px-4 py-2 text-center">
                                                    <div className="flex flex-col text-[12px] font-bold leading-tight items-center">
                                                        <span className="text-[#8b8987]">{game.accuracy[0]}</span>
                                                        <span className="text-white">{game.accuracy[1]}</span>
                                                    </div>
                                                </td>

                                                {/* Moves */}
                                                <td className="px-4 py-2 text-center text-white font-medium text-[13px]">{game.moves}</td>

                                                {/* Date */}
                                                <td className="px-4 py-2 text-right text-white text-[13px] whitespace-nowrap font-medium">{game.date}</td>

                                                {/* Checkbox */}
                                                <td className="px-4 py-2 text-center"><input type="checkbox" className="accent-[#81b64c]" /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* JOBB OLDAL: SIDEBAR SZŰRŐKKEL */}
                    <div className="w-80 space-y-4">
                        <h3 className="font-bold text-white text-lg mb-2 px-1">Game History</h3>
                        
                        <div className="bg-[#262421] p-4 rounded border border-[#3c3a37] space-y-3">
                            {['My Games', 'Explore Games', 'Games Database', 'Collections', 'Saved Analysis'].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm font-bold text-[#bab9b8] cursor-pointer hover:text-white transition-colors">
                                    <i className="fas fa-caret-right text-[#666]"></i> {item}
                                </div>
                            ))}
                        </div>

                        <div className="bg-[#262421] p-5 rounded border border-[#3c3a37] space-y-4">
                            <ArchiveSelect value="My Games" />
                            <ArchiveSelect value="All Recent Games" />
                            <ArchiveSelect value="Any Result" />
                            
                            <input 
                                type="text" 
                                placeholder="Opponent" 
                                className="w-full bg-[#1e1e1e] border border-[#3c3a37] p-2.5 rounded text-sm text-white outline-none focus:border-[#666]" 
                            />

                            <div className="flex gap-2">
                                <button className="flex-1 bg-[#81b64c] hover:bg-[#a3d16a] text-white font-bold py-2.5 rounded transition-all shadow-lg active:scale-95">Search</button>
                                <button className="flex-1 bg-[#3c3a37] hover:bg-[#4a4845] text-white font-bold py-2.5 rounded transition-all">Reset</button>
                            </div>

                            <button 
                                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                                className="w-full text-center text-[11px] font-bold text-[#8b8987] hover:text-white uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                            >
                                Advanced <i className={`fas fa-chevron-${isAdvancedOpen ? 'up' : 'down'}`}></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ArchiveSelect = ({ value }) => (
    <div className="relative group">
        <div className="w-full bg-[#1e1e1e] border border-[#3c3a37] p-2.5 rounded text-sm text-[#bab9b8] flex justify-between items-center cursor-pointer hover:border-[#666] transition-colors">
            <span className="font-medium">{value}</span>
            <i className="fas fa-caret-down text-[#666]"></i>
        </div>
    </div>
);

export default GameArchive;