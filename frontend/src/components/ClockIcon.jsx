import React, { useState, useEffect, useRef } from 'react';

const ClockIcon = ({ isActive, currentSeconds }) => {
    const [rotation, setRotation] = useState(-90);
    // FONTOS: Most már az egész másodpercet tároljuk a referenciában
    const lastWholeSecondRef = useRef(Math.floor(currentSeconds));

    useEffect(() => {
        // Kiszámoljuk az aktuális egész másodpercet
        const currentWholeSecond = Math.floor(currentSeconds);

        // Csak akkor ugrunk, ha aktív ÉS az EGÉSZ másodperc megváltozott
        if (isActive && lastWholeSecondRef.current !== currentWholeSecond) {
            setRotation(prev => prev + 90);
        }
        
        // Frissítjük a referenciát
        lastWholeSecondRef.current = currentWholeSecond;
    }, [isActive, currentSeconds]);

    return (
        <div className="relative flex items-center justify-center w-4 h-4">
            <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible">
                <circle 
                    cx="12" cy="12" r="10" 
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={`${isActive ? 'text-[#81b64c]' : 'text-[#989795] opacity-40'} transition-colors duration-300`}
                />
                
                <line
                    x1="12" y1="12" 
                    x2="12" y2="6.5" 
                    stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                    className={`${isActive ? 'text-[#81b64c]' : 'text-[#989795] opacity-40'} transition-colors duration-300`}
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: '12px 12px',
                        // A pattanó animáció marad 0.15s, így szép éles marad az ugrás
                        transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                />
            </svg>
        </div>
    );
};

export default ClockIcon;