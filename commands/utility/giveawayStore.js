const { createStore } = require('./jsonStore.js');

const store = createStore('giveaways.json');

const readGiveaways = () => store.read();

const writeGiveaways = (giveaways) => {
    store.write(giveaways);
};

const addGiveaway = (giveaway) => {
    const giveaways = readGiveaways();

    giveaways[giveaway.id] = giveaway;

    writeGiveaways(giveaways);
};

const updateGiveaway = (id, updates) => {
    const giveaways = readGiveaways();

    if (!giveaways[id]) return null;

    Object.keys(updates).forEach(field => {
        giveaways[id][field] = updates[field];
    });

    writeGiveaways(giveaways);

    return giveaways[id];
};

const removeGiveaway = (id) => {
    const giveaways = readGiveaways();

    if (!giveaways[id]) return false;

    delete giveaways[id];
    writeGiveaways(giveaways);

    return true;
};

const giveawaysFor = (guildId) => {
    const giveaways = readGiveaways();

    return Object.values(giveaways)
        .filter(giveaway => giveaway.guildId === guildId)
        .sort((a, b) => a.endsAt - b.endsAt);
};

module.exports = { readGiveaways, writeGiveaways, addGiveaway, updateGiveaway, removeGiveaway, giveawaysFor };
