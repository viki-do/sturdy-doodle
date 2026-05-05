import { BookOpen, Search, Settings } from 'lucide-react';
import { GameCollections } from '../icons/Icons';
import { TabItem } from '../component_helpers/AnalysisHelpers';
import AnalysisMoveRows from './AnalysisMoveRows';
import EngineLinesSection from './EngineLinesSection';

const ActiveAnalysisView = ({
    history,
    viewIndex,
    openingName,
    currentFen,
    currentMoveData,
    engineLinesToDisplay,
    statusText,
    resultLabel,
    onViewMove,
    onTooltipChange,
}) => (
    <div className="flex flex-col h-full">
        <div className="flex bg-[#21201d] border-b border-[#3c3a37] shrink-0">
            <TabItem icon={<Search size={18} />} label="Analysis" active />
            <TabItem icon={<GameCollections size={18} />} label="Games" />
            <TabItem icon={<BookOpen size={18} />} label="Explore" />
        </div>

        <div className="px-3 py-2 flex items-center justify-between bg-[#262421] shrink-0">
            <div className="flex items-center gap-2">
                <div className="w-7 h-3.5 bg-[#3c3a37] rounded-full relative cursor-pointer">
                    <div className="absolute left-0.5 top-0.5 w-2.5 h-2.5 bg-[#81b64c] rounded-full" />
                </div>
                <span className="text-[10px] font-bold text-[#bab9b8] uppercase tracking-tighter">Analysis</span>
            </div>
            <div className="text-[#8b8987] text-[11px] flex items-center gap-1 opacity-80">
                <Settings size={12} className="rotate-90"/> depth=20
            </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#262421] px-2 pt-1 flex flex-col min-h-0">
            <EngineLinesSection
                currentMoveData={currentMoveData}
                engineLinesToDisplay={engineLinesToDisplay}
                onTooltipChange={onTooltipChange}
            />

            <div className="flex items-center justify-between py-2 px-1 text-[11px] text-[#8b8987] border-b border-[#3c3a37]/50 mt-1 shrink-0">
                <span className="truncate">{statusText || openingName || "Analysis started"}</span>
                <BookOpen size={14} className="shrink-0 ml-2" />
            </div>

            <AnalysisMoveRows
                history={history}
                viewIndex={viewIndex}
                currentFen={currentFen}
                resultLabel={resultLabel}
                statusText={statusText}
                currentMoveData={currentMoveData}
                onViewMove={onViewMove}
            />
        </div>
    </div>
);

export default ActiveAnalysisView;
