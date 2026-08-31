const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');

const formatUptime = (ms) => {
    let totalSeconds = ms / 1000;

    const days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;

    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const formatNumber = (value) => value.toLocaleString('en-US');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reach')
        .setDescription('See how far Crimstone has spread.'),

    async execute(interaction) {
        await interaction.deferReply();

        const client = interaction.client;

        let guildCount = client.guilds.cache.size;
        let userCount = client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);
        let channelCount = client.channels.cache.size;
        let shardCount = 1;

        if (client.shard) {
            try {
                const results = await client.shard.broadcastEval(shardClient => [
                    shardClient.guilds.cache.size,
                    shardClient.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0),
                    shardClient.channels.cache.size,
                ]);

                guildCount = results.reduce((total, shard) => total + shard[0], 0);
                userCount = results.reduce((total, shard) => total + shard[1], 0);
                channelCount = results.reduce((total, shard) => total + shard[2], 0);
                shardCount = client.shard.count;
            } catch (error) {
                console.error('Shard stats failed, falling back to local counts:', error.message);
            }
        }

        const largest = client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount).first();
        const memory = process.memoryUsage().heapUsed / 1024 / 1024;

        const embed = new EmbedBuilder()
            .setColor(0x882AD5)
            .setTitle('📡 Crimstone\'s Reach')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: 'Servers', value: formatNumber(guildCount), inline: true },
                { name: 'Members', value: formatNumber(userCount), inline: true },
                { name: 'Channels', value: formatNumber(channelCount), inline: true },
                { name: 'Commands', value: formatNumber(client.commands.size), inline: true },
                { name: 'Latency', value: `${client.ws.ping}ms`, inline: true },
                { name: 'Shards', value: formatNumber(shardCount), inline: true },
                { name: 'Uptime', value: formatUptime(client.uptime), inline: true },
                { name: 'Memory', value: `${memory.toFixed(1)} MB`, inline: true },
                { name: 'Node / discord.js', value: `${process.version} / v${djsVersion}`, inline: true },
            )
            .setFooter({ text: largest ? `Largest server: ${largest.name} (${formatNumber(largest.memberCount)} members)` : 'Crimstone' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};