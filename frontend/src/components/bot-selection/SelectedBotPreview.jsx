const SelectedBotPreview = ({ selectedBot, engineElo }) => (
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
);

export default SelectedBotPreview;
