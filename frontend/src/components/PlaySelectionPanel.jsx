import React from 'react';
import { Zap, Monitor, GraduationCap, Users, Trophy, Dices } from 'lucide-react';

const PlaySelectionPanel = ({ onStartGame }) => {
    return (
        /* A külső keret hajszálpontosan ugyanaz, mint a MoveListPanel-é */
        <div className="w-112.5 h-180 bg-[#262421] rounded-xl border border-chess-bg overflow-hidden flex flex-col font-sans">
            
            {/* Fejléc - Ugyanaz a magasság és háttér, mint a MoveList-nél */}
            <div className="p-5 border-b border-[#1b1a18] bg-chess-panel-header flex items-center justify-center gap-3">
                <img src="/assets/pieces/white_king.png" className="w-7 h-7" alt="king" />
                <h2 className="text-2xl font-bold text-white">Play Chess</h2>
            </div>

            {/* Módok listája - görgethető terület */}
            <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto no-scrollbar bg-[#2b2926]">
                <ModeButton 
                    icon={<Zap size={28} className="text-yellow-400 fill-yellow-400" />}
                    title="Play Online"
                    desc="Play vs a person of similar skill"
                />
                <ModeButton 
                    icon={<Monitor size={28} className="text-blue-400" />}
                    title="Play Bots"
                    desc="Challenge a bot from Easy to Master"
                    highlight={true}
                    onClick={onStartGame}
                />
                <ModeButton 
                    icon={<GraduationCap size={28} className="text-pink-400" />}
                    title="Play Coach"
                    desc="Learn as you play a game with Coach"
                />
                <ModeButton 
                    icon={<Users size={28} className="text-orange-400" />}
                    title="Play a Friend"
                    desc="Invite a friend to a game of chess"
                />
            </div>
            
            {/* Üres alsó rész, hogy vizuálisan lezárja a panelt, ahol a MoveList-nél a navigáció van */}
            <div className="p-4 bg-[#262421] border-t border-[#1b1a18] h-20">
                <p className="text-[#666] text-xs text-center italic">Choose a mode to start your journey</p>
            </div>
        </div>
    );
};

const ModeButton = ({ icon, title, desc, onClick, highlight }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all border border-transparent text-left group
        ${highlight ? 'bg-chess-bg hover:border-white/10' : 'bg-chess-panel-header/40 hover:bg-chess-bg hover:border-white/5'}`}
    >
        <div className="shrink-0 transition-transform group-hover:scale-105">{icon}</div>
        <div className="flex-1">
            <h3 className="text-md font-bold text-white">{title}</h3>
            <p className="text-xs text-[#8b8987]">{desc}</p>
        </div>
    </button>
);

export default PlaySelectionPanel;