const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { getGuildRoles } = require('../utility/levelRoles.js');
const { syncLevelRoles } = require('../utility/applyLevelRoles.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levelsync')
        .setDescription('Give or remove level reward roles so every member matches their level.')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const { roles } = getGuildRoles(interaction.guild.id);

        if (Object.keys(roles).length === 0) {
            await interaction.reply({ content: 'No level rewards are set up yet. Add one with `/levelrole add`.' });
            return;
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.reply({ content: '❌ I need the Manage Roles permission before I can sync rewards.' });
            return;
        }

        await interaction.deferReply();

        let members;

        try {
            members = await interaction.guild.members.fetch();
        } catch (error) {
            console.error('Failed to fetch members for level sync:', error.message);
            await interaction.editReply({ content: '❌ I couldn\'t load the member list. Please try again in a minute.' });
            return;
        }

        let checked = 0;
        let added = 0;
        let removed = 0;

        for (const member of members.values()) {
            if (member.user.bot) continue;

            const result = await syncLevelRoles(member);

            checked++;
            added += result.added.length;
            removed += result.removed.length;
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎖️ Level Rewards Synced')
            .setDescription(`Checked **${checked}** member${checked === 1 ? '' : 's'}.`)
            .addFields(
                { name: 'Roles given', value: `${added}`, inline: true },
                { name: 'Roles removed', value: `${removed}`, inline: true },
            )
            .setFooter({ text: 'Roles above my highest role are skipped' });

        await interaction.editReply({ embeds: [embed] });
    }
};
