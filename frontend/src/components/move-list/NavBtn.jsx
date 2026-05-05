const NavBtn = ({ icon, onClick, active }) => (
    <button
        onClick={active ? onClick : undefined}
        className={`w-14 h-10 rounded bg-chess-bg flex justify-center items-center text-[#bab9b8] transition-colors ${active ? 'hover:bg-[#3b3835] cursor-pointer text-white' : 'opacity-40 cursor-not-allowed'}`}
    >
        <i className={`fas ${icon} text-sm`}></i>
    </button>
);

export default NavBtn;
