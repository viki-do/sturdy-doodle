import { ChevronLeft, ChevronRight, Database, Loader2, Search } from 'lucide-react';
import PlayerCard from './PlayerCard';
import { formatBytes, formatNumber } from '../../utils/databaseFormatters';

const PlayerCatalogView = ({
  summary,
  players,
  playersTotal,
  playersPage,
  playersTotalPages,
  playerSearch,
  sortMode,
  isLoading,
  isPlayersLoading,
  notice,
  onPlayerSearchChange,
  onSearch,
  onSortChange,
  onPlayersPageChange,
  onSelectPlayer,
}) => (
  <div className="min-h-screen bg-[#262421] text-[#d7d6d4] p-4 md:p-8 font-sans">
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <img src="/assets/moves/chess_database.svg" alt="" className="w-11 h-11" />
            <span className="text-[#8b8987] text-xs font-black uppercase tracking-widest">Cloud archive</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">Players</h1>
          {summary.total_games > 0 ? (
            <p className="text-[#8b8987] mt-2">
              {formatNumber(summary.total_games)} games in the cloud archive
            </p>
          ) : summary.r2_archive?.object_count > 0 ? (
            <p className="text-[#8b8987] mt-2">
              {formatNumber(summary.r2_archive.object_count)} PGN files in Cloudflare R2 - {formatBytes(summary.r2_archive.size_bytes)}
            </p>
          ) : (
            <p className="text-[#8b8987] mt-2">No indexed games found yet</p>
          )}
          {summary.r2_archive?.object_count > 0 && summary.indexed_games === 0 && (
            <p className="text-[#d6a64f] text-sm mt-1">
              The files are uploaded, but player counts need the SQL game index.
            </p>
          )}
        </div>
        <form onSubmit={onSearch} className="w-full md:w-96 flex items-center bg-[#21201d] border border-[#3d3a37]">
          <Search size={18} className="ml-3 text-[#8b8987] shrink-0" />
          <input
            value={playerSearch}
            onChange={(event) => onPlayerSearchChange(event.target.value)}
            placeholder="Search players"
            className="w-full bg-transparent outline-none px-3 py-3 text-white placeholder:text-[#8b8987]"
          />
        </form>
      </header>

      {notice && (
        <div className="mb-6 bg-[#21201d] border border-[#3d3a37] px-4 py-3 text-sm text-[#d7d6d4]">
          {notice}
        </div>
      )}

      <section className="mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white text-xl font-black">10 Best Players Of All Time</h2>
          {isLoading && <Loader2 size={18} className="animate-spin text-[#8b8987]" />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-10">
          {(summary.best_players || []).map((player) => (
            <PlayerCard
              key={player.name}
              player={player}
              compact
              onSelect={onSelectPlayer}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-white text-xl font-black">All Players</h2>
            <p className="text-[#8b8987] text-sm">{formatNumber(playersTotal)} players - alphabetical catalogue</p>
          </div>
          <div className="flex bg-[#21201d] border border-[#3d3a37] p-1">
            <button
              onClick={() => onSortChange('name')}
              className={`px-4 py-2 text-sm font-bold ${sortMode === 'name' ? 'bg-[#81b64c] text-white' : 'text-[#bab9b8] hover:text-white'}`}
            >
              A-Z
            </button>
            <button
              onClick={() => onSortChange('games')}
              className={`px-4 py-2 text-sm font-bold ${sortMode === 'games' ? 'bg-[#81b64c] text-white' : 'text-[#bab9b8] hover:text-white'}`}
            >
              Most Games
            </button>
          </div>
        </div>

        <div className="relative">
          {isPlayersLoading && (
            <div className="absolute inset-0 bg-[#262421]/70 z-10 flex items-start justify-center pt-20">
              <Loader2 size={24} className="animate-spin text-[#81b64c]" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-12">
            {players.map((player) => (
              <PlayerCard
                key={player.name}
                player={player}
                onSelect={onSelectPlayer}
              />
            ))}
          </div>
        </div>

        {!isLoading && !players.length && (
          <div className="h-48 flex flex-col items-center justify-center text-[#8b8987]">
            <Database size={26} className="mb-2" />
            No players found
          </div>
        )}

        <div className="mt-10 flex justify-center items-center">
          <div className="flex items-center">
            <button
              onClick={() => onPlayersPageChange(playersPage - 1)}
              disabled={playersPage <= 1 || isPlayersLoading}
              className="p-3 bg-[#312e2b] disabled:opacity-40 hover:bg-[#3d3a37]"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-5 py-3 bg-[#21201d] text-white font-bold">
              {playersPage} / {playersTotalPages}
            </span>
            <button
              onClick={() => onPlayersPageChange(playersPage + 1)}
              disabled={playersPage >= playersTotalPages || isPlayersLoading}
              className="p-3 bg-[#312e2b] disabled:opacity-40 hover:bg-[#3d3a37]"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
);

export default PlayerCatalogView;
