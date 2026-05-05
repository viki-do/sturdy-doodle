import { playerFacts, playerImages } from '../constants/databasePlayers';

export const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

export const normalizeName = (name) => String(name || '').toLowerCase();

export const getPlayerImage = (name) => playerImages[normalizeName(name)] || null;

export const getPlayerFacts = (name) => playerFacts[normalizeName(name)] || {
  title: 'PGN',
  fullName: name || 'Unknown Player',
  born: 'Unknown',
  birthplace: 'Unknown',
  federation: 'Unknown',
};

export const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / (1024 ** index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

export const percent = (part, total) => {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
};
