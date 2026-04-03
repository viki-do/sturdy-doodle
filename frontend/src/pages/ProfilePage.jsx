import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const ProfilePage = () => {
    const [user, setUser] = useState({ username: '', email: '', provider: '' });
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const token = localStorage.getItem('chessToken');

    const fetchProfile = useCallback(async () => {
        try {
            const res = await axios.get('http://localhost:8000/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
            setNewUsername(res.data.username);
        } catch (err) { 
            console.error("Profil lekérési hiba:", err); 
        }
    }, [token]);

    const handleUpdate = async () => {
        try {
            await axios.put('http://localhost:8000/profile/update', 
                { username: newUsername, password: newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            localStorage.setItem('chessUsername', newUsername);
            alert("Profil sikeresen frissítve!");
            window.location.reload();
        } catch (err) { 
            alert(err.response?.data?.detail || "Hiba történt"); 
        }
    };

    useEffect(() => {
        const loadData = async () => {
            await fetchProfile();
        };
        loadData();
    }, [fetchProfile]);

    // Közös Tailwind osztályok az egységességért
    const labelClasses = "block text-sm font-medium text-[#8b8987] mb-2";
    const inputClasses = "w-full p-2.5 bg-[#262421] border border-[#454241] rounded text-white focus:outline-none focus:border-[#81b64c] transition-colors";
    const disabledInputClasses = "w-full p-2.5 bg-[#1a1917] border border-[#454241] rounded text-[#666] cursor-not-allowed";

    return (
        <div className="min-h-screen bg-chess-bg text-white font-sans">
            <div className="max-w-150 mx-auto mt-10 p-8 bg-[#262421] rounded-lg shadow-xl border border-chess-bg">
                <h2 className="text-2xl font-bold mb-2">Profile Settings</h2>
                <p className="text-[#8b8987] text-sm mb-6">Manage your account information and password.</p>
                
                <hr className="border-[#454241] mb-8" />
                
                <div className="space-y-6">
                    {/* Email - Mindig tiltott */}
                    <div>
                        <label className={labelClasses}>Email Address</label>
                        <input 
                            type="text" 
                            value={user.email} 
                            disabled 
                            className={disabledInputClasses} 
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className={labelClasses}>Username</label>
                        <input 
                            type="text" 
                            value={newUsername} 
                            onChange={(e) => setNewUsername(e.target.value)} 
                            className={inputClasses}
                        />
                    </div>

                    {/* Password - Csak lokális felhasználóknak */}
                    {user.provider === 'local' && (
                        <div>
                            <label className={labelClasses}>New Password (optional)</label>
                            <input 
                                type="password" 
                                placeholder="Leave empty to keep current" 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                className={inputClasses}
                            />
                        </div>
                    )}

                    <div className="pt-4">
                        <button 
                            onClick={handleUpdate} 
                            className="w-full py-3 bg-[#81b64c] text-white font-bold rounded hover:bg-[#a3d16a] transition-colors shadow-md cursor-pointer"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;