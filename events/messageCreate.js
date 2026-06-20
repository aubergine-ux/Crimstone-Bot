const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    
    async execute(message) {
        if (message.author.bot) return;

        if (message.content.includes('67')) {
            try {
                await message.react('6️⃣');
                await message.react('7️⃣');
            } catch (error) {
                console.error('Failed to 67 Properly:', error);
            }
        }
    }
};