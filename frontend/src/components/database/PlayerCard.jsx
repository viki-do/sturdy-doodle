import { formatNumber, getPlayerImage } from '../../utils/databaseFormatters';

const PlayerAvatar = ({ name, image, compact = false }) => (
  <div className={`w-full ${compact ? 'h-36' : 'h-48 md:h-56'} bg-[#e8e7e5] flex items-center justify-center overflow-hidden`}>
    {image ? (
      <img
        src={image}
        alt={name}
        className="w-full h-full object-cover object-top grayscale-[0.12] group-hover:grayscale-0 transition-all duration-300"
      />
    ) : (
      <img
        src="/assets/options/DarkKing.webp"
        alt=""
        className="h-[115%] opacity-35 object-contain translate-y-5"
      />
    )}
  </div>
);

const PlayerCard = ({ player, onSelect, compact = false }) => {
  const image = getPlayerImage(player.name);

  return (
    <button
      onClick={() => onSelect(player)}
      className="group text-left cursor-pointer block w-full"
    >
      <PlayerAvatar name={player.name} image={image} compact={compact} />
      <h3 className={`${compact ? 'text-[18px]' : 'text-[22px]'} text-[#d7d6d4] font-bold mt-4 leading-tight group-hover:text-white transition-colors`}>
        {player.name}
      </h3>
      <p className={`${compact ? 'text-[15px]' : 'text-[18px]'} text-[#d7d6d4] mt-2`}>
        {formatNumber(player.games)} Games
      </p>
    </button>
  );
};

export default PlayerCard;
