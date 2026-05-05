const DetailGameRow = ({ game }) => {
  const year = String(game.date || '').slice(0, 4) || '----';
  const moveCount = game.ply_count ? Math.ceil(game.ply_count / 2) : '';
  const preview = String(game.moves || '').replace(/\s+/g, ' ').slice(0, 120);

  return (
    <div className="grid grid-cols-[1fr_80px_80px_80px_34px] gap-3 px-3 py-4 border-b border-[#373430] last:border-b-0 text-[#d7d6d4]">
      <div className="min-w-0">
        <div className="font-bold truncate">
          {game.white} <span className="text-[#8b8987]">vs.</span> {game.black}
        </div>
        <div className="mt-2 text-sm text-[#bab9b8] truncate">
          {preview || game.opening || 'Unknown opening'}
        </div>
      </div>
      <div className="text-white font-bold self-center">{game.result || '*'}</div>
      <div className="self-center">{moveCount}</div>
      <div className="self-center">{year}</div>
      <div className="self-center justify-self-end w-4 h-4 border border-[#8b8987]" />
    </div>
  );
};

export default DetailGameRow;
