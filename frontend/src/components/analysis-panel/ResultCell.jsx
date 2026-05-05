import { Info } from 'lucide-react';

const ResultCell = ({ resultLabel, statusText }) => (
    <div className="flex items-center gap-2 min-h-[26px]">
        <span className="text-[14px] font-bold text-[#bab9b8] leading-none">
            {resultLabel}
        </span>
        {statusText ? (
            <div
                title={statusText}
                className="w-6 h-6 rounded-full bg-[#8b8987] text-[#262421] flex items-center justify-center cursor-help shrink-0"
            >
                <Info size={14} strokeWidth={2.75} />
            </div>
        ) : null}
    </div>
);

export default ResultCell;
