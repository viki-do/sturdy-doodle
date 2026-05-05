import { botCategories } from '../../constants/bots';

export const configuredBots = botCategories.flatMap(category => category.bots);
export const DEFAULT_BOT_SETTINGS = { time: 'No Timer', color: 'white' };

export const getSettingsForBot = (settingsByBot, bot) => ({
    ...DEFAULT_BOT_SETTINGS,
    ...(bot?.id ? settingsByBot[bot.id] : {})
});

export const getInitialBot = () => {
    const saved = localStorage.getItem('lastSelectedBot');
    if (!saved) return botCategories[0].bots[0];

    try {
        const parsed = JSON.parse(saved);
        if (parsed?.id === 'engine') return parsed;
        return configuredBots.find(bot => bot.id === parsed?.id) || botCategories[0].bots[0];
    } catch {
        return botCategories[0].bots[0];
    }
};

export const getSavedBotSettings = () => {
    const saved = localStorage.getItem('botSettings');
    if (!saved) return {};

    try {
        return JSON.parse(saved);
    } catch {
        return {};
    }
};

export const buildEngineBot = (elo) => ({
    id: 'engine',
    name: 'Engine',
    elo,
    img: null,
    isEngine: true
});
