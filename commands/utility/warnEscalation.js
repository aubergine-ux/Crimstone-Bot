const { PermissionFlagsBits } = require('discord.js');
const { createStore } = require('./jsonStore.js');
const { logAction } = require('./modLog.js');
const { formatDuration } = require('./duration.js');

const store = createStore('warnRules.json');

const getRules = (guildId) => {
    const rules = store.read()[guildId] || [];

    return [...rules].sort((a, b) => a.count - b.count);
};

const setRule = (guildId, rule) => {
    const rules = store.read();
    const guildRules = (rules[guildId] || []).filter(existing => existing.count !== rule.count);

    guildRules.push(rule);
    rules[guildId] = guildRules;

    store.write(rules);
};

const removeRule = (guildId, count) => {
    const rules = store.read();
    const guildRules = rules[guildId] || [];
    const remaining = guildRules.filter(rule => rule.count !== count);

    if (remaining.length === guildRules.length) return false;

    if (remaining.length === 0) {
        delete rules[guildId];
    } else {
        rules[guildId] = remaining;
    }

    store.write(rules);

    return true;
};

const describeRule = (rule) => {
    if (rule.action === 'timeout') return `⏳ Timeout for ${formatDuration(rule.duration)}`;
    if (rule.action === 'kick') return '👢 Kick';
    return '🔨 Ban';
};

// Applies the rule for a member's exact warning count, if there is one, and returns a
// line describing what happened (or why it couldn't happen) for the moderator.
const escalate = async (guild, user, count) => {
    const rule = getRules(guild.id).find(existing => existing.count === count);

    if (!rule) return null;

    const reason = `Automatic: reached ${count} warnings`;
    const me = guild.members.me;
    const member = await guild.members.fetch(user.id).catch(() => null);

    try {
        if (rule.action === 'timeout') {
            if (!member) return `⚠️ **${user.tag}** reached ${count} warnings, but they're not in the server to time out.`;
            if (!member.moderatable) return `⚠️ **${user.tag}** reached ${count} warnings, but I can't time them out. Check my role is above theirs and I have Timeout Members.`;

            const duration = formatDuration(rule.duration);

            await member.timeout(rule.duration, reason);
            await logAction({ guild: guild, action: 'timeout', target: user, moderator: guild.client.user, reason: reason, duration: duration });

            return `⏳ **${user.tag}** reached ${count} warnings and was automatically timed out for **${duration}**.`;
        }

        if (rule.action === 'kick') {
            if (!member) return `⚠️ **${user.tag}** reached ${count} warnings, but they're not in the server to kick.`;
            if (!member.kickable) return `⚠️ **${user.tag}** reached ${count} warnings, but I can't kick them. Check my role is above theirs and I have Kick Members.`;

            await member.kick(reason);
            await logAction({ guild: guild, action: 'kick', target: user, moderator: guild.client.user, reason: reason });

            return `👢 **${user.tag}** reached ${count} warnings and was automatically kicked.`;
        }

        if (!me.permissions.has(PermissionFlagsBits.BanMembers) || (member && !member.bannable)) {
            return `⚠️ **${user.tag}** reached ${count} warnings, but I can't ban them. Check my role is above theirs and I have Ban Members.`;
        }

        await guild.bans.create(user.id, { reason: reason });
        await logAction({ guild: guild, action: 'ban', target: user, moderator: guild.client.user, reason: reason });

        return `🔨 **${user.tag}** reached ${count} warnings and was automatically banned.`;
    } catch (error) {
        console.error('Failed to apply a warning rule:', error.message);
        return `❌ **${user.tag}** reached ${count} warnings, but the automatic ${rule.action} failed.`;
    }
};

module.exports = { getRules, setRule, removeRule, describeRule, escalate };
