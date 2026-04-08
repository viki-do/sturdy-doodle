const botCategories = [
    { id: 'beginner', name: 'Beginner', elo: 250, icon:'/assets/bot-players/martin.png', bots: [
        { id: 'martin', name: 'Martin', elo: 250, img: '/assets/bot-players/martin.png' },
        { id: 'elenore', name: 'Elenore', elo: 400, img: '/assets/bot-players/elenore.png' }
    ]},
    { id: 'intermediate', name: 'Intermediate', elo: 1000, icon: '/assets/bot-players/laura.png', bots: [
        { id: 'laura', name: 'Laura', elo: 1000, img: '/assets/bot-players/laura.png' },
        { id: 'sven', name: 'Sven', elo: 1300, img: '/assets/bot-players/sven.png' }
    ]},
    { id: 'advanced', name: 'Advanced', elo: 1500, icon: '/assets/bot-players/pierre.png', bots: [
        { id: 'isabel', name: 'Isabel', elo: 1500, img: '/assets/bot-players/isabel.png' },
        { id: 'pierre', name: 'Pierre', elo: 1900, img: '/assets/bot-players/pierre.png' }
    ]},
    { id: 'master', name: 'Master', elo: 2220, icon: '/assets/bot-players/nora.png', bots: [
        { id: 'nora', name: 'Nora', elo: 2220, img: '/assets/bot-players/nora.png' },
        { id: 'wei', name: 'Wei', elo: 2450, img: '/assets/bot-players/wei.png' }
    ]},
    { id: 'top_players', name: 'Top Players', elo: 2820, icon: '/assets/bot-players/hikaru.png', bots: [
        { id: 'hikaru', name: 'Hikaru', elo: 2820, img: '/assets/bot-players/hikaru.png', country: '🇺🇸' },
        { id: 'magnus', name: 'Magnus', elo: 2882, img: '/assets/bot-players/magnus.png', country: 'no' }
    ]}
];

const engineEloSteps = [
    250, 400, 550, 700, 850, 1000, 
    1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 
    2100, 2200, 2300, 2400, 2500, 2600, 2700, 
    2900, 3200
];

export { botCategories, engineEloSteps };