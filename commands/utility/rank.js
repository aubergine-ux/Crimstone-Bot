const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { readLevels } = require('../utility/levelStore.js');
const { getLevelFromXp } = require('../utility/levelMath.js');
const { resolvePrefs } = require('../utility/rankPrefs.js');
const { buildRankCard } = require('../utility/rankCard.js');

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

        await interaction.deferReply();

        const levels = readLevels();
        const guildLevels = levels[guildId] || {};
        const totalXp = guildLevels[user.id] || 0;

        const { level, currentXp, neededXp } = getLevelFromXp(totalXp);

        const sorted = Object.entries(guildLevels).sort((a, b) => b[1] - a[1]);
        const position = sorted.findIndex(entry => entry[0] === user.id);
        const rank = position === -1 ? null : position + 1;

        const prefs = resolvePrefs(guildId, user.id);

        try {
            const buffer = await buildRankCard({
                accent: prefs.accent,
                background: prefs.background,
                backgroundImage: prefs.image,
                tagline: prefs.tagline,
                username: user.username,
                avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
                level: level,
                rank: rank,
                currentXp: currentXp,
                neededXp: neededXp,
            });

            const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });

            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Failed to build rank card:', error);
            await interaction.editReply({
                content: `**${user.username}** — Level ${level} (${currentXp}/${neededXp} XP, ${totalXp} total)`
            });
        }
    }
};
