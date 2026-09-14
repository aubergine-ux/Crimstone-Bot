const { createStore } = require('./jsonStore.js');

const store = createStore('guildConfig.json');

const DEFAULTS = {
    levelupMode: 'current',
    levelupChannel: null,
    modlogChannel: null,
    xpEnabled: true,
    ignoredChannels: [],
    globalLeaderboard: true,
};

const readConfig = () => store.read();

const writeConfig = (config) => {
    store.write(config);
};

const getConfig = (guildId) => {
    const config = readConfig();
    const guildConfig = config[guildId] || {};

    return {
        levelupMode: guildConfig.levelupMode || DEFAULTS.levelupMode,
        levelupChannel: guildConfig.levelupChannel || DEFAULTS.levelupChannel,
        modlogChannel: guildConfig.modlogChannel || DEFAULTS.modlogChannel,
        xpEnabled: guildConfig.xpEnabled !== undefined ? guildConfig.xpEnabled : DEFAULTS.xpEnabled,
        ignoredChannels: [...(guildConfig.ignoredChannels || DEFAULTS.ignoredChannels)],
        globalLeaderboard: guildConfig.globalLeaderboard !== undefined ? guildConfig.globalLeaderboard : DEFAULTS.globalLeaderboard,
    };
};

const optedOutGuilds = () => {
    const config = readConfig();

    return Object.keys(config).filter(guildId => config[guildId].globalLeaderboard === false);
};

const setConfig = (guildId, updates) => {
    const config = readConfig();

    if (!config[guildId]) config[guildId] = {};

    Object.keys(updates).forEach(field => {
        config[guildId][field] = updates[field];
    });

    writeConfig(config);
};

const resetConfig = (guildId) => {
    const config = readConfig();

    if (config[guildId]) {
        delete config[guildId];
        writeConfig(config);
    }
};

module.exports = { readConfig, writeConfig, getConfig, optedOutGuilds, setConfig, resetConfig, DEFAULTS };
