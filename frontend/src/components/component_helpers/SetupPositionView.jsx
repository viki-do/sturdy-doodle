import React from 'react';
import { ChevronRight, Settings } from 'lucide-react';
import { SetUpPosition, LoadPrevious } from '../icons/Icons';

const SetUpPositionView = ({ onBack }) => {
    return (
        <div className="flex flex-col h-full bg-[#262421]">
            <div className="p-4 border-b border-[#3c3a37] flex items-center bg-[#21201d]">
                <button onClick={onBack} className="text-[#bab9b8] hover:text-white mr-4 transition-colors">
                    <ChevronRight size={24} className="rotate-180" />
                </button>
                <SetUpPosition size={20} className="text-[#bab9b8] mr-2" />
                <h2 className="font-bold text-white text-sm">Setup Position</h2>
            </div>

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
        </div>
    );
};

export default SetUpPositionView;