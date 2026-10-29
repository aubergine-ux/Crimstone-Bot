const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, InteractionContextType } = require('discord.js');
const { logAction } = require('../utility/modLog.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remove a user\'s timeout.')
        .setContexts(InteractionContextType.Guild)
        .addUserOption((option) =>
            option.setName('user').setDescription('The user to remove the timeout from').setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('reason').setDescription('Reason for removing the timeout')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return await interaction.reply({ content: 'That user is not in this server.', flags: MessageFlags.Ephemeral });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return await interaction.reply({ content: 'Grant me Permission to Timeout Users.', flags: MessageFlags.Ephemeral });
        }

        if (!member.isCommunicationDisabled()) {
            return await interaction.reply({ content: `**${targetUser.tag}** isn't timed out.`, flags: MessageFlags.Ephemeral });
        }

        if (!member.moderatable) {
            return await interaction.reply({ content: 'Cannot remove this Timeout. They have a higher role than me.', flags: MessageFlags.Ephemeral });
        }

        try {
            await member.timeout(null, `${interaction.user.tag}: ${reason}`);

            await interaction.reply({
                content: `**${targetUser.tag}**'s timeout has been removed. Reason: *${reason}*`,
            });

            await logAction({
                guild: interaction.guild,
                action: 'untimeout',
                target: targetUser,
                moderator: interaction.user,
                reason: reason,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error trying to remove this timeout.', flags: MessageFlags.Ephemeral });
        }
    },
};
