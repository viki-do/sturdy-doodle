import { botCategories } from '../../constants/bots';
import CategoryItem from './CategoryItem';
import EngineSlider from './EngineSlider';

const BotCategoryList = ({
    selectedBot,
    expandedCategory,
    engineElo,
    onCategoryToggle,
    onBotChange,
    onSliderChange,
}) => (
    <div className="flex flex-col gap-2">
        {botCategories.map((cat) => (
            <div key={cat.id} className="flex flex-col">
                <CategoryItem
                    cat={cat}
                    isOpen={expandedCategory === cat.id}
                    onClick={() => onCategoryToggle(expandedCategory === cat.id ? null : cat.id)}
                />
                {expandedCategory === cat.id && cat.bots.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 p-3 bg-chess-panel-header rounded-b-lg border-x border-b border-[#3d3a37]/30 animate-in fade-in duration-200">
                        {cat.bots.map(bot => (
                            <div
                                key={bot.id}
                                onClick={() => onBotChange(bot)}
                                className={`aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all 
                                ${selectedBot?.id === bot.id ? 'border-[#81b64c]' : 'border-transparent hover:border-[#3d3a37]'}`}
                            >
                                <img src={bot.img} alt={bot.name} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ))}

        <EngineSlider engineElo={engineElo} onChange={onSliderChange} />
    </div>
);

export default BotCategoryList;
