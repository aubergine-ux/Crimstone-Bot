const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig } = require('./guildConfig.js');
const { createStore } = require('./jsonStore.js');

const store = createStore('modCases.json');
const historyStore = createStore('modHistory.json');

const HISTORY_LIMIT = 500;

const ACTIONS = {
    ban: { emoji: '🔨', label: 'Ban', color: 0xE74C3C },
    unban: { emoji: '🕊️', label: 'Unban', color: 0x2ECC71 },
    kick: { emoji: '👢', label: 'Kick', color: 0xE67E22 },
    timeout: { emoji: '⏳', label: 'Timeout', color: 0xE67E22 },
    untimeout: { emoji: '⌛', label: 'Timeout Removed', color: 0x2ECC71 },
    warn: { emoji: '⚠️', label: 'Warning', color: 0xF1C40F },
    unwarn: { emoji: '✅', label: 'Warning Removed', color: 0x2ECC71 },
    purge: { emoji: '🧹', label: 'Purge', color: 0x95A5A6 },
    nickname: { emoji: '✏️', label: 'Nickname Change', color: 0x5865F2 },
    role: { emoji: '🎭', label: 'Role Change', color: 0x5865F2 },
};

const readCases = () => store.read();

const nextCase = (guildId) => {
    const cases = readCases();
    const current = cases[guildId] || 0;
    const updated = current + 1;

    cases[guildId] = updated;

    store.write(cases);

    return updated;
};

const readHistory = () => historyStore.read();

const recordCase = (guildId, caseNumber, options) => {
    const history = readHistory();

    if (!history[guildId]) history[guildId] = [];

    history[guildId].push({
        case: caseNumber,
        action: options.action,
        userId: options.target ? options.target.id : null,
        userTag: options.target ? (options.target.tag || options.target.username) : null,
        moderator: options.moderator ? (options.moderator.tag || options.moderator.username) : null,
        reason: options.reason || null,
        duration: options.duration || null,
        timestamp: Date.now(),
    });

    if (history[guildId].length > HISTORY_LIMIT) {
        history[guildId] = history[guildId].slice(-HISTORY_LIMIT);
    }

    historyStore.write(history);
};

const getUserCases = (guildId, userId) => {
    const history = readHistory();
    const guildHistory = history[guildId] || [];

    return guildHistory.filter(entry => entry.userId === userId);
};

const logAction = async (options) => {
    const guild = options.guild;
    const action = options.action;

    if (!guild) return null;

    const style = ACTIONS[action] || { emoji: '📋', label: action, color: 0x5865F2 };
    const caseNumber = nextCase(guild.id);

    recordCase(guild.id, caseNumber, options);

    const config = getConfig(guild.id);

    if (!config.modlogChannel) return caseNumber;

    const channel = guild.channels.cache.get(config.modlogChannel);

    if (!channel) return caseNumber;

    const me = guild.members.me;
    const canPost = channel.permissionsFor(me)?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
    ]);

    if (!canPost) return caseNumber;

    const fields = [];

    if (options.target) {
        fields.push({
            name: 'User',
            value: `${options.target.tag || options.target.username} (<@${options.target.id}>)`,
            inline: true,
        });
    }

    if (options.moderator) {
        fields.push({
            name: 'Moderator',
            value: `${options.moderator.tag || options.moderator.username}`,
            inline: true,
        });
    }

    if (options.duration) {
        fields.push({ name: 'Duration', value: options.duration, inline: true });
    }

    if (options.channel) {
        fields.push({ name: 'Channel', value: `<#${options.channel.id}>`, inline: true });
    }

    fields.push({ name: 'Reason', value: options.reason || 'No reason given' });

    if (options.extra) {
        fields.push({ name: 'Details', value: String(options.extra).slice(0, 1024) });
    }

    const embed = new EmbedBuilder()
        .setColor(style.color)
        .setAuthor({
            name: `${style.emoji} ${style.label} — Case #${caseNumber}`,
            iconURL: options.target?.displayAvatarURL ? options.target.displayAvatarURL() : undefined,
        })
        .addFields(fields)
        .setFooter({ text: options.target ? `User ID: ${options.target.id}` : `Guild: ${guild.name}` })
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
        return caseNumber;
    } catch (error) {
        console.error('Failed to write mod log:', error.message);
        return caseNumber;
    }
};

module.exports = { logAction, getUserCases, readHistory, ACTIONS };
