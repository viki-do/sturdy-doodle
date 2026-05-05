import { ArchiveSelect } from '../component_helpers/PageHelpers';
import { archiveSidebarItems } from '../../constants/gameArchiveData';

const GameArchiveSidebar = ({ isAdvancedOpen, onAdvancedToggle }) => (
    <div className="w-80 space-y-4">
        <h3 className="font-bold text-white text-lg mb-2 px-1">Game History</h3>

        <div className="bg-[#262421] p-4 rounded border border-[#3c3a37] space-y-3">
            {archiveSidebarItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-bold text-[#bab9b8] cursor-pointer hover:text-white transition-colors">
                    <i className="fas fa-caret-right text-[#666]"></i> {item}
                </div>
            ))}
        </div>

        <div className="bg-[#262421] p-5 rounded border border-[#3c3a37] space-y-4">
            <ArchiveSelect value="My Games" />
            <ArchiveSelect value="All Recent Games" />
            <ArchiveSelect value="Any Result" />

            <input
                type="text"
                placeholder="Opponent"
                className="w-full bg-[#1e1e1e] border border-[#3c3a37] p-2.5 rounded text-sm text-white outline-none focus:border-[#666]"
            />

            <div className="flex gap-2">
                <button className="flex-1 bg-[#81b64c] hover:bg-[#a3d16a] text-white font-bold py-2.5 rounded transition-all shadow-lg active:scale-95">Search</button>
                <button className="flex-1 bg-[#3c3a37] hover:bg-[#4a4845] text-white font-bold py-2.5 rounded transition-all">Reset</button>
            </div>

            <button
                onClick={onAdvancedToggle}
                className="w-full text-center text-[11px] font-bold text-[#8b8987] hover:text-white uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
            >
                Advanced <i className={`fas fa-chevron-${isAdvancedOpen ? 'up' : 'down'}`}></i>
            </button>
        </div>
    </div>
);

export default GameArchiveSidebar;
