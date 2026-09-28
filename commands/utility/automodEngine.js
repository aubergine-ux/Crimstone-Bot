const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getAutomodConfig } = require('./automodConfig.js');
const { logAction, postModlog } = require('./modLog.js');
const { trim } = require('./auditLog.js');

const INVITE_PATTERN = /(?:discord(?:app)?\.com\/invite|discord\.gg)\/[\w-]+/i;
const LINK_PATTERN = /https?:\/\/\S+|\bwww\.\S+\.\S+/i;

const NOTICE_LIFETIME = 6000;
const PRUNE_EVERY = 300000;
const MAX_SPAM_WINDOW = 60000;

const recentMessages = new Map();
const recentJoins = new Map();
const lastRaidAlert = new Map();
const autoKicked = new Set();
const wordPatterns = new Map();

let lastPrune = Date.now();

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// One compiled pattern per guild, rebuilt only when its word list changes.
const wordPattern = (guildId, words) => {
    const key = words.join('\u0000');
    const cached = wordPatterns.get(guildId);

    if (cached && cached.key === key) return cached.pattern;

    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.map(escapeRegex).join('|')})(?![\\p{L}\\p{N}])`, 'iu');

    wordPatterns.set(guildId, { key: key, pattern: pattern });

    return pattern;
};

const hasMessageRules = (config) => {
    return config.spam.enabled || config.invites || config.links || config.words.length > 0;
};

const isExempt = (member, channel, config) => {
    if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
    if (config.exemptRoles.some(roleId => member.roles.cache.has(roleId))) return true;

    return config.exemptChannels.includes(channel.id) || config.exemptChannels.includes(channel.parentId);
};

const filterReason = (content, guildId, config) => {
    if (!content) return null;
    if (config.invites && INVITE_PATTERN.test(content)) return 'Posting a Discord invite';
    if (config.links && LINK_PATTERN.test(content)) return 'Posting a link';
    if (config.words.length > 0 && wordPattern(guildId, config.words).test(content)) return 'Using a blocked word';

    return null;
};

const notify = async (channel, userId, content) => {
    try {
        const sent = await channel.send({ content: content, allowedMentions: { users: [userId] } });
        setTimeout(() => sent.delete().catch(() => null), NOTICE_LIFETIME);
    } catch {
        // No permission to talk here; the mod log still records what happened.
    }
};

const automodEmbed = (title, user, fields) => {
    return new EmbedBuilder()
        .setColor(0xE67E22)
        .setAuthor({ name: `🤖 Automod — ${title}`, iconURL: user.displayAvatarURL() })
        .addFields(
            { name: 'User', value: `${user.username} (<@${user.id}>)`, inline: true },
            ...fields,
        )
        .setFooter({ text: `User ID: ${user.id}` })
        .setTimestamp();
};

const removeMessage = async (message, reason) => {
    if (!message.deletable) return false;

    try {
        await message.delete();
    } catch {
        return false;
    }

    await notify(message.channel, message.author.id, `⚠️ <@${message.author.id}>, your message was removed: **${reason.toLowerCase()}**.`);

    await postModlog(message.guild, automodEmbed('Message removed', message.author, [
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Reason', value: reason },
        { name: 'Message', value: trim(message.content, 1024) },
    ]));

    return true;
};

const pruneRecent = (now) => {
    if (now - lastPrune < PRUNE_EVERY) return;

    lastPrune = now;

    recentMessages.forEach((entries, key) => {
        if (now - entries[entries.length - 1].time > MAX_SPAM_WINDOW) recentMessages.delete(key);
    });
};

const deleteSpam = async (guild, entries) => {
    const byChannel = {};

    entries.forEach(entry => {
        if (!byChannel[entry.channelId]) byChannel[entry.channelId] = [];
        byChannel[entry.channelId].push(entry.messageId);
    });

    for (const channelId of Object.keys(byChannel)) {
        const channel = guild.channels.cache.get(channelId);
        const ids = byChannel[channelId];

        if (!channel) continue;

        try {
            if (ids.length === 1) {
                await channel.messages.delete(ids[0]);
            } else {
                await channel.bulkDelete(ids, true);
            }
        } catch {
            // Missing Manage Messages, or the messages are already gone.
        }
    }
};

const checkSpam = async (message, spam) => {
    const now = Date.now();
    const key = `${message.guild.id}-${message.author.id}`;
    const windowMs = spam.seconds * 1000;

    pruneRecent(now);

    const entries = (recentMessages.get(key) || []).filter(entry => now - entry.time < windowMs);

    entries.push({ time: now, channelId: message.channel.id, messageId: message.id });

    if (entries.length < spam.messages) {
        recentMessages.set(key, entries);
        return false;
    }

    recentMessages.delete(key);

    await deleteSpam(message.guild, entries);

    const member = message.member;
    const minutes = spam.timeoutMinutes;

    if (minutes > 0 && member.moderatable) {
        try {
            await member.timeout(minutes * 60000, 'Automod: spamming');

            await logAction({
                guild: message.guild,
                action: 'timeout',
                target: message.author,
                moderator: message.client.user,
                reason: `Automod: sent ${entries.length} messages in ${spam.seconds} seconds`,
                duration: `${minutes} minute${minutes === 1 ? '' : 's'}`,
                channel: message.channel,
            });

            await notify(message.channel, message.author.id, `🛑 <@${message.author.id}> was timed out for **${minutes} minute${minutes === 1 ? '' : 's'}** for spamming.`);

            return true;
        } catch (error) {
            console.error('Automod failed to time out a spammer:', error.message);
        }
    }

    await notify(message.channel, message.author.id, `🛑 <@${message.author.id}>, slow down! Your messages were removed for spamming.`);

    await postModlog(message.guild, automodEmbed('Spam removed', message.author, [
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Reason', value: `Sent ${entries.length} messages in ${spam.seconds} seconds` },
    ]));

    return true;
};

// Returns true when the message was removed, so the caller can stop handling it.
const runAutomod = async (message) => {
    const config = getAutomodConfig(message.guild.id);

    if (!hasMessageRules(config)) return false;

    const member = message.member;

    if (!member || isExempt(member, message.channel, config)) return false;

    const reason = filterReason(message.content, message.guild.id, config);

    if (reason) return await removeMessage(message, reason);

    if (config.spam.enabled) return await checkSpam(message, config.spam);

    return false;
};

// Edits skip the spam check, otherwise fixing a typo could count as spamming.
const runAutomodOnEdit = async (message) => {
    const config = getAutomodConfig(message.guild.id);

    if (!config.invites && !config.links && config.words.length === 0) return false;

    const member = message.member;

    if (!member || isExempt(member, message.channel, config)) return false;

    const reason = filterReason(message.content, message.guild.id, config);

    return reason ? await removeMessage(message, reason) : false;
};

const trackRaid = async (guild, raid) => {
    const now = Date.now();
    const windowMs = raid.seconds * 1000;
    const joins = (recentJoins.get(guild.id) || []).filter(time => now - time < windowMs);

    joins.push(now);
    recentJoins.set(guild.id, joins);

    if (joins.length < raid.joins) return;
    if (now - (lastRaidAlert.get(guild.id) || 0) < windowMs) return;

    lastRaidAlert.set(guild.id, now);

    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setAuthor({ name: '🚨 Automod — Possible raid' })
        .setDescription(`**${joins.length} members** joined in the last **${raid.seconds} seconds**.`)
        .addFields({
            name: 'What you can do',
            value: 'Raise the server verification level, pause invites, or turn on `/automod accountage` to keep out brand-new accounts.',
        })
        .setTimestamp();

    await postModlog(guild, embed);
};

const kickNewAccount = async (member, minDays) => {
    if (!member.kickable) return false;

    const reason = `Automod: account younger than ${minDays} day${minDays === 1 ? '' : 's'}`;

    try {
        await member.send(`👋 Your account is too new to join **${member.guild.name}**. Accounts need to be at least **${minDays} day${minDays === 1 ? '' : 's'}** old — try again later!`);
    } catch {
        // DMs closed.
    }

    try {
        autoKicked.add(`${member.guild.id}-${member.id}`);
        setTimeout(() => autoKicked.delete(`${member.guild.id}-${member.id}`), 60000);

        await member.kick(reason);
    } catch (error) {
        console.error('Automod failed to kick a new account:', error.message);
        return false;
    }

    await logAction({
        guild: member.guild,
        action: 'kick',
        target: member.user,
        moderator: member.client.user,
        reason: reason,
    });

    return true;
};

// Returns true when the member was kicked, so welcome messages can be skipped.
const checkJoin = async (member) => {
    const config = getAutomodConfig(member.guild.id);

    if (config.raid.enabled) await trackRaid(member.guild, config.raid);

    if (config.minAccountDays > 0 && !member.user.bot) {
        const ageDays = (Date.now() - member.user.createdTimestamp) / 86400000;

        if (ageDays < config.minAccountDays) return await kickNewAccount(member, config.minAccountDays);
    }

    return false;
};

const wasAutoKicked = (member) => autoKicked.has(`${member.guild.id}-${member.id}`);

module.exports = { runAutomod, runAutomodOnEdit, checkJoin, wasAutoKicked };
