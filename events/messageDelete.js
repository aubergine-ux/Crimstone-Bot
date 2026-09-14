const { Events } = require('discord.js');
const { addSnipe } = require('../commands/utility/snipeStore.js');

module.exports = {
    name: Events.MessageDelete,

    execute(message) {
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
    },
};
