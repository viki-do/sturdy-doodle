export const parseTimeControl = (timeStr) => {
    if (!timeStr || timeStr === "No Timer") return { base: null, inc: 0 };
    const cleanStr = timeStr.replace(' min', '').trim();
    if (cleanStr.includes('|')) {
        const [basePart, incPart] = cleanStr.split('|').map(s => parseInt(s.trim()));
        return { base: basePart * 60, inc: incPart };
    }
    const mins = parseInt(cleanStr);
    return { base: mins * 60, inc: 0 };
};

export const getTimeCategory = (hasTimer, initialTime) => (
    hasTimer ? (initialTime < 180 ? "bullet" : initialTime < 600 ? "blitz" : "rapid") : "custom"
);
