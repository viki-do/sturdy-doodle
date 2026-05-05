import { useState, useEffect } from 'react';
import { engineEloSteps } from '../constants/bots';
import BotCategoryList from './bot-selection/BotCategoryList';
import BotOptionsPanel from './bot-selection/BotOptionsPanel';
import BotSelectionFooter from './bot-selection/BotSelectionFooter';
import BotSelectionHeader from './bot-selection/BotSelectionHeader';
import SelectedBotPreview from './bot-selection/SelectedBotPreview';
import {
    buildEngineBot,
    getInitialBot,
    getSavedBotSettings,
    getSettingsForBot,
} from './bot-selection/botSelectionUtils';

const BotSelectionPanel = ({ onBack, onSelectBot, onTimeChange, onColorChange, onPreviewChange }) => {
    const [selectedBot, setSelectedBot] = useState(() => {
        return getInitialBot();
    });

    const [botSettings, setBotSettings] = useState(() => {
        return getSavedBotSettings();
    });

    const initialSettings = getSettingsForBot(botSettings, selectedBot);
    const [timeControl, setTimeControl] = useState(initialSettings.time);
    const [selectedColor, setSelectedColor] = useState(initialSettings.color);
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [engineElo, setEngineElo] = useState(selectedBot?.id === 'engine' ? selectedBot.elo || 2200 : 2200);
    const [features, setFeatures] = useState({
        evalBar: false, threatArrows: false, suggestionArrows: false, moveFeedback: false, engine: false
    });

    useEffect(() => {
        if (selectedBot) {
            if (onColorChange) onColorChange(selectedColor);
            if (onTimeChange) onTimeChange(timeControl);
        }
    }, []);

    const saveSettings = (settings) => {
        setBotSettings(settings);
        localStorage.setItem('botSettings', JSON.stringify(settings));
    };

    const handleBotChange = (bot) => {
        setSelectedBot(bot);
        localStorage.setItem('lastSelectedBot', JSON.stringify(bot));

        if (onPreviewChange) {
            onPreviewChange(bot);
        }

        const settings = getSettingsForBot(botSettings, bot);
        const newTime = settings.time;
        const newColor = settings.color;
        setTimeControl(newTime);
        setSelectedColor(newColor);
        if (onTimeChange) onTimeChange(newTime);
        if (onColorChange) onColorChange(newColor);
    };

    useEffect(() => {
        if (selectedBot && onPreviewChange) {
            onPreviewChange(selectedBot);
        }
    }, []);

    const handleSetTime = (time) => {
        setTimeControl(time);
        const newSettings = {
            ...botSettings,
            [selectedBot.id]: { ...(botSettings[selectedBot.id] || {}), time: time, color: selectedColor }
        };
        saveSettings(newSettings);
        if (onTimeChange) onTimeChange(time);
    };

    const handleSetColor = (color) => {
        setSelectedColor(color);
        const newSettings = {
            ...botSettings,
            [selectedBot.id]: { ...(botSettings[selectedBot.id] || {}), time: timeControl, color: color }
        };
        saveSettings(newSettings);
        if (onColorChange) onColorChange(color);
    };

    const handlePlay = () => {
        const newSettings = {
            ...botSettings,
            [selectedBot.id]: { ...(botSettings[selectedBot.id] || {}), time: timeControl, color: selectedColor }
        };
        saveSettings(newSettings);
        localStorage.setItem('lastSelectedBot', JSON.stringify(selectedBot));
        onSelectBot(selectedBot, selectedColor, timeControl);
    };

    const handleSliderChange = (e) => {
        const rawVal = parseInt(e.target.value);
        const closestElo = engineEloSteps.reduce((prev, curr) => {
            return (Math.abs(curr - rawVal) < Math.abs(prev - rawVal) ? curr : prev);
        });
        setEngineElo(closestElo);

        handleBotChange(buildEngineBot(closestElo));
    };

    const toggleFeature = (key) => {
        setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="w-full h-full bg-[#262421] flex flex-col font-sans border border-chess-bg rounded-xl overflow-hidden relativow-2xl">
            <BotSelectionHeader onBack={onBack} />

            <div className="flex-1 overflow-hidden relative flex flex-col">
                <SelectedBotPreview selectedBot={selectedBot} engineElo={engineElo} />

                <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-28">
                    {!isOptionsOpen ? (
                        <BotCategoryList
                            selectedBot={selectedBot}
                            expandedCategory={expandedCategory}
                            engineElo={engineElo}
                            onCategoryToggle={setExpandedCategory}
                            onBotChange={handleBotChange}
                            onSliderChange={handleSliderChange}
                        />
                    ) : (
                        <BotOptionsPanel
                            selectedBot={selectedBot}
                            timeControl={timeControl}
                            features={features}
                            onSetTime={handleSetTime}
                            onToggleFeature={toggleFeature}
                        />
                    )}
                </div>
            </div>

            <BotSelectionFooter
                timeControl={timeControl}
                selectedColor={selectedColor}
                isOptionsOpen={isOptionsOpen}
                onOptionsToggle={() => setIsOptionsOpen(!isOptionsOpen)}
                onSetColor={handleSetColor}
                onPlay={handlePlay}
            />
        </div>
    );
};

export default BotSelectionPanel;
