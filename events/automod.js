const { Events } = require('discord.js');
const { runAutomodOnEdit } = require('../commands/utility/automodEngine.js');

module.exports = {
    name: Events.MessageUpdate,

    async execute(oldMessage, newMessage) {
        if (!newMessage.guild || newMessage.partial || newMessage.author?.bot) return;

        // Discord also fires updates when link previews load; only re-check real edits.
        if (oldMessage.content === newMessage.content) return;

        try {
            await runAutomodOnEdit(newMessage);
        } catch (error) {
            console.error('Automod failed on an edited message:', error.message);
        }
    },
};
