import React, { useState, useEffect } from 'react'; // JAVÍTVA: useState hozzáadva
import { MoreHorizontal, Trash2, RotateCw, Repeat2 } from 'lucide-react';
import { Chess } from 'chess.js'; // JAVÍTVA: Kell a validáláshoz
import { 
    SetUpPosition, 
    LoadPrevious, 
    New, 
    Save, 
    Review, 
    ChevronLeft, 
    ResetArrow,
    ChevronRight,
    ArrowChevronEnd,
} from '../icons/Icons';
import { 
    ControlBtn, 
    FooterAction 
} from './AnalysisHelpers';

const SetUpPositionView = ({ 
    onBack, 
    history = [], 
    onSaveClick, 
    onNewClick,   
    viewIndex,   
    onViewMove,
    onReviewClick,
    currentFen,
    onFenChange,
    onLoadConfirm
}) => {
    // Lokális state a gépeléshez
    const [localFen, setLocalFen] = useState(currentFen);

    // Ha a táblán lépnek (vagy kívülről változik a FEN), frissítjük a kijelzőt
    useEffect(() => {
        setLocalFen(currentFen);
    }, [currentFen]);

    // JAVÍTOTT gépelés kezelés
    const handleInputChange = (e) => {
        const newFen = e.target.value;
        setLocalFen(newFen); // Engedjük a gépelést (lokális state frissül)

        try {
            const c = new Chess(newFen); // Ellenőrizzük, érvényes-e
            onFenChange(newFen); // Ha igen, szólunk a szülőnek (tábla frissül)
        } catch (err) {
            // Ha érvénytelen (pl. épp törli a számot a végéről), 
            // a tábla nem frissül, de a gépelést engedjük tovább.
        }
    };

    return (
        /* A fő konténer határozza meg a teljes méretet */
        <div className="flex flex-col w-[480px] h-[744px] bg-[#262421] rounded-lg shadow-xl border border-[#3c3a37] overflow-hidden">
            
            {/* JAVÍTOTT HEADER: relative szülő, fix magasság */}
            <div className="relative border-b border-[#3c3a37] flex items-center bg-[#21201d] shrink-0 h-[64px] px-4">
                {/* Vissza gomb - z-10 hogy kattintható maradjon az abszolút réteg felett */}
                <button 
                    onClick={onBack} 
                    className="relative z-10 text-[#bab9b8] hover:text-white transition-colors shrink-0"
                >
                    <ChevronRight size={24} className="rotate-180" />
                </button>
                
                {/* IKON ÉS NÉV - Abszolút középre igazítva a teljes fejléchez képest */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex items-center gap-2">
                        <SetUpPosition size={20} className="text-[#bab9b8]" />
                        <h2 className="font-bold text-white text-lg">Setup Position</h2>
                    </div>
                </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-6 gap-2 bg-[#454442] p-4">
                    {['p','b','n','r','q','k'].map(p => (
                        <img key={p} src={`/assets/pieces/black_${p === 'p' ? 'pawn' : p === 'n' ? 'knight' : p === 'b' ? 'bishop' : p === 'r' ? 'rook' : p === 'q' ? 'queen' : 'king'}.png`} className="cursor-grab scale-125 mx-auto" alt="" />
                    ))}
                    {['P','B','N','R','Q','K'].map(p => (
                        <img key={p} src={`/assets/pieces/white_${p === 'P' ? 'pawn' : p === 'N' ? 'knight' : p === 'B' ? 'bishop' : p === 'R' ? 'rook' : p === 'Q' ? 'queen' : 'king'}.png`} className="cursor-grab scale-125 mx-auto" alt="" />
                    ))}
                </div>

                <div className='px-4 flex flex-col'>
                    <div className="py-4 flex items-center gap-4">
                        <select className="flex-1 bg-[#161512] text-white p-2 rounded border border-[#3c3a37] text-sm focus:outline-none cursor-pointer">
                            <option>White to move</option>
                            <option>Black to move</option>
                        </select>
                        <div className="flex items-center justify-center gap-4 text-[#bab9b8]">
                            <button title="Flip Board" className="hover:text-white transition-colors"><Repeat2 size={18}/></button>
                            <button title="Reset" className="hover:text-white transition-colors"><RotateCw size={18}/></button>
                            <button title="Clear" className="hover:text-white transition-colors"><Trash2 size={18}/></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs text-[#bab9b8] py-3">
                        <div className="space-y-2">
                            <p className="font-bold text-white uppercase text-[10px]">White</p>
                            <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" defaultChecked className="accent-[#81b64c]" /> O-O</label>
                            <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" defaultChecked className="accent-[#81b64c]" /> O-O-O</label>
                        </div>
                        <div className="space-y-2">
                            <p className="font-bold text-white uppercase text-[10px]">Black</p>
                            <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" defaultChecked className="accent-[#81b64c]" /> O-O</label>
                            <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" defaultChecked className="accent-[#81b64c]" /> O-O-O</label>
                        </div>
                    </div>

                    <div className="space-y-3 mt-2">
                        <input 
                            type="text" 
                            value={localFen} // localFen-t használunk, nem a currentFen-t!
                            onChange={handleInputChange}
                            placeholder="Enter FEN" 
                            className="w-full bg-[#161512] text-white p-2 rounded border border-[#3c3a37] text-xs font-mono focus:border-[#81b64c] outline-none" 
                        />
                        <textarea placeholder="[Event '?']..." className="w-full h-20 bg-[#161512] text-white p-2 rounded border border-[#3c3a37] text-xs font-mono resize-none focus:border-[#81b64c] outline-none" />
                    </div>

                    <button 
                        onClick={() => onLoadConfirm(localFen)} // Meghívjuk a véglegesítő függvényt
                        className="w-full mt-6 py-3 bg-[#81b64c] hover:bg-[#95c95c] text-white font-black rounded shadow-lg transition-colors uppercase text-sm mb-4"
                    >
                        Load
                    </button>
                </div>
            </div>

            {/* FIX FOOTER */}
            <div className="p-2 bg-[#21201d] rounded-b-lg border-t border-[#3c3a37] shrink-0 h-[124px] box-border">
                <div className="flex justify-between gap-1 mb-3 px-1 h-12">
                    <ControlBtn icon={<ResetArrow size={20} />} onClick={() => onViewMove?.(0)} />
                    <ControlBtn icon={<ChevronLeft size={20} />} onClick={() => onViewMove?.(viewIndex === -1 ? history.length - 2 : viewIndex - 1)} />
                    <ControlBtn icon={<ChevronRight size={20} />} onClick={() => onViewMove?.(viewIndex === -1 ? -1 : viewIndex + 1)} />
                    <ControlBtn icon={<ArrowChevronEnd size={20} />} onClick={() => onViewMove?.(-1)} />
                </div>
                <div className="flex justify-center items-center text-[#8b8987] pb-1">
                     <div className='flex gap-7'>
                        <FooterAction icon={<New size={20} />} label="New" onClick={onBack} />
                        <FooterAction icon={<Save size={20} />} label="Save" onClick={onSaveClick} />
                        <FooterAction icon={<Review size={20} />} label="Review" onClick={onReviewClick} />
                        <FooterAction icon={<MoreHorizontal size={20} />} label="" />
                     </div>
                </div>
            </div>
        </div>
    );
};

export default SetUpPositionView;