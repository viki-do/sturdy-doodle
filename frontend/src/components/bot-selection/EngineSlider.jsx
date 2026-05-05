const EngineSlider = ({ engineElo, onChange }) => (
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
            <input type="range" min="250" max="3200" step="1" value={engineElo} onChange={onChange} className="absolute w-full opacity-0 cursor-pointer z-10 h-full" />
            <div className="absolute w-8 h-8 bg-white rounded-full shadow-xl pointer-events-none z-0 flex items-center justify-center transition-all duration-150" style={{ left: `calc(${((engineElo - 250) / (3200 - 250)) * 100}% - 16px)` }}>
                <div className="w-full h-full rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"></div>
            </div>
        </div>
        <div className="flex justify-between text-[#989795] text-[13px] font-bold px-0.5">
            <span>250</span><span>1000</span><span>1600</span><span>2000</span><span>2400</span><span>3200</span>
        </div>
    </div>
);

export default EngineSlider;
