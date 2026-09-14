const { Events } = require('discord.js');
const { sendAudit, auditEmbed, trim } = require('../commands/utility/auditLog.js');

module.exports = [
    {
        name: Events.MessageUpdate,

        async execute(before, after) {
            if (!after.guild || after.author?.bot) return;
            if (before.content === after.content) return;

            const embed = auditEmbed('messages', 'Message edited', 'update')
                .setDescription(`By <@${after.author.id}> in <#${after.channel.id}> · [jump](${after.url})`)
                .addFields(
                    { name: 'Before', value: trim(before.content, 1024) },
                    { name: 'After', value: trim(after.content, 1024) },
                )
                .setFooter({ text: `User ID: ${after.author.id}` });

            await sendAudit(after.guild, 'messages', embed);
        },
    },
    {
        name: Events.MessageBulkDelete,

        async execute(messages) {
            const first = messages.first();

            if (!first || !first.guild) return;

            const embed = auditEmbed('messages', 'Messages bulk deleted', 'remove')
                .setDescription(`**${messages.size}** message(s) removed from <#${first.channel.id}>.`);

            await sendAudit(first.guild, 'messages', embed);
        },
    },
];
