import { useState } from 'react';
import ArchivePagination from '../components/game-archive/ArchivePagination';
import ArchiveTabs from '../components/game-archive/ArchiveTabs';
import GameArchiveSidebar from '../components/game-archive/GameArchiveSidebar';
import GameArchiveTable from '../components/game-archive/GameArchiveTable';
import { archiveGames } from '../constants/gameArchiveData';

const GameArchive = () => {
    const [viewMode, setViewMode] = useState('Recent');
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#1e1e1e] text-[#bab9b8] p-4 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <img src="/assets/logos/board-archive.svg" className="w-10 h-10" alt="archive" />
                    <h2 className="text-[26px] font-bold text-white tracking-tight">Game History (221)</h2>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 min-w-0">
                        <ArchiveTabs viewMode={viewMode} onViewModeChange={setViewMode} />
                        <ArchivePagination />
                        <GameArchiveTable games={archiveGames} />
                    </div>

                    <GameArchiveSidebar
                        isAdvancedOpen={isAdvancedOpen}
                        onAdvancedToggle={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    />
                </div>
            </div>
        </div>
    );
};

export default GameArchive;
