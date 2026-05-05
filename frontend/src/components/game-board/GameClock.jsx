import ClockIcon from '../ClockIcon';
import { formatSeconds } from './gameBoardUtils';

const GameClock = ({ isLight, isActive, currentSeconds }) => (
    <div className={`px-3 py-1.5 rounded flex items-center justify-between border shadow-lg min-w-35 transition-all duration-300 ${
        isLight ? "bg-white text-[#2b2a27]" : "bg-[#262421] text-white"
    } ${isActive ? "ring-2 ring-[#81b64c] border-transparent" : "border-white/10"}`}>
        <div className="shrink-0">
            <ClockIcon
                isActive={isActive}
                currentSeconds={currentSeconds}
            />
        </div>
        <span className="flex-1 text-right font-sans font-bold text-2xl tabular-nums leading-none ml-2">
            {formatSeconds(currentSeconds)}
        </span>
    </div>
);

export default GameClock;
