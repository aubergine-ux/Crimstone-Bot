const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'levelRoles.json');

const readLevelRoles = () => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
};

const writeLevelRoles = (levelRoles) => {
    fs.writeFileSync(filePath, JSON.stringify(levelRoles, null, 2));
};

const getGuildRoles = (guildId) => {
    const levelRoles = readLevelRoles();
    const guildRoles = levelRoles[guildId] || {};

    return {
        stack: guildRoles.stack === true,
        roles: { ...(guildRoles.roles || {}) },
    };
};

const setLevelRole = (guildId, level, roleId) => {
    const levelRoles = readLevelRoles();

    if (!levelRoles[guildId]) levelRoles[guildId] = { stack: false, roles: {} };
    if (!levelRoles[guildId].roles) levelRoles[guildId].roles = {};

    levelRoles[guildId].roles[level] = roleId;

    writeLevelRoles(levelRoles);
};

const removeLevelRole = (guildId, level) => {
    const levelRoles = readLevelRoles();

    if (levelRoles[guildId] && levelRoles[guildId].roles) {
        delete levelRoles[guildId].roles[level];
        writeLevelRoles(levelRoles);
    }
};

const setStackMode = (guildId, stack) => {
    const levelRoles = readLevelRoles();

    if (!levelRoles[guildId]) levelRoles[guildId] = { stack: false, roles: {} };

    levelRoles[guildId].stack = stack;

    writeLevelRoles(levelRoles);
};

const rolesForLevel = (guildId, level) => {
    const { stack, roles } = getGuildRoles(guildId);

    const allRoleIds = Object.values(roles);

    const earned = Object.keys(roles)
        .map(key => parseInt(key, 10))
        .filter(threshold => threshold <= level)
        .sort((a, b) => a - b);

    if (earned.length === 0) {
        return { toAdd: [], toRemove: [] };
    }

    if (stack) {
        return {
            toAdd: earned.map(threshold => roles[threshold]),
            toRemove: [],
        };
    }

    const highest = earned[earned.length - 1];
    const keep = roles[highest];

    return {
        toAdd: [keep],
        toRemove: allRoleIds.filter(roleId => roleId !== keep),
    };
};

module.exports = {
    readLevelRoles,
    writeLevelRoles,
    getGuildRoles,
    setLevelRole,
    removeLevelRole,
    setStackMode,
    rolesForLevel,
};
