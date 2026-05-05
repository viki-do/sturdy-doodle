import { motion } from 'framer-motion';
import { GameCollections, SetUpPosition } from '../icons/Icons';

const MotionDiv = motion.div;

const SaveCollectionModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center">
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <MotionDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-[450px] bg-[#262421] rounded-xl shadow-2xl border border-[#3c3a37] overflow-hidden">
                <div className="p-4 border-b border-[#3c3a37] bg-[#21201d] flex justify-between items-center">
                    <h3 className="text-white font-bold">Add to Collection</h3>
                    <button onClick={onClose} className="text-[#bab9b8] hover:text-white rotate-45"><SetUpPosition size={18}/></button>
                </div>
                <div className="p-12 text-center text-[#bab9b8] text-sm">You have not created any Collections yet.</div>
                <div className="p-6 pt-0 space-y-2">
                    <button className="w-full py-3 bg-[#312e2b] text-white font-bold rounded-lg flex items-center justify-center gap-2 border border-[#3c3a37]"><SetUpPosition size={20}/> Create New Collection</button>
                    <button className="w-full py-3 text-[#bab9b8] text-xs font-bold flex items-center justify-center gap-2"><GameCollections size={16}/> Copy Shareable Link</button>
                </div>
            </MotionDiv>
        </div>
    );
};

export default SaveCollectionModal;
