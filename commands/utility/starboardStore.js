const { createStore } = require('./jsonStore.js');

const store = createStore('starboard.json');

const DEFAULTS = {
    channelId: null,
    threshold: 3,
    emoji: '⭐',
};

const readStarboard = () => store.read();

const writeStarboard = (starboard) => {
    store.write(starboard);
};

const getStarboard = (guildId) => {
    const saved = readStarboard()[guildId] || {};

    return {
        channelId: saved.channelId || DEFAULTS.channelId,
        threshold: saved.threshold || DEFAULTS.threshold,
        emoji: saved.emoji || DEFAULTS.emoji,
        posts: { ...(saved.posts || {}) },
    };
};

const setStarboard = (guildId, updates) => {
    const starboard = readStarboard();

    if (!starboard[guildId]) starboard[guildId] = {};

    Object.keys(updates).forEach(field => {
        starboard[guildId][field] = updates[field];
    });

    writeStarboard(starboard);
};

const setPost = (guildId, messageId, postId) => {
    const starboard = readStarboard();

    if (!starboard[guildId]) starboard[guildId] = {};
    if (!starboard[guildId].posts) starboard[guildId].posts = {};

    if (postId) {
        starboard[guildId].posts[messageId] = postId;
    } else {
        delete starboard[guildId].posts[messageId];
    }

    writeStarboard(starboard);
};

const resetStarboard = (guildId) => {
    const starboard = readStarboard();

    if (starboard[guildId]) {
        delete starboard[guildId];
        writeStarboard(starboard);
    }
};

module.exports = { getStarboard, setStarboard, setPost, resetStarboard, DEFAULTS };
