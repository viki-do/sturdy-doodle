import { Search, X } from 'lucide-react';

const SearchBox = ({ value, onChange, placeholder, readOnly = false }) => (
  <div className="flex items-center bg-[#373430] border border-[#53504c] h-11 px-2">
    <Search size={22} className="text-[#a6a4a1] shrink-0" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      className="w-full bg-transparent outline-none px-2 text-[#d7d6d4] placeholder:text-[#8b8987]"
    />
    {value && !readOnly && (
      <button onClick={() => onChange('')} type="button" className="text-[#bab9b8] hover:text-white">
        <X size={20} />
      </button>
    )}
  </div>
);

export default SearchBox;
