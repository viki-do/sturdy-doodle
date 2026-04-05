import React, { useState } from 'react';

const bots = [
    { id: 'martin', name: 'Martin', elo: 250, img: 'https://www.chess.com/bundles/web/images/offline-play/martin.png' },
    { id: 'elenore', name: 'Elenore', elo: 400, img: 'https://www.chess.com/bundles/web/images/offline-play/elenore.png' },
    { id: 'wayne', name: 'Wayne', elo: 1250, img: 'https://www.chess.com/bundles/web/images/offline-play/wayne.png' },
    { id: 'mateo', name: 'Mateo', elo: 1400, img: 'https://www.chess.com/bundles/web/images/offline-play/mateo.png' },
    { id: 'nora', name: 'Nora', elo: 2100, img: 'https://www.chess.com/bundles/web/images/offline-play/nora.png' },
    { id: 'stockfish', name: 'Stockfish', elo: 3200, img: 'https://www.chess.com/bundles/web/images/offline-play/stockfish.png' },
];

const BotSelectionPanel = ({ onBack, onSelectBot }) => {
    const [selectedColor, setSelectedColor] = useState('white');
    return (
        <div className="w-full h-full bg-[#262421] flex flex-col font-sans border border-[#312e2b] rounded-xl overflow-hidden">
            <div className="p-4 bg-[#21201d] border-b border-[#1b1a18] flex items-center gap-3">
                <button onClick={onBack} className="text-[#989795] hover:text-white transition-colors">
                    <i className="fas fa-chevron-left"></i>
                </button>
                <h2 className="text-white font-bold text-lg">Choose Bot & Color</h2>
            </div>

            {/* Színválasztó szekció */}
            <div className="p-4 bg-[#2b2a27] border-b border-[#1b1a18] flex justify-center gap-4">
                {['white', 'random', 'black'].map((c) => (
                    <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`px-4 py-2 rounded font-bold uppercase text-xs transition-all border-2 
                        ${selectedColor === c ? 'border-[#81b64c] bg-[#312e2b] text-white' : 'border-transparent bg-[#21201d] text-[#989795]'}`}
                    >
                        {c === 'random' ? <i className="fas fa-dice"></i> : c}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                <div className="grid grid-cols-3 gap-3">
                    {bots.map((bot) => (
                        <div 
                            key={bot.id}
                            onClick={() => onSelectBot(bot.elo, selectedColor)} // Átadjuk a színt is
                            className="bg-[#2b2a27] rounded-lg p-2 flex flex-col items-center cursor-pointer hover:bg-[#33322e] transition-all border border-transparent hover:border-[#81b64c] group"
                        >
                            <img src={bot.img} alt={bot.name} className="w-20 h-20 rounded-md mb-2 shadow-md" />
                            <span className="text-[#bab9b8] text-[13px] font-bold group-hover:text-white">{bot.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BotSelectionPanel;