import React, { useState } from 'react';

const botCategories = [
    { id: 'beginner', name: 'Beginner', elo: 250, icon: 'https://www.chess.com/bundles/web/images/offline-play/martin.png', bots: [
        { id: 'martin', name: 'Martin', elo: 250, img: 'https://www.chess.com/bundles/web/images/offline-play/martin.png' },
        { id: 'elenore', name: 'Elenore', elo: 400, img: 'https://www.chess.com/bundles/web/images/offline-play/elenore.png' }
    ]},
    { id: 'intermediate', name: 'Intermediate', elo: 1000, icon: 'https://www.chess.com/bundles/web/images/offline-play/wayne.png', bots: [
        { id: 'wayne', name: 'Wayne', elo: 1000, img: 'https://www.chess.com/bundles/web/images/offline-play/wayne.png' }
    ]},
    { id: 'top_players', name: 'Top Players', elo: 2800, icon: 'https://www.chess.com/bundles/web/images/offline-play/hikaru.png', bots: [
        { id: 'hikaru', name: 'Hikaru', elo: 2820, img: 'https://www.chess.com/bundles/web/images/offline-play/hikaru.png', country: '🇺🇸' }
    ]}
];

const engineEloSteps = [
    250, 400, 550, 700, 850, 1000, 
    1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 
    2100, 2200, 2300, 2400, 2500, 2600, 2700, 
    2900, 3200
];

