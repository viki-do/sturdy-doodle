import { botCategories } from '../../constants/bots';

export const findBotByGameData = (gameData) => {
    if (!gameData) return null;

    const bots = botCategories.flatMap(cat => cat.bots);
    const botId = gameData.bot_id ? String(gameData.bot_id).toLowerCase() : null;
    const botElo = Number(gameData.bot_elo);
    const botStyle = gameData.bot_style ? String(gameData.bot_style).toLowerCase() : null;

    if (botId === 'engine') {
        return {
            id: 'engine',
            name: 'Engine',
            elo: Number.isFinite(botElo) ? botElo : 2200,
            img: null,
            isEngine: true,
            style: botStyle || 'mix'
        };
    }

    return (
        bots.find(bot =>
            botId &&
            String(bot.id).toLowerCase() === botId &&
            Number(bot.elo) === botElo &&
            (!botStyle || String(bot.style || '').toLowerCase() === botStyle)
        ) ||
        bots.find(bot =>
            botId &&
            String(bot.id).toLowerCase() === botId &&
            Number(bot.elo) === botElo
        ) ||
        bots.find(bot =>
            botId &&
            String(bot.id).toLowerCase() === botId
        ) ||
        bots.find(bot => Number(bot.elo) === botElo) ||
        null
    );
};

export const formatSeconds = (totalSeconds) => {
    const total = Math.max(0, Number(totalSeconds) || 0);
    if (total < 10) {
        const secs = Math.floor(total);
        const tenths = Math.floor((total * 10) % 10);
        return `0:0${secs}.${tenths}`;
    }
    const roundedTotal = Math.floor(total);
    const hours = Math.floor(roundedTotal / 3600);
    const mins = Math.floor((roundedTotal % 3600) / 60);
    const secs = roundedTotal % 60;
    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
