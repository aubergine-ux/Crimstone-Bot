const { createStore } = require('./jsonStore.js');

const store = createStore('auditConfig.json');

const CATEGORIES = {
    messages: { emoji: '💬', label: 'Messages', hint: 'Edits, deletions and purges' },
    members: { emoji: '👤', label: 'Members', hint: 'Joins, leaves and nickname changes' },
    roles: { emoji: '🎭', label: 'Roles', hint: 'Member role changes, roles created or deleted' },
    channels: { emoji: '📁', label: 'Channels', hint: 'Channels created, deleted or renamed' },
    voice: { emoji: '🔊', label: 'Voice', hint: 'Voice joins, leaves and moves' },
    server: { emoji: '🏠', label: 'Server', hint: 'Server settings and emojis' },
    moderation: { emoji: '🔨', label: 'Moderation', hint: 'Bans and unbans' },
};

const readAudit = () => store.read();

const writeAudit = (config) => {
    store.write(config);
};

const getAuditConfig = (guildId) => {
    const config = readAudit();
    const guildConfig = config[guildId] || {};
    const categories = {};

    Object.keys(CATEGORIES).forEach(key => {
        const saved = (guildConfig.categories || {})[key] || {};

        categories[key] = {
            enabled: saved.enabled !== undefined ? saved.enabled : true,
            channel: saved.channel || null,
        };
    });

    return {
        channel: guildConfig.channel || null,
        categories: categories,
    };
};

const setAuditChannel = (guildId, channelId) => {
    const config = readAudit();

    if (!config[guildId]) config[guildId] = {};

    config[guildId].channel = channelId;

    writeAudit(config);
};

const setAuditCategory = (guildId, category, updates) => {
    const config = readAudit();

    if (!config[guildId]) config[guildId] = {};
    if (!config[guildId].categories) config[guildId].categories = {};
    if (!config[guildId].categories[category]) config[guildId].categories[category] = {};

    Object.keys(updates).forEach(field => {
        config[guildId].categories[category][field] = updates[field];
    });

    writeAudit(config);
};

const resetAudit = (guildId) => {
    const config = readAudit();

    if (config[guildId]) {
        delete config[guildId];
        writeAudit(config);
    }
};

module.exports = { CATEGORIES, readAudit, writeAudit, getAuditConfig, setAuditChannel, setAuditCategory, resetAudit };
