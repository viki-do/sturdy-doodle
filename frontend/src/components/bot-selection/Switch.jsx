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

export default Switch;
