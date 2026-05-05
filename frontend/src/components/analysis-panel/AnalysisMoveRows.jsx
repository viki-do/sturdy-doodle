import { MoveItem } from '../component_helpers/AnalysisHelpers';
import { buildAnalysisMoveRows } from './analysisPanelUtils';
import ResultCell from './ResultCell';

const AnalysisMoveRows = ({
    history,
    viewIndex,
    currentFen,
    resultLabel,
    statusText,
    currentMoveData,
    onViewMove,
}) => {
    const rows = buildAnalysisMoveRows({ history, currentFen, resultLabel, currentMoveData });

    return (
        <div className="flex flex-col py-1 overflow-y-auto no-scrollbar flex-1 min-h-0">
            {rows.map((row) => {
                if (row.type === 'black-only') {
                    return (
                        <div key={row.key} className={`grid grid-cols-[35px_1fr_1fr] items-center min-h-[30px] px-3 ${viewIndex === row.index ? 'bg-[#ffffff03]' : ''}`}>
                            <span className="text-[12px] text-[#8b8987] font-mono select-none">{row.displayNum}.</span>
                            <span className="text-[12px] text-[#8b8987] px-3 italic opacity-50">...</span>
                            <MoveItem
                                move={row.currentMove}
                                isActive={viewIndex === row.index}
                                onClick={() => onViewMove(row.index)}
                                isBlack={true}
                                prefixText={`${row.displayNum}.`}
                            />
                        </div>
                    );
                }

                if (row.type === 'pair') {
                    return (
                        <div key={row.key} className={`grid grid-cols-[35px_1fr_1fr] items-center min-h-[30px] px-3 ${
                            (viewIndex === row.index || (row.canPairBlackMove && viewIndex === row.index + 1)) ? 'bg-[#ffffff03]' : ''
                        }`}>
                            <span className="text-[12px] text-[#8b8987] font-mono select-none">{row.displayNum}.</span>
                            <MoveItem
                                move={row.currentMove}
                                isActive={viewIndex === row.index}
                                onClick={() => onViewMove(row.index)}
                                isBlack={false}
                            />
                            {row.canPairBlackMove ? (
                                <MoveItem
                                    move={row.nextMove}
                                    isActive={viewIndex === row.index + 1}
                                    onClick={() => onViewMove(row.index + 1)}
                                    isBlack={true}
                                    prefixText={`${row.displayNum}.`}
                                />
                            ) : <div className="flex-1" />}
                        </div>
                    );
                }

                if (row.resultTurn === 'w') {
                    return (
                        <div key={row.key} className="grid grid-cols-[35px_1fr_1fr] items-center min-h-[30px] px-3">
                            <div className="col-span-2">
                                <ResultCell resultLabel={resultLabel} statusText={statusText} />
                            </div>
                            <div className="flex-1" />
                        </div>
                    );
                }

                return (
                    <div key={row.key} className="grid grid-cols-[35px_1fr_1fr] items-center min-h-[30px] px-3">
                        <span />
                        <div className="flex-1" />
                        <ResultCell resultLabel={resultLabel} statusText={statusText} />
                    </div>
                );
            })}
        </div>
    );
};

export default AnalysisMoveRows;
