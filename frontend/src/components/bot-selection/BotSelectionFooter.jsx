const BotSelectionFooter = ({
    timeControl,
    selectedColor,
    isOptionsOpen,
    onOptionsToggle,
    onSetColor,
    onPlay,
}) => (
    <div className="p-4 bg-[#262421] border-t border-[#1b1a18] flex flex-col gap-4 z-100">
        <div className="flex items-center justify-between gap-2">
            <div
                onClick={onOptionsToggle}
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
                        onClick={() => onSetColor(c)}
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
            onClick={onPlay}
            className="w-full py-4 bg-[#81b64c] hover:bg-[#95c95d] text-white font-black text-2xl uppercase rounded-lg shadow-[0_4px_0_0_#457528] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
        >
            Play
        </button>
    </div>
);

export default BotSelectionFooter;
