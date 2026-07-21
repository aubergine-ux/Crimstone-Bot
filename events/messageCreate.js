const { Events } = require('discord.js');
const { readAfk, writeAfk } = require('../utility/afkStore.js');

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;

        const afk = readAfk();

        if (afk[message.author.id]) {
            delete afk[message.author.id];
            writeAfk(afk);
            await message.reply('👋 Welcome back! I removed your AFK.');
        } else {
            message.mentions.users.forEach(user => {
                if (afk[user.id]) {
                    message.reply(`💤 **${user.username}** is AFK: ${afk[user.id].message}`);
                }
            });
        }

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