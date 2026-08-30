const fs = require('fs');
const path = require('path');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig } = require('./guildConfig.js');

const filePath = path.join(__dirname, 'modCases.json');

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

const readCases = () => {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return {};
    }
};

const nextCase = (guildId) => {
    const cases = readCases();
    const current = cases[guildId] || 0;
    const updated = current + 1;

    cases[guildId] = updated;

    try {
        fs.writeFileSync(filePath, JSON.stringify(cases, null, 2));
    } catch (error) {
        console.error('Failed to save case number:', error.message);
    }

    return updated;
};

const logAction = async (options) => {
    const guild = options.guild;
    const action = options.action;

    if (!guild) return null;

    const config = getConfig(guild.id);

    if (!config.modlogChannel) return null;

    const channel = guild.channels.cache.get(config.modlogChannel);

    if (!channel) return null;

    const me = guild.members.me;
    const canPost = channel.permissionsFor(me)?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
    ]);

    if (!canPost) return null;

    const style = ACTIONS[action] || { emoji: '📋', label: action, color: 0x5865F2 };
    const caseNumber = nextCase(guild.id);

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
        return null;
    }
};

module.exports = { logAction, ACTIONS };
