const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require('discord.js');
const { getActivity, dayKey } = require('../utility/activityStore.js');
const { readLevels } = require('../utility/levelStore.js');
const { getLevelFromXp } = require('../utility/levelMath.js');

const TOP_CHANNELS = 3;

const formatNumber = (value) => value.toLocaleString('en-US');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverstats')
        .setDescription('See how active this server has been.')
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        await interaction.deferReply();

        const guild = interaction.guild;
        const activity = getActivity(guild.id);

        const today = activity.daily[dayKey(Date.now())] || 0;

        const days = Object.keys(activity.daily).sort();
        const recentDays = days.slice(-7);
        const weekTotal = recentDays.reduce((total, day) => total + activity.daily[day], 0);
        const dailyAverage = recentDays.length > 0 ? Math.round(weekTotal / recentDays.length) : 0;

        const topChannels = Object.entries(activity.channels)
            .sort((a, b) => b[1] - a[1])
            .filter(entry => guild.channels.cache.has(entry[0]))
            .slice(0, TOP_CHANNELS)
            .map(entry => `<#${entry[0]}> — ${formatNumber(entry[1])}`);

        const guildLevels = readLevels()[guild.id] || {};
        const ranked = Object.entries(guildLevels).sort((a, b) => b[1] - a[1]);
        const totalXp = ranked.reduce((total, entry) => total + entry[1], 0);

        let topMember = 'Nobody yet';

        if (ranked.length > 0) {
            const member = await guild.members.fetch(ranked[0][0]).catch(() => null);
            const name = member ? member.user.username : 'Unknown User';
            topMember = `${name} — Level ${getLevelFromXp(ranked[0][1]).level}`;
        }

        const createdAt = Math.floor(guild.createdTimestamp / 1000);

        const statsEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📊 ${guild.name}`)
            .setThumbnail(guild.iconURL() || null)
            .addFields(
                { name: 'Members', value: formatNumber(guild.memberCount), inline: true },
                { name: 'Channels', value: formatNumber(guild.channels.cache.size), inline: true },
                { name: 'Roles', value: formatNumber(guild.roles.cache.size), inline: true },
                { name: 'Messages today', value: formatNumber(today), inline: true },
                { name: 'Last 7 days', value: formatNumber(weekTotal), inline: true },
                { name: 'Daily average', value: formatNumber(dailyAverage), inline: true },
                { name: 'Tracked members', value: formatNumber(ranked.length), inline: true },
                { name: 'Total XP earned', value: formatNumber(totalXp), inline: true },
                { name: 'Top member', value: topMember, inline: true },
                { name: 'Created', value: `<t:${createdAt}:D> (<t:${createdAt}:R>)` },
            )
            .setFooter({ text: days.length === 0 ? 'Message tracking has only just started.' : `Message tracking covers ${days.length} day(s).` });

        if (topChannels.length > 0) {
            statsEmbed.addFields({ name: 'Busiest channels', value: topChannels.join('\n') });
        }

        await interaction.editReply({ embeds: [statsEmbed] });
    }
};
