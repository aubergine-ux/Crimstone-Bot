const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'rankPrefs.json');

const DEFAULTS = {
    accent: '#5865F2',
    background: '#1A1A1E',
    image: null,
    tagline: null,
};

const readPrefs = () => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
};

const writePrefs = (prefs) => {
    fs.writeFileSync(filePath, JSON.stringify(prefs, null, 2));
};

const resolvePrefs = (guildId, userId) => {
    const prefs = readPrefs();
    const guildPrefs = prefs[guildId] || {};

    const serverPrefs = guildPrefs._server || {};
    const userPrefs = guildPrefs[userId] || {};

    return {
        accent: userPrefs.accent || serverPrefs.accent || DEFAULTS.accent,
        background: userPrefs.background || serverPrefs.background || DEFAULTS.background,
        image: userPrefs.image || serverPrefs.image || DEFAULTS.image,
        tagline: userPrefs.tagline || serverPrefs.tagline || DEFAULTS.tagline,
    };
};

const savePrefs = (guildId, key, updates) => {
    const prefs = readPrefs();

    if (!prefs[guildId]) prefs[guildId] = {};
    if (!prefs[guildId][key]) prefs[guildId][key] = {};

    Object.keys(updates).forEach(field => {
        const value = updates[field];

        if (value === null) {
            delete prefs[guildId][key][field];
        } else {
            prefs[guildId][key][field] = value;
        }
    });

    writePrefs(prefs);
};

const clearPrefs = (guildId, key) => {
    const prefs = readPrefs();

    if (prefs[guildId] && prefs[guildId][key]) {
        delete prefs[guildId][key];
        writePrefs(prefs);
    }
};

module.exports = { readPrefs, writePrefs, resolvePrefs, savePrefs, clearPrefs, DEFAULTS };
