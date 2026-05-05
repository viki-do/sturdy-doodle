const AccuracyHeader = ({ analysisData }) => {
    if (!analysisData) return null;

    return (
        <div className="p-3 bg-chess-panel-header border-b border-[#3c3a37] flex justify-around items-center">
            <div className="text-center">
                <div className="text-[10px] text-[#8b8987] uppercase font-bold">Accuracy</div>
                <div className="text-xl font-black text-white">{analysisData.overall_accuracy}%</div>
            </div>
        </div>
    );
};

export default AccuracyHeader;
