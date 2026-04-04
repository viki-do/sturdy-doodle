import React from 'react';

const bots = [
    { id: 'martin', name: 'Martin', elo: 250, img: 'https://www.chess.com/bundles/web/images/offline-play/martin.png' },
    { id: 'elenore', name: 'Elenore', elo: 400, img: 'https://www.chess.com/bundles/web/images/offline-play/elenore.png' },
    { id: 'wayne', name: 'Wayne', elo: 1250, img: 'https://www.chess.com/bundles/web/images/offline-play/wayne.png' },
    { id: 'mateo', name: 'Mateo', elo: 1400, img: 'https://www.chess.com/bundles/web/images/offline-play/mateo.png' },
    { id: 'nora', name: 'Nora', elo: 2100, img: 'https://www.chess.com/bundles/web/images/offline-play/nora.png' },
    { id: 'stockfish', name: 'Stockfish', elo: 3200, img: 'https://www.chess.com/bundles/web/images/offline-play/stockfish.png' },
];

const BotSelectionPanel = ({ onBack, onSelectBot }) => {
    return (
        <div className="w-full h-full bg-[#262421] flex flex-col font-sans border border-[#312e2b] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-[#21201d] border-b border-[#1b1a18] flex items-center gap-3">
                <button onClick={onBack} className="text-[#989795] hover:text-white transition-colors">
                    <i className="fas fa-chevron-left"></i>
                </button>
                <h2 className="text-white font-bold text-lg">Adaptive Bots</h2>
            </div>

            {/* Scrollable grid */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                <div className="grid grid-cols-3 gap-3">
                    {bots.map((bot) => (
                        <div 
                            key={bot.id}
                            onClick={() => onSelectBot(bot.elo)}
                            className="bg-[#2b2a27] rounded-lg p-2 flex flex-col items-center cursor-pointer hover:bg-[#33322e] transition-all border border-transparent hover:border-[#81b64c] group"
                        >
                            <div className="relative">
                                <img src={bot.img} alt={bot.name} className="w-20 h-20 rounded-md mb-2 shadow-md" />
                                <div className="absolute -bottom-1 -right-1 bg-[#81b64c] text-white text-[10px] px-1 font-bold rounded">
                                    {bot.elo}
                                </div>
                            </div>
                            <span className="text-[#bab9b8] text-[13px] font-bold group-hover:text-white">{bot.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer / Info */}
            <div className="p-4 bg-[#21201d] text-center">
                <p className="text-[#989795] text-xs">
                    Choose a bot to play against. They adapt to your strength!
                </p>
            </div>
        </div>
    );
};

export default BotSelectionPanel;