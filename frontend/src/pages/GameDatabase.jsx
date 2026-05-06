import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PlayerCatalogView from '../components/database/PlayerCatalogView';
import PlayerProfileView from '../components/database/PlayerProfileView';
import { API_BASE } from '../constants/databasePlayers';

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
  const [gamesSort, setGamesSort] = useState('year_desc');
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

  const fetchGamesForPlayer = useCallback(async (player, page = 1, filters = detailFilters, sort = gamesSort) => {
    if (!player?.name) return;
    setIsGamesLoading(true);
    try {
      const params = new URLSearchParams({
        player1: player.name,
        page: String(page),
        page_size: String(gamesPageSize),
        sort,
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
  }, [authHeaders, detailFilters, gamesSort]);

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
    await fetchGamesForPlayer(selectedPlayer, nextPage, detailFilters, gamesSort);
  };

  const handleDetailSearch = async () => {
    if (!selectedPlayer) return;
    await fetchGamesForPlayer(selectedPlayer, 1, detailFilters, gamesSort);
  };

  const handleGamesSortChange = async (nextSort) => {
    setGamesSort(nextSort);
    if (!selectedPlayer) return;
    await fetchGamesForPlayer(selectedPlayer, 1, detailFilters, nextSort);
  };

  const leaveDetail = () => {
    setSelectedPlayer(null);
    setPlayerProfile(null);
    setGames([]);
    setTotalGames(0);
    setGamesPage(1);
    setGamesSort('year_desc');
    setDetailFilters({ opening: '', player2: '', fixedColors: false });
  };

  if (selectedPlayer) {
    return (
      <PlayerProfileView
        selectedPlayer={selectedPlayer}
        playerProfile={playerProfile}
        games={games}
        gamesPage={gamesPage}
        gamesTotalPages={gamesTotalPages}
        detailFilters={detailFilters}
        gamesSort={gamesSort}
        isGamesLoading={isGamesLoading}
        onBack={leaveDetail}
        onDetailFiltersChange={setDetailFilters}
        onDetailSearch={handleDetailSearch}
        onGamesSortChange={handleGamesSortChange}
        onGamesPageChange={goToGamesPage}
      />
    );
  }

  return (
    <PlayerCatalogView
      summary={summary}
      players={players}
      playersTotal={playersTotal}
      playersPage={playersPage}
      playersTotalPages={playersTotalPages}
      playerSearch={playerSearch}
      sortMode={sortMode}
      isLoading={isLoading}
      isPlayersLoading={isPlayersLoading}
      notice={notice}
      onPlayerSearchChange={setPlayerSearch}
      onSearch={handleSearch}
      onSortChange={handleSortChange}
      onPlayersPageChange={goToPlayersPage}
      onSelectPlayer={fetchGamesForPlayer}
    />
  );
};

export default GameDatabase;
