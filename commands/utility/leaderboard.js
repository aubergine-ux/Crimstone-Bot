const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readLevels } = require('../utility/levelStore.js');
const { getLevelFromXp } = require('../utility/levelMath.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top members by XP.'),
    async execute(interaction) {
        const guildId = interaction.guild.id;

        const levels = readLevels();
        const guildLevels = levels[guildId] || {};

        const sorted = Object.entries(guildLevels)
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

            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            const name = member ? member.user.username : 'Unknown User';

            lines.push(`**${index + 1}.** ${name} — Level ${level} (${totalXp} XP)`);
        }

        const boardEmbed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
            .setDescription(lines.join('\n'));

        await interaction.editReply({ embeds: [boardEmbed] });
    }
};