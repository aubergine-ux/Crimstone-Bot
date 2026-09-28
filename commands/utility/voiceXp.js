const { getConfig } = require('./guildConfig.js');
const { awardXp } = require('./awardXp.js');

const VOICE_INTERVAL = 60000;

let running = false;

const isActive = (member) => {
    const voice = member.voice;

    return !member.user.bot && !voice.selfMute && !voice.serverMute && !voice.selfDeaf && !voice.serverDeaf;
};

const tick = async (client) => {
    if (running) return;

    running = true;

    try {
        for (const guild of client.guilds.cache.values()) {
            const config = getConfig(guild.id);

            if (!config.xpEnabled || !config.voiceXp) continue;

            const channels = guild.channels.cache.filter(channel =>
                channel.isVoiceBased()
                && channel.id !== guild.afkChannelId
                && !config.ignoredChannels.includes(channel.id),
            );

            for (const channel of channels.values()) {
                const active = channel.members.filter(isActive);

                if (active.size < 2) continue;

                for (const member of active.values()) {
                    try {
                        await awardXp(member, Math.floor(Math.random() * 11) + 15, channel);
                    } catch (error) {
                        console.error('Failed to award voice XP:', error.message);
                    }
                }
            }
        }
    } finally {
        running = false;
    }
};

const startVoiceXp = (client) => {
    setInterval(() => tick(client), VOICE_INTERVAL);
};

module.exports = { startVoiceXp };
