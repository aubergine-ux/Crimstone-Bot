const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readLevels, readGlobalTotals } = require('../utility/levelStore.js');
const { getConfig, optedOutGuilds } = require('../utility/guildConfig.js');
const { getLevelFromXp } = require('../utility/levelMath.js');

const resolveName = async (interaction, scope, userId) => {
    if (scope === 'global') {
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        return user ? user.username : 'Unknown User';
    }

    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    return member ? member.user.username : 'Unknown User';
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top members by XP.')
        .addStringOption(option =>
            option.setName('scope')
                .setDescription('Rank this server alone or every server Crimstone is in')
                .setRequired(false)
                .addChoices(
                    { name: 'This server', value: 'server' },
                    { name: 'Global', value: 'global' },
                )
        ),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const scope = interaction.options.getString('scope') || 'server';

        const config = getConfig(guildId);

        if (scope === 'global' && !config.globalLeaderboard) {
            await interaction.reply({ content: '❌ This server has opted out of the global leaderboard.' });
            return;
        }

        const levels = readLevels();

        let entries = levels[guildId] || {};
        let counted = 0;

        if (scope === 'global') {
            const { totals, guilds } = readGlobalTotals(optedOutGuilds());

            entries = totals;
            counted = guilds;
        }

        const sorted = Object.entries(entries)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (sorted.length === 0) {
            await interaction.reply({ content: 'No one has earned any XP yet.' });
            return;
        }

        await interaction.deferReply();

        const lines = [];

        for (let index = 0; index < sorted.length; index++) {
            const userId = sorted[index][0];
            const totalXp = sorted[index][1];
            const { level } = getLevelFromXp(totalXp);

            const name = await resolveName(interaction, scope, userId);

            lines.push(`**${index + 1}.** ${name} — Level ${level} (${totalXp} XP)`);
        }

        const boardEmbed = new EmbedBuilder()
            .setColor(scope === 'global' ? 0xE67E22 : 0xF1C40F)
            .setTitle(scope === 'global' ? '🌍 Global Leaderboard' : `🏆 ${interaction.guild.name} Leaderboard`)
            .setDescription(lines.join('\n'));

        if (scope === 'global') {
            boardEmbed.setFooter({ text: `XP combined across ${counted} server${counted === 1 ? '' : 's'}` });
        }

        await interaction.editReply({ embeds: [boardEmbed] });
    }
};
