import { Settings } from 'lucide-react';
import AnalyzeCapturedRow from './AnalyzeCapturedRow';

const AnalyzePlayerInfo = ({ color, pieces, diff, onDragOver }) => {
    const isWhite = color === 'white';

    return (
        <div
            className={`w-170 flex items-center justify-between px-1 h-12 ${isWhite ? 'text-[#bab9b8]' : 'text-[#8b8987]'}`}
            onDragOver={onDragOver}
        >
            <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 ${isWhite ? 'bg-[#ffffff] text-black shadow-sm border border-black/10' : 'bg-[#262421] border border-white/5'} rounded flex items-center justify-center italic text-xs font-bold`}>
                        {isWhite ? 'W' : 'B'}
                    </div>
                    <span className={`font-bold text-sm ${isWhite ? 'text-[#bab9b8]' : ''}`}>{isWhite ? 'White' : 'Black'}</span>
                </div>
                <AnalyzeCapturedRow
                    pieces={pieces}
                    side={color}
                    diff={diff}
                />
            </div>
            {!isWhite && <Settings size={18} className="cursor-pointer hover:text-white transition-colors" />}
        </div>
    );
};

export default AnalyzePlayerInfo;
