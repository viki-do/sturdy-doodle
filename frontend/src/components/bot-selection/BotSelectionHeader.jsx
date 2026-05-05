const BotSelectionHeader = ({ onBack }) => (
    <div className="p-4 bg-chess-panel-header border-b border-[#1b1a18] flex items-center justify-center relative shrink-0 z-50">
        <button onClick={onBack} className="absolute left-4 text-[#bab9b8] hover:text-white transition-colors cursor-pointer">
            <i className="fas fa-chevron-left"></i>
        </button>
        <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-lg leading-none">Play Bots</h2>
        </div>
    </div>
);

export default BotSelectionHeader;
