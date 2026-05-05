const AnalyzePromotionOverlay = ({ pendingPromotion, isFlipped, sandboxFen, executeAnalysisMove }) => {
    if (!pendingPromotion) return null;

    return (
        <div className="absolute z-[5000] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
            style={{
                left: `${(isFlipped ? (104 - pendingPromotion.to.charCodeAt(0)) : (pendingPromotion.to.charCodeAt(0) - 97)) * 12.5}%`,
                top: pendingPromotion.to.endsWith('8') ? '0' : 'auto',
                bottom: pendingPromotion.to.endsWith('1') ? '0' : 'auto',
                width: '12.5%'
            }}>
            {['q', 'n', 'r', 'b'].map((type) => (
                <button
                    key={type}
                    onClick={() => executeAnalysisMove(pendingPromotion.from, pendingPromotion.to, type)}
                    className="w-full aspect-square hover:bg-gray-100 p-1 border-b border-gray-100"
                >
                    <img
                        src={`/assets/pieces/${sandboxFen.split(' ')[1] === 'w' ? 'white' : 'black'}_${
                            type === 'q' ? 'queen' : type === 'n' ? 'knight' : type === 'r' ? 'rook' : 'bishop'
                        }.png`}
                        alt={type}
                    />
                </button>
            ))}
        </div>
    );
};

export default AnalyzePromotionOverlay;
