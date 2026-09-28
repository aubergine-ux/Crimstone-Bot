const { PermissionFlagsBits } = require('discord.js');
const { readLevels, writeLevels } = require('./levelStore.js');
const { getLevelFromXp } = require('./levelMath.js');
const { getConfig } = require('./guildConfig.js');
const { applyLevelRoles } = require('./applyLevelRoles.js');
const { fillTemplate, memberValues } = require('./template.js');

const DEFAULT_LEVELUP = '🎉 **{username}** reached level **{level}**!';

const boostFor = (member, channel, config) => {
    let roleBoost = 1;

    Object.keys(config.roleBoosts).forEach(roleId => {
        if (member.roles.cache.has(roleId)) {
            roleBoost = Math.max(roleBoost, config.roleBoosts[roleId]);
        }
    });

    let channelBoost = 1;

    if (channel) {
        channelBoost = config.channelBoosts[channel.id] || config.channelBoosts[channel.parentId] || 1;
    }

    return roleBoost * channelBoost;
};

const announceLevelUp = async (member, level, awarded, channel, config) => {
    if (config.levelupMode === 'off') return;

    let target = channel;

    if (config.levelupMode === 'channel') {
        target = member.guild.channels.cache.get(config.levelupChannel) || channel;
    }

    if (!target || !target.isTextBased()) return;

    const canAnnounce = target
        .permissionsFor(member.guild.members.me)
        ?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]);

    if (!canAnnounce) return;

    let announcement = fillTemplate(config.levelupMessage || DEFAULT_LEVELUP, {
        ...memberValues(member),
        level: level,
    });

    if (awarded.length > 0) {
        const mentions = awarded.map(roleId => `<@&${roleId}>`).join(', ');
        announcement += `\nUnlocked: ${mentions}`;
    }

    try {
        await target.send({
            content: announcement.slice(0, 2000),
            allowedMentions: { users: [member.id] },
        });
    } catch (error) {
        console.error('Failed to send level-up message:', error.message);
    }
};

const awardXp = async (member, baseAmount, channel) => {
    const guildId = member.guild.id;
    const config = getConfig(guildId);
    const gained = Math.round(baseAmount * boostFor(member, channel, config));

    const levels = readLevels();

    if (!levels[guildId]) levels[guildId] = {};
    if (!levels[guildId][member.id]) levels[guildId][member.id] = 0;

    const before = getLevelFromXp(levels[guildId][member.id]);

    levels[guildId][member.id] += gained;

    const after = getLevelFromXp(levels[guildId][member.id]);

    writeLevels(levels);

    if (after.level > before.level) {
        const awarded = await applyLevelRoles(member, after.level).catch(() => []);
        await announceLevelUp(member, after.level, awarded, channel, config);
    }

    return gained;
};

module.exports = { awardXp, boostFor, DEFAULT_LEVELUP };
