import { Upload } from 'lucide-react';
import {
    GameCollections,
    ImportStudy,
    LoadFromFEN,
    LoadFromHistory,
    LoadPrevious,
    MakeMoves,
    New,
    SetUpPosition,
} from '../icons/Icons';
import { AnalysisMenuItem } from '../component_helpers/AnalysisHelpers';

const EmptyAnalysisMenu = ({ onSetupClick }) => (
    <div className="flex flex-col">
        <div className="p-4 border-b border-[#3c3a37] flex items-center justify-center gap-2 bg-[#21201d] shrink-0">
            <New size={24} className="text-[#81b64c]" />
            <h2 className="font-bold uppercase tracking-widest text-sm text-white">Analysis</h2>
        </div>
        <div className="flex-1 pt-3 overflow-y-auto no-scrollbar">
            <AnalysisMenuItem icon={<MakeMoves size={24} />} label="Make Moves" />
            <AnalysisMenuItem
                icon={<SetUpPosition size={24} />}
                label="Set Up Position"
                onClick={onSetupClick}
            />
            <AnalysisMenuItem icon={<GameCollections size={24} />} label="Game Collections" />
            <AnalysisMenuItem icon={<LoadFromHistory size={24} />} label="Load From Game History" />
            <AnalysisMenuItem icon={<ImportStudy size={24} />} label="Import Study" />
            <AnalysisMenuItem icon={<LoadFromFEN size={24} />} label="Load From FEN/PGN(s)" />
            <div className="px-4 mt-2 text-[#bab9b8]">
                <textarea className="w-full h-24 bg-[#161512] rounded p-2 text-xs focus:outline-none border border-[#3c3a37] resize-none" placeholder="Paste PGN here..." />
                <button className="w-full mt-2 py-2 flex items-center justify-center gap-2 bg-[#2b2a27] hover:bg-[#363430] rounded font-bold text-xs transition-colors border border-[#3c3a37]">
                    <Upload size={14} /> Upload File
                </button>
            </div>
            <div className="mt-4 px-4">
                <button className="w-full py-3 bg-[#81b64c] hover:bg-[#95c95c] text-white font-black rounded-md shadow-lg transition-colors uppercase text-sm">Add Game(s)</button>
            </div>
            <div className="mt-2 mb-4 px-4">
                <AnalysisMenuItem icon={<LoadPrevious size={18} />} label="Load Previous Analysis" />
            </div>
        </div>
    </div>
);

export default EmptyAnalysisMenu;
