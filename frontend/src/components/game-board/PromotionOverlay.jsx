import { motion } from 'framer-motion';

const MotionDiv = motion.div;

const PromotionOverlay = ({ isGameActiveUI, pendingPromotion, isFlipped, executeMove }) => {
    if (!isGameActiveUI || !pendingPromotion) return null;

    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute z-5000 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
            style={{
                left: `${(isFlipped ? (104 - pendingPromotion.to.charCodeAt(0)) : (pendingPromotion.to.charCodeAt(0) - 97)) * 12.5}%`,
                top: ((!isFlipped && pendingPromotion.to.endsWith('8')) || (isFlipped && pendingPromotion.to.endsWith('1'))) ? '0' : 'auto',
                bottom: ((!isFlipped && pendingPromotion.to.endsWith('1')) || (isFlipped && pendingPromotion.to.endsWith('8'))) ? '0' : 'auto',
                width: '12.5%'
            }}>
            {['q', 'n', 'r', 'b'].map((type) => (
                <button key={type} onClick={() => executeMove(pendingPromotion.from, pendingPromotion.to, type)} className="w-full aspect-square hover:bg-gray-100 p-1 border-b border-gray-100">
                    <img src={`/assets/pieces/${isFlipped ? 'black' : 'white'}_${type === 'q' ? 'queen' : type === 'n' ? 'knight' : type === 'r' ? 'rook' : 'bishop'}.png`} alt={type} />
                </button>
            ))}
        </MotionDiv>
    );
};

export default PromotionOverlay;
