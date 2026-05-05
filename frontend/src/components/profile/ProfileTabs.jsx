import { profileTabs } from '../../constants/profileData';

const ProfileTabs = ({ archiveMode, onTabClick }) => (
    <div className="sticky top-0 z-40 bg-[#21201d] border border-[#3c3a37] flex items-center px-4 shadow-xl">
        {profileTabs.map((tab) => (
            <button
                key={tab}
                onClick={() => onTabClick(tab)}
                className={`px-6 py-4 text-sm font-bold border-b-4 transition-all ${((archiveMode && tab === 'Games') || (!archiveMode && tab === 'Overview')) ? 'border-[#81b64c] text-white bg-[#262421]' : 'border-transparent hover:text-white'}`}
            >
                {tab}
            </button>
        ))}
    </div>
);

export default ProfileTabs;
