const EndGameSummary = ({ finalResult, showEndGameUI }) => {
    if (!showEndGameUI || !finalResult) return null;

    return (
        <div className="mt-4 mx-2 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between px-4 py-4 bg-chess-panel-header border border-chess-bg rounded-md shadow-inner">
                <div className="flex items-center gap-4">
                    <span className="text-white font-black text-2xl tracking-tighter">{finalResult.score}</span>
                    <div className="flex flex-col">
                        <span className="text-white font-bold text-sm leading-none">{finalResult.winnerText}</span>
                        <span className="text-[#989795] text-[11px] uppercase font-bold tracking-wider mt-1">{finalResult.reasonText}</span>
                    </div>
                </div>
                <div className="flex items-center justify-center w-10 h-10 bg-[#2b2a27] rounded-full border border-chess-bg">
                    <i className="fas fa-trophy text-[#fbbf24] text-lg"></i>
                </div>
            </div>
        </div>
    );
};

export default EndGameSummary;
