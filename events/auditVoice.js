const { Events } = require('discord.js');
const { sendAudit, auditEmbed } = require('../commands/utility/auditLog.js');

module.exports = [
    {
        name: Events.VoiceStateUpdate,

        async execute(before, after) {
            const guild = after.guild || before.guild;
            const member = after.member || before.member;

            if (!guild || !member || member.user.bot) return;

            const name = `<@${member.id}> — **${member.user.username}**`;

            let embed = null;

            if (!before.channelId && after.channelId) {
                embed = auditEmbed('voice', 'Joined voice', 'create')
                    .setDescription(`${name} joined <#${after.channelId}>`);
            } else if (before.channelId && !after.channelId) {
                embed = auditEmbed('voice', 'Left voice', 'remove')
                    .setDescription(`${name} left <#${before.channelId}>`);
            } else if (before.channelId !== after.channelId) {
                embed = auditEmbed('voice', 'Moved voice channel', 'update')
                    .setDescription(`${name} moved from <#${before.channelId}> to <#${after.channelId}>`);
            }

            if (!embed) return;

            embed.setFooter({ text: `User ID: ${member.id}` });

            await sendAudit(guild, 'voice', embed);
        },
    },
];
