const SimpleSelect = ({ label, onClick }) => (
    <div
        onClick={onClick}
        className="w-full bg-[#1e1e1e] border border-[#3c3a37] p-2.5 rounded text-sm text-[#bab9b8] flex justify-between items-center cursor-pointer hover:border-[#666]"
    >
        <span className="truncate">{label}</span>
        <i className="fas fa-caret-down text-[#666]"></i>
    </div>
);

export default SimpleSelect;
