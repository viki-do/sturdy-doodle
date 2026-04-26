import React from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';

const GameDatabase = () => {
  // Példa adatok a játékosokhoz
  const players = [
    { name: "Garry Kasparov", games: "2,440 Games", img: "/assets/Players/GaryKasparov.jpg" },
    { name: "Bobby Fischer", games: "1,195 Games", img: "/assets/Players/BobbyFischer.jpg" },
    { name: "Magnus Carlsen", games: "6,596 Games", img: "/assets/Players/MagnusCarlsen.webp" },
    { name: "Jose Raul Capablanca", games: "1,310 Games", img: "/assets/Players/JoseRaulCapablanca.jpeg" },
    { name: "Hikaru Nakamura", games: "3,412 Games", img: "/assets/Players/HikaruNakamura.jpg" },
  ];

  return (
    <div className="min-h-screen bg-[#262421] text-[#bababa] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-16">
        
        {/* Header Section */}
        <header className="flex items-center mb-8">
          <img src="/assets/moves/chess_database.svg" alt="Logo" className="w-12 h-12  mr-4" />
          <h1 className="text-2xl font-bold text-white">Chess Games Database</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Left side) */}
          <div className="lg:col-span-2">
            <p className="mb-8 leading-relaxed max-w-2xl">
              Search through millions of top games played by the strongest chess players of the past and present. 
              From world chess champions to FIDE masters, you will find an enormous collection of games that you can search, sort, and download.
            </p>

            {/* Players Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {players.map((player, index) => (
                <div key={index} className="group cursor-pointer">
                  <div className="overflow-hidden rounded-sm mb-3">
                    <img 
                      src={player.img} 
                      alt={player.name}
                      className="w-full h-48 object-cover grayscale-[0.2] hover:grayscale-0 transition-all"
                    />
                  </div>
                  <h3 className="text-white font-semibold text-lg">{player.name}</h3>
                  <p className="text-sm text-gray-400">{player.games}</p>
                </div>
              ))}
            </div>

            {/* Pagination / Footer buttons */}
            <div className="mt-12 flex justify-between items-center border-t border-gray-700 pt-6">
              <button className="flex items-center bg-[#312e2b] px-4 py-2 rounded hover:bg-[#3d3a37] transition">
                <ChevronUp size={18} className="mr-2" /> Top
              </button>
              
              <div className="flex space-x-1">
                <button className="p-2 bg-[#312e2b] rounded-l disabled:opacity-50"><ChevronLeft size={18}/></button>
                <button className="px-4 py-2 bg-[#45423e] text-white">1</button>
                <button className="px-4 py-2 bg-[#312e2b] hover:bg-[#3d3a37]">2</button>
                <button className="px-4 py-2 bg-[#312e2b] hover:bg-[#3d3a37]">3</button>
                <button className="px-4 py-2 bg-[#312e2b] hover:bg-[#3d3a37]">4</button>
                <button className="px-4 py-2 bg-[#312e2b] hover:bg-[#3d3a37]">5</button>
                <button className="p-2 bg-[#312e2b] rounded-r"><ChevronRight size={18}/></button>
              </div>
            </div>
          </div>

          {/* Sidebar (Right side) */}
          <aside className="space-y-6">
            
            {/* Search Card */}
            <div className="bg-[#21201d] p-5 rounded shadow-lg border border-[#312e2b]">
              <h2 className="text-white font-bold mb-4 text-lg">Games</h2>
              <p className="text-sm mb-4">Select an opening or player to search</p>
              
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                  <input className="w-full bg-[#262421] border border-transparent focus:border-gray-600 outline-none p-2 pl-10 rounded" placeholder="Opening" />
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                  <input className="w-full bg-[#262421] border border-transparent focus:border-gray-600 outline-none p-2 pl-10 rounded" placeholder="Player 1" />
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                  <input className="w-full bg-[#262421] border border-transparent focus:border-gray-600 outline-none p-2 pl-10 rounded" placeholder="Player 2" />
                </div>
                
                <label className="flex items-center space-x-2 cursor-pointer pt-2">
                  <input type="checkbox" className="accent-[#81b64c] w-4 h-4" />
                  <span className="text-sm">Fixed Colors</span>
                </label>

                <button className="w-full bg-[#81b64c] hover:bg-[#a3d160] text-white font-bold py-3 rounded shadow-[0_4px_0_0_rgb(69,101,41)] transition-all active:translate-y-1 active:shadow-none mt-4">
                  Search
                </button>
                
                <div className="flex justify-end pt-2">
                  <button className="text-sm flex items-center hover:text-white">
                    Advanced <ChevronDown size={16} className="ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default GameDatabase;
