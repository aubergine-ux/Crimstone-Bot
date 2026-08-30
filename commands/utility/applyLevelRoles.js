const { PermissionFlagsBits } = require('discord.js');
const { rolesForLevel } = require('./levelRoles.js');

const applyLevelRoles = async (member, level) => {
    const { toAdd, toRemove } = rolesForLevel(member.guild.id, level);

    if (toAdd.length === 0 && toRemove.length === 0) return [];

    const me = member.guild.members.me;

    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) return [];

    const highest = me.roles.highest.position;

    const assignable = (roleId) => {
        const role = member.guild.roles.cache.get(roleId);
        return role && role.position < highest && !role.managed;
    };

    const addIds = toAdd.filter(roleId => assignable(roleId) && !member.roles.cache.has(roleId));
    const removeIds = toRemove.filter(roleId => assignable(roleId) && member.roles.cache.has(roleId));

    const added = [];

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
            await member.roles.remove(roleId, 'Superseded by a higher level reward');
        } catch (error) {
            console.error('Failed to remove level role:', error.message);
        }
    }

    return added;
};

module.exports = { applyLevelRoles };
