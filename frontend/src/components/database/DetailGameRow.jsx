import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const DetailGameRow = ({ game, onOpenGame }) => {
  const [isOpen, setIsOpen] = useState(false);
  const year = String(game.date || '').slice(0, 4) || '----';
  const moveCount = game.ply_count ? Math.ceil(game.ply_count / 2) : '';
  const preview = String(game.moves || '').replace(/\s+/g, ' ').slice(0, 120);
  const fullMoves = String(game.moves || '').replace(/\s+/g, ' ').trim();
  const whiteRating = game.white_elo ? ` (${game.white_elo})` : '';
  const blackRating = game.black_elo ? ` (${game.black_elo})` : '';
  const canOpen = Boolean(fullMoves);

  return (
    <div className="border-b border-[#373430] last:border-b-0 text-[#d7d6d4]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenGame?.(game)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onOpenGame?.(game);
        }}
        className="w-full grid grid-cols-[1fr_80px_80px_80px_34px] gap-3 px-3 py-4 text-left hover:bg-[#24211e] cursor-pointer"
      >
        <div className="min-w-0">
          <div className="font-bold truncate">
            {game.white}<span className="text-[#8b8987]">{whiteRating}</span>{' '}
            <span className="text-[#8b8987]">vs.</span> {game.black}<span className="text-[#8b8987]">{blackRating}</span>
          </div>
          <div className="mt-2 text-sm text-[#bab9b8] truncate">
            {preview || game.opening || 'Unknown opening'}
          </div>
        </div>
        <div className="text-white font-bold self-center">{game.result || '*'}</div>
        <div className="self-center">{moveCount}</div>
        <div className="self-center">{year}</div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (canOpen) setIsOpen((current) => !current);
          }}
          className="self-center justify-self-end text-[#8b8987] hover:text-white"
          disabled={!canOpen}
        >
          {canOpen ? (
            isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />
          ) : (
            <span className="block w-4 h-4 border border-[#8b8987]" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="px-3 pb-5">
          <div className="bg-[#262421] border border-[#3d3a37] px-4 py-4">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#8b8987] mb-3">
              {game.event && <span>{game.event}</span>}
              {game.opening && <span>{game.opening}</span>}
              {game.date && <span>{game.date}</span>}
            </div>
            <p className="text-[#d7d6d4] leading-7 whitespace-pre-wrap break-words">
              {fullMoves}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailGameRow;
