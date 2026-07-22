const { Events } = require('discord.js');
const { readAfk, writeAfk } = require('../utility/afkStore.js');
const { readLevels, writeLevels } = require('../utility/levelStore.js');
const { getLevelFromXp } = require('../utility/levelMath.js');

const xpCooldowns = new Map();

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

        if (message.guild) {
            const now = Date.now();
            const cooldownKey = `${message.guild.id}-${message.author.id}`;
            const lastXp = xpCooldowns.get(cooldownKey) || 0;

            if (now - lastXp > 60000) {
                xpCooldowns.set(cooldownKey, now);

                const levels = readLevels();
                const guildId = message.guild.id;

                if (!levels[guildId]) levels[guildId] = {};
                if (!levels[guildId][message.author.id]) levels[guildId][message.author.id] = 0;

                const before = getLevelFromXp(levels[guildId][message.author.id]);

                const gained = Math.floor(Math.random() * 11) + 15;
                levels[guildId][message.author.id] += gained;

                const after = getLevelFromXp(levels[guildId][message.author.id]);

                writeLevels(levels);

                if (after.level > before.level) {
                    message.channel.send(`🎉 **${message.author.username}** reached level **${after.level}**!`);
                }
            }
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