import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import axios from 'axios';

const HomePage = () => {
    const navigate = useNavigate();
    const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const [reviewGame, setReviewGame] = React.useState(null);
    const username = localStorage.getItem('chessUsername');

    // Pontosan 5 játék a history-hoz
    const gameHistory = [
        { id: 1, opponent: "Heman21th", elo: 647, myElo: 709, result: "0-1", accuracy: "52.4", moves: 39, date: "Apr 8, 2026", win: true },
        { id: 2, opponent: "Ms_king00006", elo: 569, myElo: 677, result: "1-0", accuracy: "Review", moves: 33, date: "Apr 8, 2026", win: true },
        { id: 3, opponent: "hatemibrahim", elo: 687, myElo: 647, result: "1-0", accuracy: "Review", moves: 37, date: "Apr 8, 2026", win: false },
        { id: 4, opponent: "hiefNick", elo: 647, myElo: 709, result: "1-0", accuracy: "Review", moves: 38, date: "Apr 7, 2026", win: true },
        { id: 5, opponent: "AmakDEi", elo: 647, myElo: 709, result: "1-0", accuracy: "Review", moves: 38, date: "Apr 6, 2026", win: false }
    ];

    React.useEffect(() => {
        const fetchLatest = async () => {
            try {
                // Megjegyzés: Az API_BASE és token változókat definiáld vagy importáld!
                const res = await axios.get(`http://localhost:8000/get-latest-review-game`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('chessToken')}` }
                });
                setReviewGame(res.data);
            } catch (err) {
                console.error("Nem sikerült betölteni a review játékot");
            }
        };
        fetchLatest();
    }, []);

    return (
        <div className="flex flex-col p-8 bg-[#1e1e1e] min-h-screen font-sans text-[#bab9b8]">
            
            {/* --- 1. FELHASZNÁLÓI FEJLÉC --- */}
            <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-[#3c3a37] rounded flex items-center justify-center overflow-hidden">
                    <i className="fas fa-user text-white"></i>
                </div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    IOViktoria01 <span className="text-sm">🇭🇺</span> <span className="text-blue-400 text-xs">💎</span>
                </h1>
            </div>

            {/* --- 2. FELSŐ DASHBOARD SZEKCIÓ --- */}
            <div className="flex flex-row gap-8 items-start mb-12">
                <div className="flex flex-col w-72">
                    <div className="flex items-center gap-4 mb-6 h-16">
                        <span className="text-5xl">🔥</span>
                        <div className="flex flex-col">
                            <span className="text-xs uppercase font-black text-[#8b8987] tracking-wider leading-none mb-1">Streak</span>
                            <span className="text-xl font-black text-white leading-none">2 Day Streak</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <PlayButton icon="fa-stopwatch" label="Play 10 min" isMain={true} onClick={() => navigate('/play')} />
                        <PlayButton icon="fa-hand-pointer" label="New Game" />
                        <PlayButton icon="fa-robot" label="Play Bots" />
                        <PlayButton icon="fa-handshake" label="Play a Friend" />
                    </div>
                </div>

                <div className="flex flex-col w-72">
                    <HeaderSection 
                        icon={<img src="https://www.chess.com/bundles/web/images/color-icons/puzzles.svg" className="w-12 h-12" alt="" />}
                        title="Puzzles" sub="200" extra="🔥 3"
                    />
                    <BoardCard label="Solve Puzzle" onClick={() => navigate('/puzzles')}>
                        <MiniChessBoard fen={startFen} />
                    </BoardCard>
                </div>

                <div className="flex flex-col w-72">
                    <HeaderSection 
                        icon={<div className="text-4xl text-blue-400"><i className="fas fa-graduation-cap"></i></div>}
                        title="Next Lesson" sub="Using Your Knights"
                    />
                    <BoardCard label="Start Lesson" onClick={() => navigate('/learn')}>
                        <MiniChessBoard fen={startFen} />
                    </BoardCard>
                </div>

                <div className="flex flex-col w-72">
                    <HeaderSection 
                        icon={<div className="text-4xl text-[#81b64c]"><i className="fas fa-search-plus"></i></div>}
                        title="Game Review" 
                        sub={reviewGame ? `Review vs ${reviewGame.opponent}` : "No games to review"}
                    />
                    <BoardCard 
                        label={reviewGame ? `Review vs ${reviewGame.opponent}` : "Play a game first"} 
                        onClick={() => {
                            if(reviewGame) {
                                localStorage.setItem('chessGameId', reviewGame.game_id);
                                navigate('/play');
                            } else {
                                navigate('/play');
                            }
                        }}
                    >
                        <MiniChessBoard fen={reviewGame?.last_fen || startFen} />
                    </BoardCard>
                </div>
            </div>

            {/* --- 3. ALSÓ SZEKCIÓ (History & Daily Puzzle szinkronban) --- */}
            <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                
                {/* GAME HISTORY - Magasság szinkronizálva a szomszéddal */}
                <div className="flex-1 bg-[#262421] rounded-lg border border-[#3c3a37] flex flex-col overflow-hidden">
                    <div 
                        onClick={() => navigate(`/games/archive/${username}`)} 
                        className="p-4 border-b border-[#3c3a37] bg-[#2b2926] flex justify-between items-center cursor-pointer group hover:bg-[#312e2b]"
                    >
                        <h3 className="font-bold text-white text-sm">Game History</h3>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-[#1e1e1e] text-[#8b8987] font-bold uppercase text-[10px]">
                                <tr>
                                    {/* 1. EXTRA ÜRES OSZLOP: Hogy az ikon felett ne legyen felirat, és a többi oszlop a helyére kerüljön */}
                                    <th className="p-4 w-12"></th> 
                                    
                                    {/* 2. INNENTŐL MÁR MINDEN A HELYÉN LESZ */}
                                    <th className="px-2 py-3">Players</th>
                                    <th className="px-4 py-3 text-center">Result</th>
                                    <th className="px-4 py-3 text-center">Accuracy</th>
                                    <th className="px-4 py-3 text-center">Moves</th>
                                    <th className="px-4 py-3 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#3c3a37]">
                                {gameHistory.map((game) => {
                                    // Logika a színekhez
                                    const iWasWhite = game.id % 2 === 0; 
                                    const whitePlayer = iWasWhite ? { name: "IOViktoria01", elo: game.myElo, isMe: true } : { name: game.opponent, elo: game.elo, isMe: false };
                                    const blackPlayer = iWasWhite ? { name: game.opponent, elo: game.elo, isMe: false } : { name: "IOViktoria01", elo: game.myElo, isMe: true };
                                    const whiteWon = game.result === "1-0" || (game.win && iWasWhite);
                                    const blackWon = game.result === "0-1" || (game.win && !iWasWhite);

                                    return (
                                        <tr key={game.id} className="hover:bg-[#2b2926] transition-colors cursor-pointer group h-[72px]">
                                            {/* 1. KATEGÓRIA IKON (Robot/Bot) */}
                                            <td className="px-4 py-2 w-12 text-center">
                                                <div className="text-[#8b8987] text-xl opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <i className="fas fa-robot"></i>
                                                </div>
                                            </td>

                                            {/* 2. PLAYERS (Már a megfelelő oszlop alatt) */}
                                            <td className="px-2 py-2">
                                                <div className="flex flex-col gap-1.5">
                                                    {/* Világos sor */}
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 bg-white rounded-sm ${whiteWon ? 'ring-2 ring-[#81b64c]' : ''}`}></div>
                                                        <span className={`text-[13px] ${whitePlayer.isMe ? 'font-bold text-white' : 'text-[#bab9b8]'}`}>
                                                            {whitePlayer.name} <span className="text-[#666] font-normal">({whitePlayer.elo})</span>
                                                            {whitePlayer.isMe && <span className="text-blue-400 ml-1 text-[10px]">💎</span>}
                                                        </span>
                                                    </div>
                                                    {/* Sötét sor */}
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 bg-[#3c3a37] rounded-sm ${blackWon ? 'ring-2 ring-[#81b64c]' : ''}`}></div>
                                                        <span className={`text-[13px] ${blackPlayer.isMe ? 'font-bold text-white' : 'text-[#bab9b8]'}`}>
                                                            {blackPlayer.name} <span className="text-[#666] font-normal">({blackPlayer.elo})</span>
                                                            {blackPlayer.isMe && <span className="text-blue-400 ml-1 text-[10px]">💎</span>}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 3. RESULT */}
                                            <td className="px-4 py-2">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="flex flex-col text-[13px] font-bold text-white leading-tight text-right w-4">
                                                        <span>{iWasWhite ? (game.win ? '1' : '0') : (game.win ? '0' : '1')}</span>
                                                        <span>{iWasWhite ? (game.win ? '0' : '1') : (game.win ? '1' : '0')}</span>
                                                    </div>
                                                    <div className={`w-6 h-6 flex items-center justify-center rounded-sm ${game.win ? 'bg-[#81b64c]' : 'bg-[#fa412d]'}`}>
                                                        <i className={`fas ${game.win ? 'fa-plus' : 'fa-minus'} text-[10px] text-white`}></i>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 4. ACCURACY */}
                                            <td className="px-4 py-2">
                                                <div className="flex flex-col text-[12px] font-bold leading-tight items-center">
                                                    <span className="text-[#8b8987]">80.4</span>
                                                    <span className="text-white">95.2</span>
                                                </div>
                                            </td>

                                            {/* 5. MOVES */}
                                            <td className="px-4 py-2 text-center text-[#8b8987] font-bold text-sm">
                                                {game.moves}
                                            </td>

                                            {/* 6. DATE */}
                                            <td className="px-4 py-2 text-right text-[#666] text-[11px] whitespace-nowrap">
                                                {game.date}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* DAILY PUZZLE KÁRTYA */}
                <div className="w-full lg:w-80 flex flex-col bg-[#262421] p-5 rounded-lg border border-[#3c3a37]">
                    <h3 className="font-bold text-white mb-4 text-sm">Daily Puzzle</h3>
                    <div className="aspect-square bg-[#312e2b] rounded-md mb-4 overflow-hidden border border-[#3c3a37]">
                        <img src="/assets/preview_daily.png" className="w-full h-full object-cover" alt="daily" />
                    </div>
                    <button className="w-full py-3 bg-[#81b64c] hover:bg-[#a3d16a] text-white font-bold rounded-lg transition-all shadow-lg active:scale-95 mt-auto">
                        Solve Daily Puzzle
                    </button>
                </div>
            </div>
        </div>
    );
};

