import { archiveTabs } from '../../constants/gameArchiveData';

const ArchiveTabs = ({ viewMode, onViewModeChange }) => (
    <div className="flex items-center justify-between bg-[#262421] border-x border-t border-[#3c3a37] rounded-t-lg px-2">
        <div className="flex">
            {archiveTabs.map((tab) => (
                <button
                    key={tab}
                    onClick={() => onViewModeChange(tab)}
                    className={`px-5 py-4 text-sm font-bold transition-all border-b-2 ${
                        viewMode === tab ? 'border-[#81b64c] text-white' : 'border-transparent hover:text-white'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
        <div className="flex gap-4 px-4 text-[#666] text-lg">
            <i className="far fa-square cursor-pointer hover:text-white transition-colors"></i>
            <i className="far fa-clock cursor-pointer hover:text-white transition-colors"></i>
            <i className="fas fa-download cursor-pointer hover:text-white transition-colors"></i>
        </div>
    </div>
);

export default ArchiveTabs;
