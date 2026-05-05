const MoveTabs = () => (
    <div className="flex bg-chess-panel-header text-[13px] font-bold text-[#989795] border-b border-[#1b1a18] sticky top-0 z-10">
        <div className="py-3 px-8 border-b-2 border-white text-white cursor-pointer bg-[#262421]">Moves</div>
        <div className="py-3 px-8 cursor-pointer hover:text-white transition-colors">Chat</div>
        <div className="py-3 px-8 cursor-pointer hover:text-white transition-colors">Info</div>
    </div>
);

export default MoveTabs;