/* --- SEGÉDKOMPONENSEK --- */

const HeaderSection = ({ icon, title, sub, extra }) => (
    <div className="flex items-center gap-3 mb-6 h-16">
        <div className="shrink-0">{icon}</div>
        <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-white truncate">{title}</span>
            <span className="text-xs text-[#8b8987] font-bold truncate">
                {sub} {extra && <span className="text-orange-400 ml-1">{extra}</span>}
            </span>
        </div>
    </div>
);

const MiniChessBoard = ({ fen }) => {
    const squares = useMemo(() => {
        const chess = new Chess(fen);
        const board = chess.board();
        const result = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = board[row][col];
                const squareName = `${String.fromCharCode(97 + col)}${8 - row}`;
                const isDark = (row + col) % 2 !== 0;
                result.push({ square: squareName, piece: square, isDark });
            }
        }
        return result;
    }, [fen]);

    return (
        <div className="w-[288px] h-[288px] grid grid-cols-8 grid-rows-8 border-collapse">
            {squares.map(({ square, piece, isDark }) => (
                <div key={square} className={`aspect-square relative flex items-center justify-center ${isDark ? 'bg-[#769656]' : 'bg-[#eeeed2]'}`}>
                    {piece && (
                        <img 
                            src={`/assets/pieces/${piece.color === 'w' ? 'white' : 'black'}_${piece.type === 'q' ? 'queen' : piece.type === 'n' ? 'knight' : piece.type === 'r' ? 'rook' : piece.type === 'b' ? 'bishop' : piece.type === 'p' ? 'pawn' : 'king'}.png`}
                            alt={`${piece.color}${piece.type}`}
                            className="w-[90%] h-[90%] object-contain select-none"
                        />
                    )}
                </div>
            ))}
        </div>
    );
};

const PlayButton = ({ icon, label, onClick, isMain }) => (
    <button onClick={onClick} className="flex items-center gap-4 px-5 h-[79px] rounded-lg bg-[#262421] hover:bg-[#2b2926] border border-[#3c3a37] transition-all group w-full">
        <i className={`fas ${icon} text-2xl ${isMain ? 'text-[#81b64c]' : 'text-[#8b8987] group-hover:text-white'}`}></i>
        <span className="font-bold text-white text-[15px]">{label}</span>
    </button>
);

const BoardCard = ({ children, label, onClick }) => (
    <div onClick={onClick} className="bg-[#262421] rounded-lg overflow-hidden cursor-pointer group border border-[#3c3a37] h-[340px] w-[288px] flex flex-col transition-all hover:border-[#4a4845]">
        <div className="w-[288px] h-[288px] relative overflow-hidden flex items-center justify-center bg-[#312e2b]">
            {children}
        </div>
        <div className="h-[52px] w-full flex items-center justify-center bg-[#262421] text-sm font-bold text-white group-hover:bg-[#2b2926] border-t border-[#3c3a37]">
            {label}
        </div>
    </div>
);

export default HomePage;