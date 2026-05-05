import { MoveIcon, MoveNotation } from './MoveNotation';
import { getHistoryIndex } from './moveListUtils';

const MoveRows = ({ rows, history, viewIndex, goToMove }) => (
    <div className="flex flex-col">
        {rows.map((row, i) => {
            const whiteIdx = getHistoryIndex(history, row.white);
            const blackIdx = getHistoryIndex(history, row.black);
            return (
                <div key={i} className={`flex h-10 items-center ${i % 2 === 0 ? 'bg-[#2b2926]' : 'bg-transparent'}`}>
                    <div className="w-10 text-center text-[#666] text-[13px] font-semibold shrink-0">{row.moveNumber}.</div>

                    <div
                        onClick={() => goToMove(whiteIdx)}
                        className={`w-28 h-8 flex items-center px-2 cursor-pointer font-bold text-[14px] transition-colors ${
                            viewIndex === whiteIdx ? 'bg-[#3b3835] text-white rounded-sm' : 'text-[#bab9b8] hover:text-white'
                        }`}
                    >
                        <MoveNotation move={row.white} isBlack={false} />
                        <MoveIcon move={row.white} />
                    </div>

                    <div
                        onClick={() => row.black && goToMove(blackIdx)}
                        className={`w-28 h-8 flex items-center px-2 cursor-pointer font-bold text-[14px] transition-colors ${
                            row.black && viewIndex === blackIdx ? 'bg-[#3b3835] text-white rounded-sm' : 'text-[#bab9b8] hover:text-white'
                        }`}
                    >
                        {row.black ? <MoveNotation move={row.black} isBlack /> : ""}
                        <MoveIcon move={row.black} />
                    </div>

                    <div className="flex-1"></div>

                    <div className="w-20 flex flex-col justify-center pr-3 border-l border-chess-bg/30">
                        <div className="flex items-center justify-end gap-1 leading-none text-[10px] text-[#989795]">
                            {row.white?.eval !== undefined && (
                                <span className="mr-1 text-[#666] font-mono">{row.white.eval > 0 ? `+${row.white.eval}` : row.white.eval}</span>
                            )}
                            {row.white?.t !== undefined ? row.white.t.toFixed(1) : "0.0"}s
                        </div>
                        {row.black && (
                            <div className="flex items-center justify-end gap-1 leading-none text-[10px] text-[#666]">
                                {row.black.eval !== undefined && (
                                    <span className="mr-1 text-[#444] font-mono">{row.black.eval > 0 ? `+${row.black.eval}` : row.black.eval}</span>
                                )}
                                {row.black.t !== undefined ? row.black.t.toFixed(1) : "0.0"}s
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
    </div>
);

export default MoveRows;
