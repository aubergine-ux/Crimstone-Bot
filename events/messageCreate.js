const { Events, PermissionFlagsBits } = require('discord.js');
const { readAfk, writeAfk } = require('../commands/utility/afkStore.js');
const { readLevels, writeLevels } = require('../commands/utility/levelStore.js');
const { getLevelFromXp } = require('../commands/utility/levelMath.js');
const { getConfig } = require('../commands/utility/guildConfig.js');
const { applyLevelRoles } = require('../commands/utility/applyLevelRoles.js');

const xpCooldowns = new Map();

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;

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
            const config = getConfig(message.guild.id);

            if (config.xpEnabled && !config.ignoredChannels.includes(message.channel.id)) {
                const now = Date.now();
                const cooldownKey = `${message.guild.id}-${message.author.id}`;
                const lastXp = xpCooldowns.get(cooldownKey) || 0;

                if (now - lastXp > 10000) {
                    xpCooldowns.set(cooldownKey, now);

                    const levels = readLevels();
                    const guildId = message.guild.id;

                    if (!levels[guildId]) levels[guildId] = {};
                    if (!levels[guildId][message.author.id]) levels[guildId][message.author.id] = 0;

                    const before = getLevelFromXp(levels[guildId][message.author.id]);

                    const gained = Math.floor(Math.random() * 21) + 40;
                    levels[guildId][message.author.id] += gained;

                    const after = getLevelFromXp(levels[guildId][message.author.id]);

                    writeLevels(levels);

                    if (after.level > before.level) {
                        const awarded = await applyLevelRoles(message.member, after.level).catch(() => []);

                        if (config.levelupMode !== 'off') {
                            let target = message.channel;

                            if (config.levelupMode === 'channel') {
                                target = message.guild.channels.cache.get(config.levelupChannel) || message.channel;
                            }

                            const canAnnounce = target
                                .permissionsFor(message.guild.members.me)
                                ?.has(PermissionFlagsBits.SendMessages);

                            if (canAnnounce) {
                                let announcement = `🎉 **${message.author.username}** reached level **${after.level}**!`;

                                if (awarded.length > 0) {
                                    const mentions = awarded.map(roleId => `<@&${roleId}>`).join(', ');
                                    announcement += `\nUnlocked: ${mentions}`;
                                }

                                try {
                                    await target.send(announcement);
                                } catch (error) {
                                    console.error('Failed to send level-up message:', error.message);
                                }
                            }
                        }
                    }
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