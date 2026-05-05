export const getSquareNameFromCoords = (row, col) => {
    const filesArr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return `${filesArr[col]}${8 - row}`;
};

export const isPromotionMove = (piece, to, promotion) => (
    piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1')) && !promotion
);
