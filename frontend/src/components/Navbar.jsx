import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';

const Navbar = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('chessUsername');

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
        window.location.reload();
    };

    return (
        <nav className="flex justify-between items-center px-10 py-2.5 bg-[#262421] border-b border-[#454241] text-white sticky top-0 z-1000">
            {/* Logo Szekció */}
            <Link to="/play" className="flex items-center gap-2.5 no-underline text-white group">
                <img 
                    src="/assets/pieces/white_pawn.png" 
                    className="w-7.5 transition-transform group-hover:scale-110" 
                    alt="logo" 
                />
                <span className="font-bold text-xl tracking-tight">
                    Checkmate<span className="text-[#81b64c]">.com</span>
                </span>
            </Link>

            {/* Felhasználói Szekció */}
            <div className="flex items-center gap-5">
                {/* Profil link */}
                <div 
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => navigate('/profile')}
                >
                    <div className="w-8 h-8 bg-[#454241] rounded flex justify-center items-center group-hover:bg-[#55524f] transition-colors">
                        <User size={20} className="text-[#81b64c]" />
                    </div>
                    <span className="font-semibold group-hover:text-[#81b64c] transition-colors">
                        {username}
                    </span>
                </div>

                {/* Kijelentkezés gomb */}
                <button 
                    onClick={handleLogout} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-[#454241] rounded text-[#8b8987] hover:text-white hover:bg-chess-bg hover:border-[#55524f] transition-all cursor-pointer"
                >
                    <LogOut size={16} />
                    <span className="text-sm font-medium">Logout</span>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;