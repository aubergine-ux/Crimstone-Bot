const SNIPE_LIMIT = 5;
const CHANNEL_LIMIT = 200;

const snipes = new Map();

const addSnipe = (channelId, entry) => {
    const existing = snipes.get(channelId) || [];

    existing.unshift(entry);

    if (existing.length > SNIPE_LIMIT) existing.length = SNIPE_LIMIT;

    snipes.delete(channelId);
    snipes.set(channelId, existing);

    if (snipes.size > CHANNEL_LIMIT) {
        const oldest = snipes.keys().next().value;
        snipes.delete(oldest);
    }
};

const getSnipes = (channelId) => snipes.get(channelId) || [];

const clearSnipes = (channelId) => snipes.delete(channelId);

module.exports = { addSnipe, getSnipes, clearSnipes, SNIPE_LIMIT };
