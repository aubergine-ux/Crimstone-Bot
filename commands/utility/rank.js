const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readLevels } = require('../utility/levelStore.js');
const { getLevelFromXp } = require('../utility/levelMath.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your level and XP.')
        .addUserOption(option =>
            option.setName('target').setDescription('Whose rank to check (defaults to you)').setRequired(false)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const guildId = interaction.guild.id;

        const levels = readLevels();
        const totalXp = levels[guildId]?.[user.id] || 0;

        const { level, currentXp, neededXp } = getLevelFromXp(totalXp);

        const rankEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`${user.username}'s Rank`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'Level', value: `${level}`, inline: true },
                { name: 'XP', value: `${currentXp} / ${neededXp}`, inline: true },
                { name: 'Total XP', value: `${totalXp}`, inline: true },
            );

        await interaction.reply({ embeds: [rankEmbed] });
    }
};