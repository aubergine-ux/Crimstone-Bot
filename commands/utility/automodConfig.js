const { createStore } = require('./jsonStore.js');

const store = createStore('automodConfig.json');

const DEFAULTS = {
    spam: { enabled: false, messages: 5, seconds: 5, timeoutMinutes: 5 },
    invites: false,
    links: false,
    words: [],
    exemptRoles: [],
    exemptChannels: [],
    raid: { enabled: false, joins: 10, seconds: 30 },
    minAccountDays: 0,
};

const readAutomod = () => store.read();

const getAutomodConfig = (guildId) => {
    const saved = readAutomod()[guildId] || {};

    return {
        spam: { ...DEFAULTS.spam, ...(saved.spam || {}) },
        invites: saved.invites === true,
        links: saved.links === true,
        words: [...(saved.words || DEFAULTS.words)],
        exemptRoles: [...(saved.exemptRoles || DEFAULTS.exemptRoles)],
        exemptChannels: [...(saved.exemptChannels || DEFAULTS.exemptChannels)],
        raid: { ...DEFAULTS.raid, ...(saved.raid || {}) },
        minAccountDays: saved.minAccountDays || DEFAULTS.minAccountDays,
    };
};

const setAutomodConfig = (guildId, updates) => {
    const config = readAutomod();

    if (!config[guildId]) config[guildId] = {};

    Object.keys(updates).forEach(field => {
        config[guildId][field] = updates[field];
    });

    store.write(config);
};

const resetAutomodConfig = (guildId) => {
    const config = readAutomod();

    if (config[guildId]) {
        delete config[guildId];
        store.write(config);
    }
};

module.exports = { getAutomodConfig, setAutomodConfig, resetAutomodConfig, DEFAULTS };
