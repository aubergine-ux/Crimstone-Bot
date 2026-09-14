const { createStore } = require('./jsonStore.js');

const store = createStore('activity.json', 15000);

const DAY_LIMIT = 14;

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

const recordMessage = (guildId, channelId) => {
    const activity = store.read();

    if (!activity[guildId]) activity[guildId] = { daily: {}, channels: {} };

    const guildActivity = activity[guildId];
    const today = dayKey(Date.now());

    guildActivity.daily[today] = (guildActivity.daily[today] || 0) + 1;
    guildActivity.channels[channelId] = (guildActivity.channels[channelId] || 0) + 1;

    const days = Object.keys(guildActivity.daily).sort();

    while (days.length > DAY_LIMIT) {
        delete guildActivity.daily[days.shift()];
    }

    store.write(activity);
};

const getActivity = (guildId) => {
    const activity = store.read();
    const guildActivity = activity[guildId] || {};

    return {
        daily: guildActivity.daily || {},
        channels: guildActivity.channels || {},
    };
};

module.exports = { recordMessage, getActivity, dayKey, DAY_LIMIT };
