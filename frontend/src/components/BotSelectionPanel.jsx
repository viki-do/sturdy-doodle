import React, { useState, useEffect } from 'react';
import { botCategories, engineEloSteps } from '../constants/bots';

const BotSelectionPanel = ({ onBack, onSelectBot, onTimeChange, onColorChange, onPreviewChange }) => {
    const [selectedBot, setSelectedBot] = useState(() => {
        const saved = localStorage.getItem('lastSelectedBot');
        return saved ? JSON.parse(saved) : botCategories[0].bots[0];
    });

    const [botSettings, setBotSettings] = useState(() => {
        const saved = localStorage.getItem('botSettings');
        return saved ? JSON.parse(saved) : {};
    });

    const [timeControl, setTimeControl] = useState('No Timer');
    const [selectedColor, setSelectedColor] = useState('white');
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [engineElo, setEngineElo] = useState(2200);
    const [features, setFeatures] = useState({
        evalBar: false, threatArrows: false, suggestionArrows: false, moveFeedback: false, engine: false
    });

    useEffect(() => {
        if (selectedBot) {
            const settings = botSettings[selectedBot.id] || {};
            const savedTime = settings.time || 'No Timer';
            const savedColor = settings.color || 'white';
            setTimeControl(savedTime);
            setSelectedColor(savedColor);
            if (onColorChange) onColorChange(savedColor);
            if (onTimeChange) onTimeChange(savedTime);
            if (selectedBot.id === 'engine') setEngineElo(selectedBot.elo || 2200);
        }
    }, []);

    const handleBotChange = (bot) => {
        setSelectedBot(bot);
        localStorage.setItem('lastSelectedBot', JSON.stringify(bot));

        if (onPreviewChange) {
        onPreviewChange(bot); // Azonnal szólunk a GameBoardnak, hogy változott a választás
    }
        const settings = botSettings[bot.id] || {};
        const newTime = settings.time || 'No Timer';
        const newColor = settings.color || 'white';
        setTimeControl(newTime);
        setSelectedColor(newColor);
        if (onTimeChange) onTimeChange(newTime);
        if (onColorChange) onColorChange(newColor);
    };

    useEffect(() => {
    if (selectedBot && onPreviewChange) {
        onPreviewChange(selectedBot);
    }
}, []);

    const handleSetTime = (time) => {
        setTimeControl(time); 
        const newSettings = { 
            ...botSettings, 
            [selectedBot.id]: { ...(botSettings[selectedBot.id] || {}), time: time, color: selectedColor } 
        };
        setBotSettings(newSettings);
        localStorage.setItem('botSettings', JSON.stringify(newSettings));
        if (onTimeChange) onTimeChange(time);
    };

    const handleSetColor = (color) => {
        setSelectedColor(color);
        const newSettings = { 
            ...botSettings, 
            [selectedBot.id]: { ...(botSettings[selectedBot.id] || {}), time: timeControl, color: color } 
        };
        setBotSettings(newSettings);
        localStorage.setItem('botSettings', JSON.stringify(newSettings));
        if (onColorChange) onColorChange(color);
    };
    
   const handleSliderChange = (e) => {
    const rawVal = parseInt(e.target.value);
    const closestElo = engineEloSteps.reduce((prev, curr) => {
        return (Math.abs(curr - rawVal) < Math.abs(prev - rawVal) ? curr : prev);
    });
    setEngineElo(closestElo);
    
    const engineBot = { 
    id: 'engine', 
    name: 'Engine', 
    elo: closestElo, 
    img: null, 
    isEngine: true 
};
    handleBotChange(engineBot); // Ez fogja meghívni az onPreviewChange-et
};

    const toggleFeature = (key) => {
        setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="w-full h-full bg-[#262421] flex flex-col font-sans border border-chess-bg rounded-xl overflow-hidden relativow-2xl">
            <div className="p-4 bg-chess-panel-header border-b border-[#1b1a18] flex items-center justify-center relative shrink-0 z-50">
                <button onClick={onBack} className="absolute left-4 text-[#bab9b8] hover:text-white transition-colors cursor-pointer">
                    <i className="fas fa-chevron-left"></i>
                </button>
                <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-lg leading-none">Play Bots</h2>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col">
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
                            <img src={selectedBot?.img} alt="" className="w-24 h-24 rounded-xl object-cover " />
                        )}
                    </div>
                    <div className="text-center">
                        <h3 className="text-white text-2xl font-black flex items-center justify-center gap-2">
                            {selectedBot?.name} {selectedBot?.country}
                        </h3>
                        <p className="text-[#bab9b8] font-bold text-lg opacity-80">{selectedBot?.elo}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-28">
                    {!isOptionsOpen ? (
                        <div className="flex flex-col gap-2">
                            {botCategories.map((cat) => (
                                <div key={cat.id} className="flex flex-col">
                                    <CategoryItem 
                                        cat={cat} 
                                        isOpen={expandedCategory === cat.id} 
                                        onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)} 
                                    />
                                    {expandedCategory === cat.id && cat.bots.length > 0 && (
                                        <div className="grid grid-cols-4 gap-2 p-3 bg-chess-panel-header rounded-b-lg border-x border-b border-[#3d3a37]/30 animate-in fade-in duration-200">
                                            {cat.bots.map(bot => (
                                                <div 
                                                    key={bot.id} 
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

                            <div className="bg-[#2b2a27] rounded-lg p-4 mt-2 border border-transparent flex flex-col gap-4 select-none">
                                <div className="flex justify-between items-center">
                                    <span className="text-white text-xl font-bold">Engine</span>
                                    <span className="text-[#989795] text-sm font-bold">25 bots</span>
                                </div>
                                <div className="relative h-10 flex items-center px-1">
                                    <div className="absolute w-full h-0.5 bg-[#3d3a37]"></div>
                                    <div className="absolute h-0.5 bg-[#81b64c] transition-all duration-150" style={{ width: `${((engineElo - 250) / (3200 - 250)) * 100}%` }}></div>
                                    <div className="absolute w-full flex justify-between px-0.5">
                                        {[250, 1000, 1600, 2000, 2400, 3200].map(tick => (
                                            <div key={tick} className={`w-px h-3 -translate-y-1.5 transition-colors ${engineElo >= tick ? 'bg-[#81b64c]' : 'bg-[#3d3a37]'}`}></div>
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
                        <div className="flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
                            <button 
                                className={`w-full py-4 mb-6 rounded-lg font-bold border-2 transition-all 
                                ${timeControl === 'No Timer' ? 'border-[#81b64c] bg-[#2b2a27] text-white' : 'border-transparent bg-[#3d3a37] text-[#989795]'}`}
                                onClick={() => handleSetTime('No Timer')}
                            >
                                No Timer
                            </button>
                            <TimeGroup label="Bullet" icon="fa-bolt-lightning" color="text-yellow-500" times={['1 min', '1 | 1', '2 | 1']} current={timeControl} onSelect={handleSetTime} />
                            <TimeGroup label="Blitz" icon="fa-bolt" color="text-yellow-400" times={['3 | 2', '5 min', '5 | 5']} current={timeControl} onSelect={handleSetTime} />
                            <TimeGroup label="Rapid" icon="fa-stopwatch" color="text-[#81b64c]" times={['10 min', '15 | 10', '30 min', '10 | 5', '20 min', '60 min']} current={timeControl} onSelect={handleSetTime} />

                            {/* --- ÚJRA VISSZARAKOTT ENGINE SWITCH SZEKCIÓ --- */}
                            {selectedBot?.id === 'engine' && (
                                <div className="mt-4 pt-6 border-t border-[#3d3a37] flex flex-col gap-4 pb-4">
                                    <Switch label="Evaluation Bar" active={features.evalBar} onClick={() => toggleFeature('evalBar')} />
                                    <Switch label="Threat Arrows" active={features.threatArrows} onClick={() => toggleFeature('threatArrows')} desc="Green arrows show moves to consider." />
                                    <Switch label="Suggestion Arrows" active={features.suggestionArrows} onClick={() => toggleFeature('suggestionArrows')} />
                                    <Switch label="Move Feedback" active={features.moveFeedback} onClick={() => toggleFeature('moveFeedback')} />
                                    <Switch label="Engine" active={features.engine} onClick={() => toggleFeature('engine')} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 bg-[#262421] border-t border-[#1b1a18] flex flex-col gap-4 z-100">
                <div className="flex items-center justify-between gap-2">
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

                    <div className="flex gap-1.5 p-1 bg-chess-panel-header rounded-lg border border-[#3d3a37]/30">
                        {['white', 'random', 'black'].map((c) => (
                            <button
                                key={c}
                                onClick={() => handleSetColor(c)}
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

                <button 
                    onClick={() => onSelectBot(selectedBot, selectedColor, timeControl)}
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

const TimeGroup = ({ label, icon, color, times, current, onSelect }) => (
    <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 text-[#989795] text-[11px] font-black uppercase tracking-widest">
            <i className={`fas ${icon} ${color}`}></i> {label}
        </div>
        <div className="grid grid-cols-3 gap-2">
            {times.map(t => (
                <button 
                    key={t} 
                    onClick={() => onSelect(t)} 
                    className={`py-3 rounded-lg text-[13px] font-bold transition-all border-2
                    ${current === t ? 'border-[#81b64c] bg-[#2b2a27] text-white' : 'border-transparent bg-[#3d3a37] text-[#bab9b8] hover:text-white'}`}
                >
                    {t}
                </button>
            ))}
        </div>
    </div>
);

const Switch = ({ label, active, onClick, desc }) => (
    <div className="flex flex-col mb-1">
        <div className="flex items-center justify-between cursor-pointer group py-1" onClick={onClick}>
            <span className="text-[#bab9b8] font-bold text-sm group-hover:text-white transition-colors">{label}</span>
            <div className={`w-10 h-5.5 rounded-full relative transition-colors ${active ? 'bg-[#81b64c]' : 'bg-[#3d3a37]'}`}>
                <div className={`absolute top-0.75 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-5.25' : 'left-0.75'}`}></div>
            </div>
        </div>
        {desc && <span className="text-[#666] text-[11px] font-medium leading-tight">{desc}</span>}
    </div>
);

export default BotSelectionPanel;