const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { logAction } = require('../utility/modLog.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a User from the Server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('User you want to Kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the Kick')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No Reason Provided';

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return await interaction.reply({ content: 'That user is not in this server.', flags: MessageFlags.Ephemeral });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return await interaction.reply({ content: 'No Permission to use this Command.', flags: MessageFlags.Ephemeral });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            return await interaction.reply({ content: 'Grant me Permission to Kick Users.', flags: MessageFlags.Ephemeral });
        }

        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({ content: 'You cannot Kick yourself.', flags: MessageFlags.Ephemeral });
        }

        if (targetUser.id === interaction.guild.ownerId) {
            return await interaction.reply({ content: 'Cannot Kick the Server Owner.', flags: MessageFlags.Ephemeral });
        }

        if (!targetMember.kickable) {
            return await interaction.reply({ content: 'Cannot Kick this user. They have a higher role than me.', flags: MessageFlags.Ephemeral });
        }

        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return await interaction.reply({ content: 'You cannot Kick someone with a role equal to or higher than your own.', flags: MessageFlags.Ephemeral });
        }

        try {
            await targetMember.kick(`${interaction.user.tag}: ${reason}`);
            await interaction.reply({ content: `Successfully kicked **${targetUser.tag}** for: *${reason}*` });

            await logAction({
                guild: interaction.guild,
                action: 'kick',
                target: targetUser,
                moderator: interaction.user,
                reason: reason,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error trying to kick this user.', flags: MessageFlags.Ephemeral });
        }
    }
};
