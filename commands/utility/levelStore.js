const { createStore } = require('./jsonStore.js');

const store = createStore('levels.json', 10000);

const readLevels = () => store.read();

const writeLevels = (levels) => {
    store.write(levels);
};

const readGlobalTotals = (excludedGuilds = []) => {
    const levels = readLevels();
    const totals = {};

    let guilds = 0;

    Object.keys(levels).forEach(guildId => {
        if (excludedGuilds.includes(guildId)) return;

        const guildLevels = levels[guildId];

        guilds++;

        Object.keys(guildLevels).forEach(userId => {
            totals[userId] = (totals[userId] || 0) + guildLevels[userId];
        });
    });

    return { totals: totals, guilds: guilds };
};

const readGlobalBest = (excludedGuilds = []) => {
    const levels = readLevels();
    const best = {};

    let guilds = 0;

    Object.keys(levels).forEach(guildId => {
        if (excludedGuilds.includes(guildId)) return;

        const guildLevels = levels[guildId];

        guilds++;

        Object.keys(guildLevels).forEach(userId => {
            const xp = guildLevels[userId];

            if (!best[userId] || xp > best[userId]) best[userId] = xp;
        });
    });

    return { totals: best, guilds: guilds };
};

module.exports = { readLevels, writeLevels, readGlobalTotals, readGlobalBest };
