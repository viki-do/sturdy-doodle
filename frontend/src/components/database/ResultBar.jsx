import { formatNumber, percent } from '../../utils/databaseFormatters';

const ResultBar = ({ label, total, wins, draws, losses }) => {
  const winPct = percent(wins, total);
  const drawPct = percent(draws, total);
  const lossPct = percent(losses, total);

  return (
    <div>
      <div className="text-[#bab9b8] font-bold text-lg mb-1">
        {label} <span className="text-white">{formatNumber(total)}</span>
      </div>
      <div className="h-7 w-full bg-[#3c3a37] overflow-hidden flex text-sm font-bold">
        <div className="bg-[#f0efed] text-[#33312e] px-2 flex items-center" style={{ width: `${winPct}%`, minWidth: winPct ? 58 : 0 }}>
          {winPct}% Win
        </div>
        <div className="bg-[#676560] text-white px-2 flex items-center justify-end" style={{ width: `${drawPct}%`, minWidth: drawPct ? 62 : 0 }}>
          {drawPct}% Draw
        </div>
        <div className="bg-[#3e3c39] text-white px-2 flex items-center justify-end" style={{ width: `${lossPct}%`, minWidth: lossPct ? 58 : 0 }}>
          {lossPct}% Loss
        </div>
      </div>
    </div>
  );
};

export default ResultBar;
