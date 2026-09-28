const { Events } = require('discord.js');
const { readAfk, writeAfk } = require('../commands/utility/afkStore.js');
const { getConfig } = require('../commands/utility/guildConfig.js');
const { awardXp } = require('../commands/utility/awardXp.js');
const { runAutomod } = require('../commands/utility/automodEngine.js');
const { recordMessage } = require('../commands/utility/activityStore.js');

const XP_COOLDOWN = 10000;
const PRUNE_EVERY = 300000;

const xpCooldowns = new Map();

let lastPrune = Date.now();

const pruneCooldowns = (now) => {
    if (now - lastPrune < PRUNE_EVERY) return;

    lastPrune = now;

    xpCooldowns.forEach((stamp, key) => {
        if (now - stamp > XP_COOLDOWN) xpCooldowns.delete(key);
    });
};

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;

        // A message automod removed shouldn't earn XP, clear AFK or get reactions.
        if (message.guild) {
            const removed = await runAutomod(message).catch(error => {
                console.error('Automod failed on a message:', error.message);
                return false;
            });

            if (removed) return;
        }

        const afk = readAfk();

        if (afk[message.author.id]) {
            delete afk[message.author.id];
            writeAfk(afk);
            try {
                await message.reply('👋 Welcome back! I removed your AFK.');
            } catch (error) {
                console.error('Failed to send AFK welcome-back:', error.message);
            }
        } else {
            message.mentions.users.forEach(async user => {
                if (afk[user.id]) {
                    try {
                        await message.reply(`💤 **${user.username}** is AFK: ${afk[user.id].message}`);
                    } catch (error) {
                        console.error('Failed to send AFK mention reply:', error.message);
                    }
                }
            });
        }

        if (message.guild) {
            recordMessage(message.guild.id, message.channel.id);

            const config = getConfig(message.guild.id);

            if (config.xpEnabled && message.member && !config.ignoredChannels.includes(message.channel.id)) {
                const now = Date.now();
                const cooldownKey = `${message.guild.id}-${message.author.id}`;
                const lastXp = xpCooldowns.get(cooldownKey) || 0;

                pruneCooldowns(now);

                if (now - lastXp > XP_COOLDOWN) {
                    xpCooldowns.set(cooldownKey, now);

                    const base = Math.floor(Math.random() * 21) + 40;
                    await awardXp(message.member, base, message.channel);
                }
            }
        }

        if (message.content.includes('67')) {
            try {
                await message.react('6️⃣');
                await message.react('7️⃣');
            } catch (error) {
                // 10008: message deleted before we reacted. 10003/50001/50013: channel
                // gone or we lost access. None of these are worth a stack trace.
                if (![10008, 10003, 50001, 50013].includes(error.code)) {
                    console.error('Failed to 67 Properly:', error);
                }
            }
        }
    }
};