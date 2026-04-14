import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const EngineLineSimple = ({ eval: ev, moves, onMouseEnter, onMouseLeave, onMouseMove }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const moveArray = moves.split(' ');
    const shortMoves = moveArray.slice(0, 8).join(' ');
    const remainingMoves = moveArray.slice(8).join(' ');

    return (
        <div 
            className="flex flex-col border-b border-white/5 last:border-0" 
            onMouseEnter={onMouseEnter} 
            onMouseMove={onMouseMove} 
            onMouseLeave={onMouseLeave}
        >
            <div className="flex items-center gap-2 p-1.5 hover:bg-[#ffffff08] cursor-pointer group transition-colors">
                <div className="w-12 text-center text-[10px] font-bold text-[#bab9b8] shrink-0 py-0.5 bg-[#1a1917] rounded border border-white/5">
                    {typeof ev === 'number' && ev > 0 ? `+${ev.toFixed(2)}` : ev}
                </div>
                <div className="text-[11px] text-[#bab9b8] flex-1 font-medium leading-none tracking-tight">
                    {shortMoves}
                    {!isExpanded && remainingMoves && " ..."}
                </div>
                {remainingMoves && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
                        className="p-1 text-[#8b8987] hover:text-white transition-colors"
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                )}
            </div>
            {isExpanded && remainingMoves && (
                <div className="px-[60px] pb-2 text-[11px] text-[#8b8987] leading-relaxed animate-in slide-in-from-top-1 duration-200">
                    {remainingMoves}
                </div>
            )}
        </div>
    );
};

export default EngineLineSimple;