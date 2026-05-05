import { motion } from 'framer-motion';

const MotionDiv = motion.div;

const GameOverPopup = ({
    isGameActiveUI,
    delayedShowPopup,
    status,
    reason,
    onClose,
    onNewGame,
}) => {
    if (!isGameActiveUI || !delayedShowPopup) return null;

    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center z-9999 rounded-sm pointer-events-auto">
            <MotionDiv initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#262421] p-10 rounded-3xl text-center border border-chess-bg shadow-2xl max-w-sm w-85 relative">
                <button onClick={onClose} className="absolute top-4 right-5 text-[#989795] hover:text-white text-xl cursor-pointer">
                    <i className="fas fa-times"></i>
                </button>
                <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-widest">{status}</h1>
                <p className="text-[#bab9b8] mb-8 font-semibold italic text-sm">{reason || "Match finished"}</p>
                <div className="flex flex-col gap-3">
                    <button onClick={onNewGame} className="w-full py-4 bg-[#81b64c] text-white rounded-xl text-xl font-bold hover:bg-[#a3d16a] transition-all shadow-lg cursor-pointer">
                        New Game
                    </button>
                </div>
            </MotionDiv>
        </MotionDiv>
    );
};

export default GameOverPopup;
