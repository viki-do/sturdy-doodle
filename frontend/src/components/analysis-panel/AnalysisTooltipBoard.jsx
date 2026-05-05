import ChessBoardGrid from '../ChessBoardGrid';

const AnalysisTooltipBoard = ({ tooltip }) => {
    if (!tooltip.visible || !tooltip.fen) return null;

    return (
        <div
            className="fixed z-[9999] pointer-events-none bg-[#21201d] p-1 rounded-sm shadow-2xl border-4 border-[#3c3a37] animate-in fade-in zoom-in duration-100"
            style={{
                left: tooltip.x - 260,
                top: tooltip.y - 120
            }}
        >
            <div className="w-52 h-52">
                <ChessBoardGrid
                    gameLogic={{
                        fen: tooltip.fen,
                        status: "viewing",
                        history: [],
                        lastMove: {from:null, to:null}
                    }}
                />
            </div>
        </div>
    );
};

export default AnalysisTooltipBoard;
