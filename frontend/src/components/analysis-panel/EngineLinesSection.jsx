import EngineLineSimple from '../component_helpers/EngineLineSimple';
import { EngineLineSpecial } from '../component_helpers/AnalysisHelpers';
import { getAnalysisColor, getVariationFen } from './analysisPanelUtils';

const EngineLinesSection = ({ currentMoveData, engineLinesToDisplay, onTooltipChange }) => (
    <div className="space-y-[1px] shrink-0">
        {currentMoveData?.analysisLabel && (
            <EngineLineSpecial
                type={currentMoveData.is_book ? 'book' : currentMoveData.analysisLabel}
                eval={currentMoveData.eval}
                text={currentMoveData.is_book
                    ? `${currentMoveData.m} is a book move`
                    : `${currentMoveData.m} is a ${currentMoveData.analysisLabel}`}
                subtext={!currentMoveData.is_book && currentMoveData.analysisLabel !== 'best'
                    ? `Best was: ${currentMoveData.bestMove}`
                    : "Optimal line"}
                colorFn={getAnalysisColor}
            />
        )}

        {engineLinesToDisplay.map((line, idx) => (
            <EngineLineSimple
                key={idx}
                eval={line.eval}
                moves={line.continuation}
                onMouseEnter={(e) => {
                    const fen = getVariationFen(line.pv_uci, currentMoveData);
                    onTooltipChange({ x: e.clientX, y: e.clientY, visible: true, fen });
                }}
                onMouseMove={(e) => onTooltipChange(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                onMouseLeave={() => onTooltipChange(prev => ({ ...prev, visible: false }))}
            />
        ))}
    </div>
);

export default EngineLinesSection;
