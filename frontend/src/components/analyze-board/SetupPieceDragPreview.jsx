import { motion } from 'framer-motion';
import { getPieceName } from './analyzeBoardUtils';

const MotionImg = motion.img;

const SetupPieceDragPreview = ({ isDragging, selectedSetupPiece, mousePos }) => {
    if (!isDragging || !selectedSetupPiece) return null;

    return (
        <MotionImg
            key="global-dragging-piece"
            src={`/assets/pieces/${
                selectedSetupPiece === selectedSetupPiece.toUpperCase()
                    ? `white_${getPieceName(selectedSetupPiece)}`
                    : `black_${getPieceName(selectedSetupPiece)}`
            }.png`}
            className="pointer-events-none fixed"
            style={{
                width: '75px',
                height: '75px',
                zIndex: 999999,
                left: 0,
                top: 0,
                filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.5))'
            }}
            animate={{
                x: mousePos.x - 37.5,
                y: mousePos.y - 37.5,
                scale: 1.1
            }}
            transition={{ type: "tween", ease: "linear", duration: 0 }}
            exit={{ opacity: 0 }}
        />
    );
};

export default SetupPieceDragPreview;
