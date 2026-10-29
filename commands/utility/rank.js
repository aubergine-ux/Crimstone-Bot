const { SlashCommandBuilder, AttachmentBuilder, InteractionContextType } = require('discord.js');
const { getMember, guildPosition, globalRanking } = require('../utility/levelStore.js');
const { getLevelFromXp } = require('../utility/levelMath.js');
const { getConfig, optedOutGuilds } = require('../utility/guildConfig.js');
const { resolvePrefs } = require('../utility/rankPrefs.js');
const { buildRankCard } = require('../utility/rankCanvas.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your level and XP.')
        .setContexts(InteractionContextType.Guild)
        .addUserOption(option =>
            option.setName('target').setDescription('Whose rank to check (defaults to you)').setRequired(false)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const guildId = interaction.guild.id;

        await interaction.deferReply();

        const stats = getMember(guildId, user.id);
        const totalXp = stats.xp;

        const { level, currentXp, neededXp } = getLevelFromXp(totalXp);

        const rank = guildPosition(guildId, user.id);

        let globalRank = null;

        if (getConfig(guildId).globalLeaderboard) {
            const { entries } = globalRanking('combined', optedOutGuilds());
            const globalPosition = entries.findIndex(entry => entry[0] === user.id);

            if (globalPosition !== -1) globalRank = globalPosition + 1;
        }

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
                globalRank: globalRank,
                currentXp: currentXp,
                neededXp: neededXp,
                stats: stats,
            });

            const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });

            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Failed to build rank card:', error);
            await interaction.editReply({
                content: `**${user.username}** — Level ${level} (${currentXp}/${neededXp} XP, ${totalXp} total)`
                    + (globalRank ? `\nGlobal rank: #${globalRank}` : '')
            });
        }
    }
};
