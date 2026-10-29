const { PermissionFlagsBits } = require('discord.js');
const { addXp, touchStreak } = require('./levelStore.js');
const { getLevelFromXp } = require('./levelMath.js');
const { getConfig } = require('./guildConfig.js');
const { applyLevelRoles } = require('./applyLevelRoles.js');
const { fillTemplate, memberValues } = require('./template.js');

const DEFAULT_LEVELUP = '🎉 **{username}** reached level **{level}**!';

const STREAK_STEP = 0.02;
const STREAK_CAP = 10;

// +2% per day of streak after the first, up to +20%.
const streakBoost = (streak) => {
    return 1 + Math.min(Math.max(streak - 1, 0), STREAK_CAP) * STREAK_STEP;
};

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

    if (config.noXpRoles.some(roleId => member.roles.cache.has(roleId))) return 0;

    const streak = touchStreak(guildId, member.id);
    const multiplier = boostFor(member, channel, config) * (config.streakBonus ? streakBoost(streak) : 1);
    const gained = Math.round(baseAmount * multiplier);

    const totals = addXp(guildId, member.id, gained);

    const before = getLevelFromXp(totals.before);
    const after = getLevelFromXp(totals.after);

    if (after.level > before.level) {
        const awarded = await applyLevelRoles(member, after.level).catch(() => []);
        await announceLevelUp(member, after.level, awarded, channel, config);
    }

    return gained;
};

module.exports = { awardXp, boostFor, streakBoost, DEFAULT_LEVELUP };
