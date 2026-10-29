const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { getMember, guildRanking } = require('../utility/levelStore.js');
const { getLevelFromXp } = require('../utility/levelMath.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exportxp')
        .setDescription('Download every member\'s XP in this server as a file.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const ranked = guildRanking(guildId);

        if (ranked.length === 0) {
            await interaction.reply({ content: 'No one in this server has any XP yet, so there\'s nothing to export.' });
            return;
        }

        const members = ranked.map(entry => {
            const stats = getMember(guildId, entry[0]);

            return {
                userId: entry[0],
                xp: stats.xp,
                level: getLevelFromXp(stats.xp).level,
                messages: stats.messages,
                voiceMinutes: stats.voiceMinutes,
            };
        });

        const file = {
            guildId: guildId,
            guildName: interaction.guild.name,
            exportedAt: new Date().toISOString(),
            members: members,
        };

        const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(file, null, 2)), {
            name: `xp-${guildId}.json`,
        });

        await interaction.reply({
            content: `📤 Exported XP for **${members.length}** member${members.length === 1 ? '' : 's'}. Load it back into any server with \`/importxp file:\`.`,
            files: [attachment],
        });
    }
};
