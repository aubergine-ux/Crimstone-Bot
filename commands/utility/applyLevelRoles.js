const { PermissionFlagsBits } = require('discord.js');
const { rolesForLevel } = require('./levelRoles.js');
const { getXp } = require('./levelStore.js');
const { getLevelFromXp } = require('./levelMath.js');

const updateLevelRoles = async (member, level) => {
    const { toAdd, toRemove } = rolesForLevel(member.guild.id, level);

    if (toAdd.length === 0 && toRemove.length === 0) return { added: [], removed: [] };

    const me = member.guild.members.me;

    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) return { added: [], removed: [] };

    const highest = me.roles.highest.position;

    const assignable = (roleId) => {
        const role = member.guild.roles.cache.get(roleId);
        return role && role.position < highest && !role.managed;
    };

    const addIds = toAdd.filter(roleId => assignable(roleId) && !member.roles.cache.has(roleId));
    const removeIds = toRemove.filter(roleId => assignable(roleId) && member.roles.cache.has(roleId));

    const added = [];
    const removed = [];

    for (const roleId of addIds) {
        try {
            await member.roles.add(roleId, `Level ${level} reward`);
            added.push(roleId);
        } catch (error) {
            console.error('Failed to add level role:', error.message);
        }
    }

    for (const roleId of removeIds) {
        try {
            await member.roles.remove(roleId, `No longer a reward at level ${level}`);
            removed.push(roleId);
        } catch (error) {
            console.error('Failed to remove level role:', error.message);
        }
    }

    return { added: added, removed: removed };
};

const applyLevelRoles = async (member, level) => {
    const { added } = await updateLevelRoles(member, level);

    return added;
};

const syncLevelRoles = async (member) => {
    if (member.user.bot) return { added: [], removed: [] };

    const { level } = getLevelFromXp(getXp(member.guild.id, member.id));

    return updateLevelRoles(member, level);
};

module.exports = { applyLevelRoles, syncLevelRoles };
