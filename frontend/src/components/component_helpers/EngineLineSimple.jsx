import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const EngineLineSimple = ({ eval: ev, moves = "", onMouseEnter, onMouseLeave, onMouseMove }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Biztonsági ellenőrzés: ha moves null vagy undefined, legyen üres tömb
    const moveArray = moves ? String(moves).split(/\s+/) : []; 
    
    // Ha sötét kezd (1...), akkor az első "lépés" a prefix lesz, 
    // így érdemes lehet 9 elemet mutatni, hogy 8 valódi lépés látsszon.
    const limit = moveArray[0] === "1..." ? 9 : 8;
    
    const shortMoves = moveArray.slice(0, limit).join(' ');
    const remainingMoves = moveArray.slice(limit).join(' ');

    if (moveArray.length === 0) return null;

    return (
        <div 
            className="flex flex-col border-b border-white/5 last:border-0" 
            onMouseEnter={onMouseEnter} 
            onMouseMove={onMouseMove} 
            onMouseLeave={onMouseLeave}
        >
            <div 
                className="flex items-center gap-2 p-1.5 hover:bg-[#ffffff08] cursor-pointer group transition-colors"
                onClick={() => remainingMoves && setIsExpanded(!isExpanded)}
            >
                <div className="w-12 text-center text-[10px] font-bold text-[#bab9b8] shrink-0 py-0.5 bg-[#1a1917] rounded border border-white/5">
                    {typeof ev === 'number' ? (ev > 0 ? `+${ev.toFixed(2)}` : ev.toFixed(2)) : ev}
                </div>
                <div className="text-[11px] text-[#bab9b8] flex-1 font-medium leading-none tracking-tight">
                    <span className={moveArray[0] === "1..." ? "text-[#8b8987] font-mono mr-1" : ""}>
                        {shortMoves}
                    </span>
                    {!isExpanded && remainingMoves && <span className="text-[#8b8987]"> ...</span>}
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