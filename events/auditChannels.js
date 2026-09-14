const { Events } = require('discord.js');
const { sendAudit, auditEmbed, trim } = require('../commands/utility/auditLog.js');

module.exports = [
    {
        name: Events.ChannelCreate,

        async execute(channel) {
            if (!channel.guild) return;

            const embed = auditEmbed('channels', 'Channel created', 'create')
                .setDescription(`<#${channel.id}> — **${channel.name}**`)
                .setFooter({ text: `Channel ID: ${channel.id}` });

            await sendAudit(channel.guild, 'channels', embed);
        },
    },
    {
        name: Events.ChannelDelete,

        async execute(channel) {
            if (!channel.guild) return;

            const embed = auditEmbed('channels', 'Channel deleted', 'remove')
                .setDescription(`**${channel.name}**`)
                .setFooter({ text: `Channel ID: ${channel.id}` });

            await sendAudit(channel.guild, 'channels', embed);
        },
    },
    {
        name: Events.ChannelUpdate,

        async execute(before, after) {
            if (!after.guild) return;

            const changes = [];

            if (before.name !== after.name) {
                changes.push({ name: 'Name', value: `${trim(before.name, 100)} → ${trim(after.name, 100)}` });
            }

            if (before.topic !== after.topic) {
                changes.push({ name: 'Topic', value: `${trim(before.topic, 400)}\n→ ${trim(after.topic, 400)}` });
            }

            if (before.nsfw !== after.nsfw) {
                changes.push({ name: 'Age restricted', value: after.nsfw ? 'Turned on' : 'Turned off' });
            }

            if (before.rateLimitPerUser !== after.rateLimitPerUser) {
                changes.push({ name: 'Slowmode', value: `${before.rateLimitPerUser}s → ${after.rateLimitPerUser}s` });
            }

            if (changes.length === 0) return;

            const embed = auditEmbed('channels', 'Channel updated', 'update')
                .setDescription(`<#${after.id}>`)
                .addFields(changes)
                .setFooter({ text: `Channel ID: ${after.id}` });

            await sendAudit(after.guild, 'channels', embed);
        },
    },
];
