import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Globe,
  Loader2,
  Search,
  X,
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const playerImages = {
  'garry kasparov': '/assets/Players/GaryKasparov.jpg',
  'gary kasparov': '/assets/Players/GaryKasparov.jpg',
  'magnus carlsen': '/assets/Players/MagnusCarlsen.webp',
  'bobby fischer': '/assets/Players/BobbyFischer.jpg',
  'jose raul capablanca': '/assets/Players/JoseRaulCapablanca.jpeg',
  'hikaru nakamura': '/assets/Players/HikaruNakamura.jpg',
};

const playerFacts = {
  'magnus carlsen': {
    title: 'GM',
    fullName: 'Magnus Carlsen',
    born: 'Nov 30, 1990',
    birthplace: 'Tonsberg, Norway',
    federation: 'Norway',
    photoCredit: 'Photo: Maria Emelianova/Chess.com.',
  },
  'garry kasparov': {
    title: 'GM',
    fullName: 'Garry Kasparov',
    born: 'Apr 13, 1963',
    birthplace: 'Baku, Azerbaijan',
    federation: 'Russia',
  },
  'gary kasparov': {
    title: 'GM',
    fullName: 'Garry Kasparov',
    born: 'Apr 13, 1963',
    birthplace: 'Baku, Azerbaijan',
    federation: 'Russia',
  },
  'bobby fischer': {
    title: 'GM',
    fullName: 'Bobby Fischer',
    born: 'Mar 9, 1943',
    birthplace: 'Chicago, United States',
    federation: 'United States',
  },
  'jose raul capablanca': {
    title: 'GM',
    fullName: 'Jose Raul Capablanca',
    born: 'Nov 19, 1888',
    birthplace: 'Havana, Cuba',
    federation: 'Cuba',
  },
  'anatoly karpov': {
    title: 'GM',
    fullName: 'Anatoly Karpov',
    born: 'May 23, 1951',
    birthplace: 'Zlatoust, Russia',
    federation: 'Russia',
  },
  'mikhail botvinnik': {
    title: 'GM',
    fullName: 'Mikhail Botvinnik',
    born: 'Aug 17, 1911',
    birthplace: 'Kuokkala, Finland',
    federation: 'Soviet Union',
  },
  'vladimir kramnik': {
    title: 'GM',
    fullName: 'Vladimir Kramnik',
    born: 'Jun 25, 1975',
    birthplace: 'Tuapse, Russia',
    federation: 'Russia',
  },
  'emanuel lasker': {
    title: 'GM',
    fullName: 'Emanuel Lasker',
    born: 'Dec 24, 1868',
    birthplace: 'Berlinchen, Prussia',
    federation: 'Germany',
  },
  'mikhail tal': {
    title: 'GM',
    fullName: 'Mikhail Tal',
    born: 'Nov 9, 1936',
    birthplace: 'Riga, Latvia',
    federation: 'Soviet Union',
  },
  'alexander alekhine': {
    title: 'GM',
    fullName: 'Alexander Alekhine',
    born: 'Oct 31, 1892',
    birthplace: 'Moscow, Russia',
    federation: 'France',
  },
};

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);
const normalizeName = (name) => String(name || '').toLowerCase();
const getPlayerImage = (name) => playerImages[normalizeName(name)] || null;
const getPlayerFacts = (name) => playerFacts[normalizeName(name)] || {
  title: 'PGN',
  fullName: name || 'Unknown Player',
  born: 'Unknown',
  birthplace: 'Unknown',
  federation: 'Unknown',
};
const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / (1024 ** index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

const PlayerAvatar = ({ name, image, compact = false }) => (
  <div className={`w-full ${compact ? 'h-36' : 'h-48 md:h-56'} bg-[#e8e7e5] flex items-center justify-center overflow-hidden`}>
    {image ? (
      <img
        src={image}
        alt={name}
        className="w-full h-full object-cover object-top grayscale-[0.12] group-hover:grayscale-0 transition-all duration-300"
      />
    ) : (
      <img
        src="/assets/options/DarkKing.webp"
        alt=""
        className="h-[115%] opacity-35 object-contain translate-y-5"
      />
    )}
  </div>
);

const PlayerCard = ({ player, onSelect, compact = false }) => {
  const image = getPlayerImage(player.name);

  return (
    <button
      onClick={() => onSelect(player)}
      className="group text-left cursor-pointer block w-full"
    >
      <PlayerAvatar name={player.name} image={image} compact={compact} />
      <h3 className={`${compact ? 'text-[18px]' : 'text-[22px]'} text-[#d7d6d4] font-bold mt-4 leading-tight group-hover:text-white transition-colors`}>
        {player.name}
      </h3>
      <p className={`${compact ? 'text-[15px]' : 'text-[18px]'} text-[#d7d6d4] mt-2`}>
        {formatNumber(player.games)} Games
      </p>
    </button>
  );
};

const percent = (part, total) => {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
};

const ResultBar = ({ label, total, wins, draws, losses }) => {
  const winPct = percent(wins, total);
  const drawPct = percent(draws, total);
  const lossPct = percent(losses, total);

  return (
    <div>
      <div className="text-[#bab9b8] font-bold text-lg mb-1">
        {label} <span className="text-white">{formatNumber(total)}</span>
      </div>
      <div className="h-7 w-full bg-[#3c3a37] overflow-hidden flex text-sm font-bold">
        <div className="bg-[#f0efed] text-[#33312e] px-2 flex items-center" style={{ width: `${winPct}%`, minWidth: winPct ? 58 : 0 }}>
          {winPct}% Win
        </div>
        <div className="bg-[#676560] text-white px-2 flex items-center justify-end" style={{ width: `${drawPct}%`, minWidth: drawPct ? 62 : 0 }}>
          {drawPct}% Draw
        </div>
        <div className="bg-[#3e3c39] text-white px-2 flex items-center justify-end" style={{ width: `${lossPct}%`, minWidth: lossPct ? 58 : 0 }}>
          {lossPct}% Loss
        </div>
      </div>
    </div>
  );
};

const DetailGameRow = ({ game }) => {
  const year = String(game.date || '').slice(0, 4) || '----';
  const moveCount = game.ply_count ? Math.ceil(game.ply_count / 2) : '';
  const preview = String(game.moves || '').replace(/\s+/g, ' ').slice(0, 120);

  return (
    <div className="grid grid-cols-[1fr_80px_80px_80px_34px] gap-3 px-3 py-4 border-b border-[#373430] last:border-b-0 text-[#d7d6d4]">
      <div className="min-w-0">
        <div className="font-bold truncate">
          {game.white} <span className="text-[#8b8987]">vs.</span> {game.black}
        </div>
        <div className="mt-2 text-sm text-[#bab9b8] truncate">
          {preview || game.opening || 'Unknown opening'}
        </div>
      </div>
      <div className="text-white font-bold self-center">{game.result || '*'}</div>
      <div className="self-center">{moveCount}</div>
      <div className="self-center">{year}</div>
      <div className="self-center justify-self-end w-4 h-4 border border-[#8b8987]" />
    </div>
  );
};

const SearchBox = ({ value, onChange, placeholder, readOnly = false }) => (
  <div className="flex items-center bg-[#373430] border border-[#53504c] h-11 px-2">
    <Search size={22} className="text-[#a6a4a1] shrink-0" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      className="w-full bg-transparent outline-none px-2 text-[#d7d6d4] placeholder:text-[#8b8987]"
    />
    {value && !readOnly && (
      <button onClick={() => onChange('')} type="button" className="text-[#bab9b8] hover:text-white">
        <X size={20} />
      </button>
    )}
  </div>
);

const GameDatabase = () => {
  const token = localStorage.getItem('chessToken');
  const authHeaders = useMemo(() => (
    token ? { headers: { Authorization: `Bearer ${token}` } } : {}
  ), [token]);

  const [summary, setSummary] = useState({
    total_games: 0,
    indexed_games: 0,
    imported_file_games: 0,
    r2_archive: { object_count: 0, size_bytes: 0, available: false },
    best_players: [],
  });
  const [players, setPlayers] = useState([]);
  const [playersTotal, setPlayersTotal] = useState(0);
  const [playersPage, setPlayersPage] = useState(1);
  const [playerSearch, setPlayerSearch] = useState('');
  const [sortMode, setSortMode] = useState('name');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [games, setGames] = useState([]);
  const [totalGames, setTotalGames] = useState(0);
  const [gamesPage, setGamesPage] = useState(1);
  const [detailFilters, setDetailFilters] = useState({ opening: '', player2: '', fixedColors: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayersLoading, setIsPlayersLoading] = useState(false);
  const [isGamesLoading, setIsGamesLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const playersPageSize = 24;
  const gamesPageSize = 10;
  const playersTotalPages = Math.max(1, Math.ceil(playersTotal / playersPageSize));
  const gamesTotalPages = Math.max(1, Math.ceil(totalGames / gamesPageSize));

  const fetchPlayers = useCallback(async (page = 1, search = playerSearch, sort = sortMode) => {
    setIsPlayersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(playersPageSize),
        search,
        sort,
      });
      const res = await axios.get(`${API_BASE}/database/players?${params.toString()}`, authHeaders);
      setPlayers(res.data.players || []);
      setPlayersTotal(res.data.total || 0);
      setPlayersPage(res.data.page || page);
    } finally {
      setIsPlayersLoading(false);
    }
  }, [authHeaders, playerSearch, sortMode]);

  const fetchGamesForPlayer = useCallback(async (player, page = 1, filters = detailFilters) => {
    if (!player?.name) return;
    setIsGamesLoading(true);
    try {
      const params = new URLSearchParams({
        player1: player.name,
        page: String(page),
        page_size: String(gamesPageSize),
      });
      if (filters.opening.trim()) params.set('opening', filters.opening.trim());
      if (filters.player2.trim()) params.set('player2', filters.player2.trim());
      if (filters.fixedColors) params.set('fixed_colors', 'true');

      const [profileRes, gamesRes] = await Promise.all([
        axios.get(`${API_BASE}/database/player-profile?name=${encodeURIComponent(player.name)}`, authHeaders),
        axios.get(`${API_BASE}/database/games?${params.toString()}`, authHeaders),
      ]);

      setSelectedPlayer(player);
      setPlayerProfile(profileRes.data);
      setGames(gamesRes.data.games || []);
      setTotalGames(gamesRes.data.total || 0);
      setGamesPage(gamesRes.data.page || page);
    } finally {
      setIsGamesLoading(false);
    }
  }, [authHeaders, detailFilters]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [summaryRes, playersRes] = await Promise.all([
          axios.get(`${API_BASE}/database/summary`, authHeaders),
          axios.get(`${API_BASE}/database/players?page=1&limit=${playersPageSize}&sort=name`, authHeaders),
        ]);
        if (!isMounted) return;
        setSummary(summaryRes.data);
        setPlayers(playersRes.data.players || []);
        setPlayersTotal(playersRes.data.total || 0);
      } catch {
        if (isMounted) setNotice('Could not load the cloud game database.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [authHeaders]);

  const handleSearch = async (event) => {
    event.preventDefault();
    await fetchPlayers(1, playerSearch, sortMode);
  };

  const handleSortChange = async (nextSort) => {
    setSortMode(nextSort);
    await fetchPlayers(1, playerSearch, nextSort);
  };

  const goToPlayersPage = async (nextPage) => {
    if (nextPage < 1 || nextPage > playersTotalPages || nextPage === playersPage) return;
    await fetchPlayers(nextPage);
  };

  const goToGamesPage = async (nextPage) => {
    if (!selectedPlayer || nextPage < 1 || nextPage > gamesTotalPages || nextPage === gamesPage) return;
    await fetchGamesForPlayer(selectedPlayer, nextPage);
  };

  const handleDetailSearch = async () => {
    if (!selectedPlayer) return;
    await fetchGamesForPlayer(selectedPlayer, 1, detailFilters);
  };

  const leaveDetail = () => {
    setSelectedPlayer(null);
    setPlayerProfile(null);
    setGames([]);
    setTotalGames(0);
    setGamesPage(1);
    setDetailFilters({ opening: '', player2: '', fixedColors: false });
  };

  if (selectedPlayer) {
    const facts = getPlayerFacts(selectedPlayer.name);
    const profile = playerProfile || {
      games: selectedPlayer.games,
      as_white: 0,
      as_black: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    };
    const image = getPlayerImage(selectedPlayer.name);

    return (
      <div className="min-h-screen bg-[#302e2b] text-[#d7d6d4] p-4 md:p-8 font-sans">
        <div className="max-w-7xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <button onClick={leaveDetail} className="flex items-center gap-4 text-left group">
              <img src="/assets/moves/chess_database.svg" alt="" className="w-12 h-12" />
              <h1 className="text-3xl md:text-4xl font-black text-white group-hover:text-[#f0efed]">
                Chess Games Database
              </h1>
            </button>
            <button onClick={leaveDetail} className="hidden md:flex items-center gap-2 text-[#bab9b8] hover:text-white font-bold">
              <ArrowLeft size={18} />
              Back to players
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-7">
            <main className="bg-[#262421] px-5 md:px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-[370px_1fr] gap-8">
                <div>
                  <div className="h-[310px] bg-[#e8e7e5] overflow-hidden flex items-center justify-center">
                    {image ? (
                      <img src={image} alt={selectedPlayer.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <img src="/assets/options/DarkKing.webp" alt="" className="h-[120%] opacity-35 object-contain translate-y-7" />
                    )}
                  </div>
                  {facts.photoCredit && (
                    <p className="text-sm text-[#bab9b8] mt-2">{facts.photoCredit}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="bg-[#b92033] text-white px-2 py-1 text-xl font-black">{facts.title}</span>
                    <h2 className="text-3xl font-black text-white leading-tight">{selectedPlayer.name}</h2>
                  </div>

                  <dl className="space-y-2 text-lg">
                    <div className="flex gap-3">
                      <dt className="font-black text-white">Full name</dt>
                      <dd>{facts.fullName}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="font-black text-white">Born</dt>
                      <dd>{facts.born}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="font-black text-white">Place of birth</dt>
                      <dd>{facts.birthplace}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="font-black text-white">Federation</dt>
                      <dd>{facts.federation}</dd>
                    </div>
                  </dl>

                  <div className="mt-9">
                    <h3 className="text-2xl font-black text-white mb-3">Profiles</h3>
                    <div className="flex items-center gap-4 text-[#81b64c]">
                      <Database size={28} />
                      <X size={28} className="text-white" />
                      <span className="text-[#3182ce] text-2xl font-black leading-none">f</span>
                      <span className="text-[#f04468] text-2xl font-black leading-none">ig</span>
                      <span className="text-[#8b5cf6] text-2xl font-black leading-none">tw</span>
                      <Globe size={28} className="text-[#22a9e0]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 space-y-4">
                <ResultBar
                  label="Total Games"
                  total={profile.games}
                  wins={profile.wins}
                  draws={profile.draws}
                  losses={profile.losses}
                />
                <ResultBar
                  label="As White"
                  total={profile.as_white}
                  wins={profile.white_wins}
                  draws={profile.white_draws}
                  losses={profile.white_losses}
                />
                <ResultBar
                  label="As Black"
                  total={profile.as_black}
                  wins={profile.black_wins}
                  draws={profile.black_draws}
                  losses={profile.black_losses}
                />
              </div>

              <div className="mt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-3xl font-black text-white">{selectedPlayer.name} Chess Games</h2>
                <div className="flex items-center gap-5 text-[#d7d6d4]">
                  <button className="flex items-center gap-2 hover:text-white font-bold">
                    Year (Most Recent)
                    <ChevronDown size={18} />
                  </button>
                  <Download size={22} className="text-[#8b8987]" />
                </div>
              </div>

              <div className="mt-7 bg-[#1d1b18]">
                <div className="grid grid-cols-[1fr_80px_80px_80px_34px] gap-3 px-3 py-3 text-[#bab9b8] text-sm font-black">
                  <div>Players</div>
                  <div>Result</div>
                  <div>Moves</div>
                  <div>Year</div>
                  <div className="justify-self-end w-4 h-4 border border-[#8b8987]" />
                </div>
                {isGamesLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-[#81b64c]" />
                  </div>
                ) : games.length ? (
                  games.map((game) => <DetailGameRow key={game.id} game={game} />)
                ) : (
                  <div className="h-48 flex items-center justify-center text-[#8b8987]">No games found</div>
                )}
              </div>

              <div className="mt-6 flex justify-center">
                <div className="flex items-center">
                  <button
                    onClick={() => goToGamesPage(gamesPage - 1)}
                    disabled={gamesPage <= 1 || isGamesLoading}
                    className="p-3 bg-[#312e2b] disabled:opacity-40 hover:bg-[#3d3a37]"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="px-5 py-3 bg-[#21201d] text-white font-bold">
                    {gamesPage} / {gamesTotalPages}
                  </span>
                  <button
                    onClick={() => goToGamesPage(gamesPage + 1)}
                    disabled={gamesPage >= gamesTotalPages || isGamesLoading}
                    className="p-3 bg-[#312e2b] disabled:opacity-40 hover:bg-[#3d3a37]"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </main>

            <aside className="space-y-7">
              <section className="bg-[#262421] px-5 py-6">
                <div className="flex items-center justify-between border-b border-[#3d3a37] pb-4 mb-5">
                  <h2 className="text-2xl font-black text-white">Games</h2>
                  <ChevronRight size={32} className="text-[#a6a4a1]" />
                </div>
                <p className="text-lg mb-5">Select an opening or player to search</p>
                <div className="space-y-4">
                  <SearchBox
                    value={detailFilters.opening}
                    onChange={(opening) => setDetailFilters((current) => ({ ...current, opening }))}
                    placeholder="Opening"
                  />
                  <SearchBox value={selectedPlayer.name} onChange={() => {}} readOnly placeholder="Player 1" />
                  <SearchBox
                    value={detailFilters.player2}
                    onChange={(player2) => setDetailFilters((current) => ({ ...current, player2 }))}
                    placeholder="Player 2"
                  />
                  <label className="flex items-center gap-3 text-[#bab9b8]">
                    <input
                      type="checkbox"
                      checked={detailFilters.fixedColors}
                      onChange={(event) => setDetailFilters((current) => ({ ...current, fixedColors: event.target.checked }))}
                      className="w-4 h-4 accent-[#81b64c]"
                    />
                    Fixed Colors
                  </label>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleDetailSearch}
                      disabled={isGamesLoading}
                      className="bg-[#81b64c] hover:bg-[#8ac653] disabled:opacity-70 text-white px-12 py-3 font-black shadow-md"
                    >
                      Search
                    </button>
                    <button className="flex items-center gap-2 text-[#bab9b8] hover:text-white font-bold">
                      Advanced
                      <ChevronDown size={18} />
                    </button>
                  </div>
                </div>
              </section>

              <section className="bg-[#262421] px-5 py-6">
                <h2 className="text-2xl font-black text-white border-b border-[#3d3a37] pb-4 mb-3">
                  Latest comments
                </h2>
                {[
                  'Le Quang Liem vs. Thanh Tu Tran, 2001',
                  'Rasmus Svane vs. Wesley So, 2022',
                  'Tihon Cherniaev vs. Wesley So, 2022',
                  'Srinath Narayanan vs. Wesley So, 2022',
                  'Mikhail Golubev vs. Wesley So, 2022',
                ].map((comment) => (
                  <div key={comment} className="py-3 border-b border-[#3d3a37] last:border-b-0">
                    {comment}
                  </div>
                ))}
              </section>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
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
          <form onSubmit={handleSearch} className="w-full md:w-96 flex items-center bg-[#21201d] border border-[#3d3a37]">
            <Search size={18} className="ml-3 text-[#8b8987] shrink-0" />
            <input
              value={playerSearch}
              onChange={(event) => setPlayerSearch(event.target.value)}
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
                onSelect={fetchGamesForPlayer}
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
                onClick={() => handleSortChange('name')}
                className={`px-4 py-2 text-sm font-bold ${sortMode === 'name' ? 'bg-[#81b64c] text-white' : 'text-[#bab9b8] hover:text-white'}`}
              >
                A-Z
              </button>
              <button
                onClick={() => handleSortChange('games')}
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
                  onSelect={fetchGamesForPlayer}
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
                onClick={() => goToPlayersPage(playersPage - 1)}
                disabled={playersPage <= 1 || isPlayersLoading}
                className="p-3 bg-[#312e2b] disabled:opacity-40 hover:bg-[#3d3a37]"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-5 py-3 bg-[#21201d] text-white font-bold">
                {playersPage} / {playersTotalPages}
              </span>
              <button
                onClick={() => goToPlayersPage(playersPage + 1)}
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
};

export default GameDatabase;
