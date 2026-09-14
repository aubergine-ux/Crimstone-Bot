const { Events } = require('discord.js');
const { addSnipe } = require('../commands/utility/snipeStore.js');
const { sendAudit, auditEmbed, trim } = require('../commands/utility/auditLog.js');

module.exports = {
    name: Events.MessageDelete,

    async execute(message) {
        if (!message.guild) return;
        if (message.author?.bot) return;
        if (!message.content && message.attachments.size === 0) return;

        addSnipe(message.channel.id, {
            content: message.content || '',
            authorTag: message.author ? message.author.username : 'Unknown User',
            authorId: message.author ? message.author.id : null,
            avatarUrl: message.author ? message.author.displayAvatarURL() : null,
            attachment: message.attachments.size > 0 ? message.attachments.first().url : null,
            timestamp: Date.now(),
        });

        const embed = auditEmbed('messages', 'Message deleted', 'remove')
            .setDescription(`By <@${message.author.id}> in <#${message.channel.id}>`)
            .addFields({ name: 'Content', value: trim(message.content, 1024) })
            .setFooter({ text: `User ID: ${message.author.id}` });

        if (message.attachments.size > 0) {
            embed.addFields({ name: 'Attachments', value: String(message.attachments.size) });
        }

        await sendAudit(message.guild, 'messages', embed);
    },
};
