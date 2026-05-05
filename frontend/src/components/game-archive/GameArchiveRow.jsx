const GameTypeIcon = ({ type }) => {
    if (type === 'bot') {
        return (
            <div className="text-blue-300 text-2xl opacity-80"><i className="fas fa-robot"></i></div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <div className={`${type.includes('min') ? 'text-[#81b64c]' : 'text-yellow-500'} text-xl`}><i className={`fas ${type.includes('min') ? 'fa-stopwatch' : 'fa-sun'}`}></i></div>
            <div className="text-[9px] uppercase font-bold text-[#666] mt-1 whitespace-nowrap">{type}</div>
        </div>
    );
};

const PlayerLine = ({ player, isWhite, won }) => (
    <div className="flex items-center gap-2">
        <div className={`w-3 h-3 ${isWhite ? 'bg-white' : 'bg-[#3c3a37]'} rounded-sm ${won ? 'ring-2 ring-[#81b64c]' : ''}`}></div>
        {player.isMe && <span className="text-blue-400 text-[10px]"><i className="fas fa-gem"></i></span>}
        <span className={`text-[13px] ${player.isMe ? 'font-bold text-white' : 'text-[#bab9b8]'}`}>
            {player.name} <span className="text-[#666] font-normal">({player.elo})</span>
            {!player.isMe && <span className="ml-1 opacity-60">{isWhite ? '🇭🇺' : '🌎'}</span>}
        </span>
    </div>
);

const GameArchiveRow = ({ game }) => {
    const whiteWon = game.result === "1-0";
    const blackWon = game.result === "0-1";
    const whitePlayer = game.iWasWhite ? { name: "viki1003", elo: game.myElo, isMe: true } : { name: game.opponent, elo: game.elo, isMe: false };
    const blackPlayer = !game.iWasWhite ? { name: "viki1003", elo: game.myElo, isMe: true } : { name: game.opponent, elo: game.elo, isMe: false };

    return (
        <tr className="hover:bg-[#2b2926] transition-colors cursor-pointer group h-[85px]">
            <td className="px-4 py-2 text-center align-middle">
                <GameTypeIcon type={game.type} />
            </td>

            <td className="px-2 py-2">
                <div className="flex flex-col gap-1.5">
                    <PlayerLine player={whitePlayer} isWhite won={whiteWon} />
                    <PlayerLine player={blackPlayer} isWhite={false} won={blackWon} />
                </div>
            </td>

            <td className="px-4 py-2">
                <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col text-[13px] font-bold text-[#8b8987] leading-tight text-right w-4">
                        <span className={whiteWon ? 'text-white' : ''}>{whiteWon ? '1' : '0'}</span>
                        <span className={blackWon ? 'text-white' : ''}>{blackWon ? '1' : '0'}</span>
                    </div>
                    <div className={`w-6 h-6 flex items-center justify-center rounded-sm ${game.win ? 'bg-[#81b64c]' : 'bg-[#fa412d]'}`}>
                        <i className={`fas ${game.win ? 'fa-plus' : 'fa-minus'} text-[10px] text-white`}></i>
                    </div>
                </div>
            </td>

            <td className="px-4 py-2 text-center">
                <div className="flex flex-col text-[12px] font-bold leading-tight items-center">
                    <span className="text-[#8b8987]">{game.accuracy[0]}</span>
                    <span className="text-white">{game.accuracy[1]}</span>
                </div>
            </td>

            <td className="px-4 py-2 text-center text-white font-medium text-[13px]">{game.moves}</td>
            <td className="px-4 py-2 text-right text-white text-[13px] whitespace-nowrap font-medium">{game.date}</td>
            <td className="px-4 py-2 text-center"><input type="checkbox" className="accent-[#81b64c]" /></td>
        </tr>
    );
};

export default GameArchiveRow;
