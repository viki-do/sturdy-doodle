import { moves } from '../../constants/review';
import { PieceNotation } from '../component_helpers/AnalysisHelpers';

export const MoveNotation = ({ move, isBlack = false }) => {
    if (!move?.m) return "";
    const hasPieceIcon = /^[NBRQK]/.test(move.m);
    const displayNotation = hasPieceIcon ? move.m.substring(1) : move.m;

    return (
        <>
            <PieceNotation move={move} isBlack={isBlack} />
            <span>{displayNotation}</span>
        </>
    );
};

export const MoveIcon = ({ move }) => {
    if (!move || !move.analysisLabel || move.analysisLabel === 'book') return null;
    const analysis = moves[move.analysisLabel];

    if (!analysis) return null;

    return (
        <img
            src={analysis.src}
            alt={analysis.label}
            title={`${analysis.label}: ${analysis.desc}`}
            className="w-4.5 h-4.5 ml-1.5 object-contain animate-in zoom-in duration-300"
        />
    );
};
