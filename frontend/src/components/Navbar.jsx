import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
    Gamepad2,
    Puzzle,
    GraduationCap,
    Microscope,
    Search,
    User,
    Settings,
    Bell,
    LogOut,
    Users,
    Cpu,
    Zap,
    History
} from 'lucide-react';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const username = localStorage.getItem('chessUsername');
    const [isPlayHovered, setIsPlayHovered] = useState(false);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
        window.location.reload();
    };

    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <aside className="w-35 lg:w-40 h-screen bg-[#262421] flex flex-col py-4 border-r border-[#3c3a37] sticky top-0 left-0 z-[1000]">
            {/* Logo */}
            <div
                onClick={() => navigate('/home')}
                className="flex flex-col items-center gap-1 mb-8 no-underline text-white group px-2 text-center cursor-pointer"
            >
                <img
                    src="/assets/pieces/white_pawn.png"
                    className="w-10 transition-transform group-hover:scale-110"
                    alt="logo"
                />
                <span className="font-bold text-lg leading-tight tracking-tight">
                    Checkmate<span className="text-[#81b64c]">.com</span>
                </span>
            </div>

            <nav className="flex-1 flex flex-col gap-1 px-1 relative">
                
                {/* --- PLAY DROPDOWN CONTAINER --- */}
                <div 
                    className="relative"
                    onMouseEnter={() => setIsPlayHovered(true)}
                    onMouseLeave={() => setIsPlayHovered(false)}
                >
                    <NavItem
                        to="/play"
                        icon={<Gamepad2 size={24} />}
                        label="Play"
                        active={isActive('/play')}
                    />

                    {/* DROPDOWN MENU */}
                    {isPlayHovered && (
                        <div className="absolute left-full top-0 ml-1 w-60 bg-[#171614] border border-[#3c3a37] rounded-r-lg shadow-2xl py-2 z-[2000] overflow-hidden">
                            <DropdownItem 
                                icon={<Users size={18} />} 
                                label="Play Online" 
                                onClick={() => navigate('/play')} 
                            />
                            <DropdownItem 
                                icon={<Cpu size={18} />} 
                                label="Play Bots" 
                                onClick={() => navigate('/play/bots')} 
                            />
                            <DropdownItem 
                                icon={<Zap size={18} />} 
                                label="Play Coach" 
                                onClick={() => navigate('/analysis')} 
                            />
                            <DropdownItem 
                                icon={<History size={18} />} 
                                label="Game History" 
                                onClick={() => navigate(`/member/${username}/games`)} 
                            />
                        </div>
                    )}
                </div>

                <NavItem
                    to="/puzzles"
                    icon={<Puzzle size={24} />}
                    label="Puzzles"
                    active={isActive('/puzzles')}
                />
                <NavItem
                    to="/learn"
                    icon={<GraduationCap size={24} />}
                    label="Learn"
                    active={isActive('/learn')}
                />
                <NavItem
                    to="/analysis"
                    icon={<Microscope size={24} />}
                    label="Analysis"
                    active={isActive('/analysis')}
                />
            </nav>

            {/* Footer Buttons */}
            <div className="mt-auto flex flex-col gap-2 px-2 pt-4 border-t border-[#3c3a37]">
                <button className="flex items-center gap-3 px-3 py-2 text-[#bab9b8] hover:bg-[#312e2b] hover:text-white rounded-lg transition-all cursor-pointer">
                    <Search size={20} />
                    <span className="text-sm font-semibold">Search</span>
                </button>
                <div
                    onClick={() => navigate(`/member/${username}`)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${location.pathname.startsWith('/member') ? 'bg-[#312e2b] text-white' : 'text-[#bab9b8] hover:bg-[#312e2b] hover:text-white'}`}
                >
                    <div className="w-6 h-6 bg-[#454241] rounded flex justify-center items-center overflow-hidden">
                        <User size={16} className="text-[#81b64c]" />
                    </div>
                    <span className="text-sm font-semibold truncate">{username}</span>
                </div>
                <div className="flex justify-between items-center px-2 py-2">
                    <button className="text-[#bab9b8] hover:text-white transition-colors cursor-pointer relative">
                        <Bell size={20} />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#e74c3c] text-[10px] text-white rounded-full flex items-center justify-center font-bold border-2 border-[#262421]">1</span>
                    </button>
                    <button className="text-[#bab9b8] hover:text-white transition-colors cursor-pointer">
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="text-[#bab9b8] hover:text-[#e74c3c] transition-colors cursor-pointer"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

// --- SEGÉDKOMPONENSEK ---

const NavItem = ({ to, icon, label, active, badge }) => (
    <Link
        to={to}
        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all relative group ${
            active
            ? 'bg-[#312e2b] text-white shadow-sm'
            : 'text-[#bab9b8] hover:bg-[#312e2b] hover:text-white'
        }`}
    >
        <span className={`${active ? 'text-[#81b64c]' : 'text-[#bab9b8] group-hover:text-white'}`}>
            {icon}
        </span>
        <span className="text-[15px] font-bold">{label}</span>
        {badge && (
            <span className="absolute right-2 w-5 h-5 bg-[#e74c3c] text-[11px] text-white rounded-full flex items-center justify-center font-bold">
                {badge}
            </span>
        )}
    </Link>
);

const DropdownItem = ({ icon, label, onClick }) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-[#bab9b8] hover:bg-[#312e2b] hover:text-white transition-all text-left"
    >
        <span className="text-[#81b64c] opacity-80">{icon}</span>
        <span className="text-sm font-bold">{label}</span>
    </button>
);

export default Navbar;