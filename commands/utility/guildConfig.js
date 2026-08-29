const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'guildConfig.json');

const DEFAULTS = {
    levelupMode: 'current',
    levelupChannel: null,
    modlogChannel: null,
    xpEnabled: true,
    ignoredChannels: [],
};

const readConfig = () => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
};

const writeConfig = (config) => {
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
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
    };
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

module.exports = { readConfig, writeConfig, getConfig, setConfig, resetConfig, DEFAULTS };
