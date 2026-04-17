import React from 'react';
import { Settings, MoreHorizontal } from 'lucide-react';
import { 
    SetUpPosition, 
    LoadPrevious, 
    New, 
    Save, 
    Review, 
    ChevronLeft, 
    ResetArrow,
    ChevronRight,
    ArrowChevronEnd 
} from '../icons/Icons';
import { 
    ControlBtn, 
    FooterAction 
} from './AnalysisHelpers';

const SetUpPositionView = ({ 
    onBack, 
    history = [], 
    currentEval, 
    openingName, 
    onSaveClick, 
    onNewClick,  
    viewIndex,   
    onViewMove,
    onReviewClick,
    onSetupClick 
}) => {
    return (
        /* w-[480px] és h-[744px] a pontos illeszkedéshez az AnalysisPanel-lel */
        <div className="flex flex-col w-[480px] h-[744px] bg-[#262421] rounded-lg shadow-xl border border-[#3c3a37] overflow-hidden">
            
            {/* HEADER - shrink-0 hogy ne nyomódjon össze */}
            <div className="p-4 border-b border-[#3c3a37] flex items-center bg-[#21201d] shrink-0 h-[64px]">
                <button onClick={onBack} className="text-[#bab9b8] hover:text-white mr-4 transition-colors">
                    <ChevronRight size={24} className="rotate-180" />
                </button>
                <SetUpPosition size={20} className="text-[#bab9b8] mr-2" />
                <h2 className="font-bold text-white text-lg">Setup Position</h2>
            </div>

            {/* SCROLLABLE CONTENT - flex-1 hogy kitöltse a maradék helyet */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                <div className="grid grid-cols-6 gap-2 bg-[#21201d] p-4 rounded-lg border border-[#3c3a37]">
                    {['p','b','n','r','q','k'].map(p => (
                        <img key={p} src={`/assets/pieces/black_${p === 'p' ? 'pawn' : p === 'n' ? 'knight' : p === 'b' ? 'bishop' : p === 'r' ? 'rook' : p === 'q' ? 'queen' : 'king'}.png`} className="w-10 h-10 cursor-grab hover:scale-110 transition-transform" alt="" />
                    ))}
                    {['P','B','N','R','Q','K'].map(p => (
                        <img key={p} src={`/assets/pieces/white_${p === 'P' ? 'pawn' : p === 'N' ? 'knight' : p === 'B' ? 'bishop' : p === 'R' ? 'rook' : p === 'Q' ? 'queen' : 'king'}.png`} className="w-10 h-10 cursor-grab hover:scale-110 transition-transform" alt="" />
                    ))}
                </div>

                <div className="space-y-3">
                    <select className="w-full bg-[#161512] text-white p-3 rounded border border-[#3c3a37] text-sm focus:outline-none">
                        <option>White to move</option>
                        <option>Black to move</option>
                    </select>
                    <div className="flex justify-end gap-4 text-[#bab9b8]">
                        <button title="Flip Board" className="hover:text-white transition-colors"><Settings size={18}/></button>
                        <button title="Reset" className="hover:text-white transition-colors"><LoadPrevious size={18}/></button>
                        <button title="Clear" className="hover:text-white transition-colors"><SetUpPosition size={18}/></button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-[#bab9b8]">
                    <div className="space-y-2">
                        <p className="font-bold text-white uppercase text-[10px]">White</p>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked /> O-O</label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked /> O-O-O</label>
                    </div>
                    <div className="space-y-2">
                        <p className="font-bold text-white uppercase text-[10px]">Black</p>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked /> O-O</label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked /> O-O-O</label>
                    </div>
                </div>

                <div className="space-y-2">
                    <input type="text" placeholder="FEN string..." className="w-full bg-[#161512] text-white p-2 rounded border border-[#3c3a37] text-xs font-mono" />
                    <textarea placeholder="[Event '?']..." className="w-full h-20 bg-[#161512] text-white p-2 rounded border border-[#3c3a37] text-xs font-mono resize-none" />
                </div>

                <button className="w-full py-3 bg-[#81b64c] hover:bg-[#95c95c] text-white font-black rounded shadow-lg transition-colors uppercase text-sm">
                    Load
                </button>
            </div>

            {/* FIX FOOTER - shrink-0 hogy fixen maradjon az alján */}
            <div className="p-2 bg-[#21201d] rounded-b-lg border-t border-[#3c3a37] shrink-0 h-[124px] box-border">
                <div className="flex justify-between gap-1 mb-3 px-1 h-12">
                    <ControlBtn icon={<ResetArrow size={20} />} onClick={() => onViewMove?.(0)} />
                    <ControlBtn icon={<ChevronLeft size={20} />} onClick={() => onViewMove?.(viewIndex === -1 ? history.length - 2 : viewIndex - 1)} />
                    <ControlBtn icon={<ChevronRight size={20} />} onClick={() => onViewMove?.(viewIndex === -1 ? -1 : viewIndex + 1)} />
                    <ControlBtn icon={<ArrowChevronEnd size={20} />} onClick={() => onViewMove?.(-1)} />
                </div>
                <div className="flex justify-center items-center text-[#8b8987] pb-1">
                     <div className='flex gap-7'>
                        <FooterAction icon={<New size={20} />} label="New" onClick={onNewClick} />
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