const BotSelectionPanel = ({ onBack, onSelectBot, onTimeChange }) => {
    // --- 1. ÁLLAPOTOK INICIALIZÁLÁSA (LocalStorage-ból vagy default) ---
    const [selectedBot, setSelectedBot] = useState(() => {
        const saved = localStorage.getItem('lastSelectedBot');
        return saved ? JSON.parse(saved) : botCategories[0].bots[0];
    });

    // expandedCategory default null, hogy minden csukva legyen
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [selectedColor, setSelectedColor] = useState('white');
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [timeControl, setTimeControl] = useState('No Timer');
    
    // Engine Elo inicializálása: ha a mentett bot engine volt, annak az Elo-ját használjuk
    const [engineElo, setEngineElo] = useState(() => {
        return selectedBot?.id === 'engine' ? selectedBot.elo : 2200;
    });

    const [features, setFeatures] = useState({
        evalBar: false, threatArrows: false, suggestionArrows: false, moveFeedback: false, engine: false
    });

    // --- 2. SEGÉDFÜGGVÉNYEK ---
    const isEngineSelected = selectedBot?.id === 'engine';

    const handleSetTime = (time) => {
    setTimeControl(time);
    if (onTimeChange) onTimeChange(time); // Ha No Timer-t küld, a GameBoard elrejti az órát
};

    // Közös mentési funkció minden bot választáshoz
    const handleBotChange = (bot) => {
        setSelectedBot(bot);
        localStorage.setItem('lastSelectedBot', JSON.stringify(bot));
    };

    const handleSliderChange = (e) => {
        const rawVal = parseInt(e.target.value);
        
        // Megkeressük a legközelebbi értéket a fix skálán
        const closestElo = engineEloSteps.reduce((prev, curr) => {
            return (Math.abs(curr - rawVal) < Math.abs(prev - rawVal) ? curr : prev);
        });

        setEngineElo(closestElo);
        const engineBot = { 
            id: 'engine', 
            name: closestElo >= 2400 ? 'Expert' : closestElo >= 1200 ? 'Intermediate' : 'Beginner', 
            elo: closestElo, 
            isEngine: true 
        };
        handleBotChange(engineBot);
    };

    const toggleFeature = (key) => {
        setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="w-full h-full bg-[#262421] flex flex-col font-sans border border-chess-bg rounded-xl overflow-hidden relative shadow-2xl">
            {/* 1. FIX FEJLÉC */}
            <div className="p-4 bg-chess-panel-header border-b border-[#1b1a18] flex items-center justify-center relative shrink-0 z-50">
                <button onClick={onBack} className="absolute left-4 text-[#bab9b8] hover:text-white transition-colors cursor-pointer">
                    <i className="fas fa-chevron-left"></i>
                </button>
                <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-lg leading-none">Play Bots</h2>
                </div>
            </div>

            {/* 2. DINAMIKUS TARTALOM TERÜLET */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                
                {/* BOT INFORMÁCIÓ (Mindig látszik felül) */}
                <div className="p-6 flex flex-col items-center shrink-0 bg-[#262421] z-10">
                    <div className="relative mb-3">
                        {selectedBot?.id === 'engine' ? (
                            <div className="w-24 h-24 bg-[#3d3a37] rounded-xl flex items-center justify-center border-4 border-[#2b2a27] shadow-xl relative overflow-hidden">
                                <div className="absolute inset-0 opacity-20 border-[6px] border-dashed border-white"></div>
                                <span className="text-3xl font-black text-white z-10 uppercase">
                                    {engineElo >= 2700 ? '24' : engineElo >= 1800 ? '18' : engineElo >= 1000 ? '12' : '6'}
                                </span>
                            </div>
                        ) : (
                            <img src={selectedBot?.img} alt="" className="w-24 h-24 rounded-xl object-cover shadow-2xl border-4 border-[#2b2a27]" />
                        )}
                    </div>
                    <div className="text-center">
                        <h3 className="text-white text-2xl font-black flex items-center justify-center gap-2">
                            {selectedBot?.name} {selectedBot?.country}
                        </h3>
                        <p className="text-[#bab9b8] font-bold text-lg opacity-80">{selectedBot?.elo}</p>
                    </div>
                </div>

                {/* GÖRDÜLŐ RÉSZ: KATEGÓRIÁK VAGY OPTIONS */}
                <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-28">
                    {!isOptionsOpen ? (
                        /* --- KATEGÓRIA LISTA NÉZET --- */
                        <div className="flex flex-col gap-2">
                            {botCategories.map((cat) => (
                        <div key={cat.id} className="flex flex-col">
                            <CategoryItem 
                                cat={cat} 
                                isOpen={expandedCategory === cat.id} 
                                onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)} 
                            />
                            {expandedCategory === cat.id && cat.bots.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 p-3 bg-[#21201d] rounded-b-lg border-x border-b border-[#3d3a37]/30 animate-in fade-in duration-200">
                                    {cat.bots.map(bot => (
                                        <div 
                                            key={bot.id} 
                                            // Itt használjuk az új handleBotChange függvényt a setSelectedBot helyett
                                            onClick={() => handleBotChange(bot)} 
                                            className={`aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all 
                                            ${selectedBot?.id === bot.id ? 'border-[#81b64c]' : 'border-transparent hover:border-[#3d3a37]'}`}
                                        >
                                            <img src={bot.img} alt={bot.name} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                            {/* FIX ENGINE KÁRTYA (Mágneses Slider) */}
                            <div className="bg-[#2b2a27] rounded-lg p-4 mt-2 border border-transparent flex flex-col gap-4 select-none">
                                <div className="flex justify-between items-center">
                                    <span className="text-white text-xl font-bold">Engine</span>
                                    <span className="text-[#989795] text-sm font-bold">25 bots</span>
                                </div>
                                <div className="relative h-10 flex items-center px-1">
                                    <div className="absolute w-full h-[2px] bg-[#3d3a37]"></div>
                                    <div className="absolute h-[2px] bg-[#81b64c] transition-all duration-150" style={{ width: `${((engineElo - 250) / (3200 - 250)) * 100}%` }}></div>
                                    <div className="absolute w-full flex justify-between px-0.5">
                                        {[250, 1000, 1600, 2000, 2400, 3200].map(tick => (
                                            <div key={tick} className={`w-[1px] h-3 -translate-y-1.5 transition-colors ${engineElo >= tick ? 'bg-[#81b64c]' : 'bg-[#3d3a37]'}`}></div>
                                        ))}
                                    </div>
                                    <input type="range" min="250" max="3200" step="1" value={engineElo} onChange={handleSliderChange} className="absolute w-full opacity-0 cursor-pointer z-10 h-full" />
                                    <div className="absolute w-8 h-8 bg-white rounded-full shadow-xl pointer-events-none z-0 flex items-center justify-center transition-all duration-150" style={{ left: `calc(${((engineElo - 250) / (3200 - 250)) * 100}% - 16px)` }}>
                                        <div className="w-full h-full rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"></div>
                                    </div>
                                </div>
                                <div className="flex justify-between text-[#989795] text-[13px] font-bold px-0.5">
                                    <span>250</span><span>1000</span><span>1600</span><span>2000</span><span>2400</span><span>3200</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* --- OPTIONS DROPDOWN NÉZET (Megfordított sorrend) --- */
                        <div className="flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
                            {/* No Timer (Legalul a képen, nálunk a lista elején a sorrend miatt) */}
                            <button 
                                className={`w-full py-4 mb-6 rounded-lg font-bold border-2 transition-all 
                                ${timeControl === 'No Timer' ? 'border-[#81b64c] bg-[#2b2a27] text-white' : 'border-transparent bg-[#3d3a37] text-[#989795]'}`}
                                onClick={() => handleSetTime('No Timer')}
                            >
                                No Timer
                            </button>

                            {/* Bullet (1 min, stb) */}
                            <TimeGroup label="Bullet" icon="fa-bolt-lightning" color="text-yellow-500" times={['1 min', '1 | 1', '2 | 1']} current={timeControl} set={setTimeControl} onSelect={handleSetTime} />
                            
                            {/* Blitz (3 | 2, stb) */}
                            <TimeGroup label="Blitz" icon="fa-bolt" color="text-yellow-400" times={['3 | 2', '5 min', '5 | 5']} current={timeControl} set={setTimeControl} onSelect={handleSetTime} />
                            
                            {/* Rapid (10 min, stb - Ez van legfelül) */}
                            <TimeGroup label="Rapid" icon="fa-stopwatch" color="text-[#81b64c]" times={['10 min', '15 | 10', '30 min', '10 | 5', '20 min', '60 min']} current={timeControl} set={setTimeControl} onSelect={handleSetTime} />

                            {/* Csak Engine esetén megjelenő funkciók */}
                            {selectedBot?.id === 'engine' && (
                                <div className="mt-4 pt-6 border-t border-[#3d3a37] flex flex-col gap-4 pb-4">
                                    <Switch label="Evaluation Bar" active={features.evalBar} onClick={() => toggleFeature('evalBar')} />
                                    <Switch label="Threat Arrows" active={features.threatArrows} onClick={() => toggleFeature('threatArrows')} />
                                    <Switch label="Suggestion Arrows" active={features.suggestionArrows} onClick={() => toggleFeature('suggestionArrows')} />
                                    <Switch label="Move Feedback" active={features.moveFeedback} onClick={() => toggleFeature('moveFeedback')} />
                                    <Switch label="Engine" active={features.engine} onClick={() => toggleFeature('engine')} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. FIX ALSÓ VEZÉRLŐK */}
            <div className="p-4 bg-[#262421] border-t border-[#1b1a18] flex flex-col gap-4 z-[100]">
                <div className="flex items-center justify-between gap-2">
                    {/* Dynamic Options Button */}
                    <div 
                        onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                        className={`flex-1 h-12 rounded-lg flex items-center px-4 cursor-pointer transition-all border-2 
                        ${isOptionsOpen ? 'border-[#81b64c] bg-[#2b2a27]' : 'border-transparent bg-[#3d3a37] hover:bg-[#454240]'}`}
                    >
                        <i className={`fas fa-stopwatch mr-3 ${timeControl !== 'No Timer' ? 'text-[#81b64c]' : 'text-[#bab9b8]'}`}></i>
                        <span className="text-white font-bold text-[15px] flex-1">
                            {timeControl === 'No Timer' ? 'Options' : timeControl}
                        </span>
                        <i className={`fas fa-chevron-up text-[#989795] text-[10px] transition-transform ${isOptionsOpen ? '' : 'rotate-180'}`}></i>
                    </div>

                    {/* Színválasztó */}
                    <div className="flex gap-1.5 p-1 bg-[#21201d] rounded-lg border border-[#3d3a37]/30">
                        {['white', 'random', 'black'].map((c) => (
                            <button
                                key={c}
                                onClick={() => setSelectedColor(c)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border-2 
                                ${selectedColor === c ? 'border-[#81b64c] bg-[#2b2a27]' : 'border-transparent hover:bg-[#3d3a37]'}`}
                            >
                                {c === 'random' ? (
                                    <span className={`font-bold text-xl ${selectedColor === c ? 'text-white' : 'text-[#bab9b8]'}`}>?</span>
                                ) : (
                                    <img 
                                        src={`/assets/pieces/${c}_king.png`} 
                                        alt={c} 
                                        className={`w-7 h-7 ${selectedColor === c ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`} 
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* PLAY GOMB */}
                <button 
                    onClick={() => onSelectBot(selectedBot.elo, selectedColor, timeControl)}
                    className="w-full py-4 bg-[#81b64c] hover:bg-[#95c95d] text-white font-black text-2xl uppercase rounded-lg shadow-[0_4px_0_0_#457528] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                >
                    Play
                </button>
            </div>
        </div>
    );
};

const CategoryItem = ({ cat, isOpen, onClick }) => (
    <div onClick={onClick} className={`flex items-center justify-between p-3 bg-[#2b2a27] cursor-pointer hover:bg-[#33322e] transition-all mb-1 ${isOpen ? 'rounded-t-lg border-l-4 border-[#81b64c]' : 'rounded-lg'}`}>
        <div className="flex items-center gap-3">
            <img src={cat.icon} alt="" className="w-10 h-10 rounded object-cover shadow-sm" />
            <div>
                <div className="text-white font-bold text-sm leading-tight">{cat.name}</div>
                <div className="text-[#989795] text-xs font-semibold">{(cat.bots?.length || 0)} bots</div>
            </div>
        </div>
        <i className={`fas fa-chevron-up text-[#989795] text-[10px] transition-transform ${isOpen ? '' : 'rotate-180'}`}></i>
    </div>
);

const TimeGroup = ({ label, icon, color, times, current, set, onSelect }) => ( // onSelect hozzáadva
    <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 text-[#989795] text-[11px] font-black uppercase tracking-widest">
            <i className={`fas ${icon} ${color}`}></i> {label}
        </div>
        <div className="grid grid-cols-3 gap-2">
            {times.map(t => (
                <button 
                    key={t} 
                    onClick={() => onSelect(t)} // Itt most már az onSelect-et hívjuk
                    className={`py-3 rounded-lg text-[13px] font-bold transition-all border-2
                    ${current === t ? 'border-[#81b64c] bg-[#2b2a27] text-white' : 'border-transparent bg-[#3d3a37] text-[#bab9b8] hover:text-white'}`}
                >
                    {t}
                </button>
            ))}
        </div>
    </div>
);

const Switch = ({ label, active, onClick }) => (
    <div className="flex items-center justify-between cursor-pointer group py-1" onClick={onClick}>
        <span className="text-[#bab9b8] font-bold text-sm group-hover:text-white transition-colors">{label}</span>
        <div className={`w-10 h-5.5 rounded-full relative transition-colors ${active ? 'bg-[#81b64c]' : 'bg-[#3d3a37]'}`}>
            <div className={`absolute top-0.75 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-5.25' : 'left-0.75'}`}></div>
        </div>
    </div>
);

export default BotSelectionPanel;