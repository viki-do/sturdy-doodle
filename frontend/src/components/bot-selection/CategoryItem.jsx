const CategoryItem = ({ cat, isOpen, onClick }) => (
    <div onClick={onClick} className={`flex items-center justify-between p-3 bg-[#2b2a27] cursor-pointer hover:bg-[#33322e] transition-all mb-1 ${isOpen ? 'rounded-t-lg border-l-4 border-[#81b64c]' : 'rounded-lg'}`}>
        <div className="flex items-center gap-3">
            <img src={cat.icon} alt="" className="w-10 h-10 rounded object-cover shadow-sm" />
            <div>
                <div className="text-white font-bold text-sm leading-tight">{cat.name}</div>
                <div className="text-[#989795] text-xs font-semibold">{(cat.bots?.length || 0)} bots</div>
            </div>
        </div>
        <i className={`fas fa-chevron-up text-[#989795] text-[10px] transition-transform ${isOpen ? '' : 'rotate-180'}`}></i>
    </div>
);

export default CategoryItem;
