const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { CATEGORIES, getAuditConfig } = require('./auditConfig.js');

const COLORS = {
    create: 0x2ECC71,
    update: 0x5865F2,
    remove: 0xE74C3C,
    neutral: 0x95A5A6,
};

const auditEmbed = (category, title, tone) => {
    const style = CATEGORIES[category] || { emoji: '📋' };

    return new EmbedBuilder()
        .setColor(COLORS[tone] || COLORS.neutral)
        .setAuthor({ name: `${style.emoji} ${title}` })
        .setTimestamp();
};

const sendAudit = async (guild, category, embed) => {
    if (!guild) return;

    const config = getAuditConfig(guild.id);
    const settings = config.categories[category];

    if (!settings || !settings.enabled) return;

    const channelId = settings.channel || config.channel;

    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId);

    if (!channel) return;

    const canPost = channel.permissionsFor(guild.members.me)?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
    ]);

    if (!canPost) return;

    try {
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`Failed to write the ${category} audit log:`, error.message);
    }
};

const trim = (value, limit) => {
    const text = String(value === null || value === undefined ? '' : value);

    if (text.length === 0) return '*empty*';

    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

module.exports = { sendAudit, auditEmbed, trim, COLORS };
