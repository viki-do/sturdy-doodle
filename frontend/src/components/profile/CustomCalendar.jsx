const CustomCalendar = ({ onSelect }) => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    const prevDays = [29, 30, 31];
    const nextDays = [1, 2];

    return (
        <div className="absolute top-full right-0 mt-2 bg-[#262421] border border-[#3c3a37] rounded shadow-2xl z-[200] w-64 p-4 select-none animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
                <i className="fas fa-chevron-left text-[#bab9b8] cursor-pointer hover:text-white px-2"></i>
                <span className="text-white font-bold text-sm">April 2026</span>
                <i className="fas fa-chevron-right text-[#bab9b8] cursor-pointer hover:text-white px-2"></i>
            </div>

            <div className="grid grid-cols-7 text-center gap-y-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <span key={d} className="text-[10px] text-[#666] font-bold mb-2">{d}</span>
                ))}

                {prevDays.map(d => <span key={`p-${d}`} className="text-sm text-[#444] p-1.5">{d}</span>)}

                {days.map(d => (
                    <button
                        key={d}
                        onClick={() => onSelect(`Apr ${d}, 2026`)}
                        className={`text-sm p-1.5 rounded transition-colors ${d === 9 ? 'bg-[#81b64c] text-white font-bold' : 'text-[#bab9b8] hover:bg-[#312e2b]'}`}
                    >
                        {d}
                    </button>
                ))}

                {nextDays.map(d => <span key={`n-${d}`} className="text-sm text-[#444] p-1.5">{d}</span>)}
            </div>
        </div>
    );
};

export default CustomCalendar;
