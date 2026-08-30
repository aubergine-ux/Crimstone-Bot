const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { logAction } = require('../utility/modLog.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a User from the Server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('User you want to Ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the Ban')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {

        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No Reason Provided';

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return await interaction.reply({ content: 'No Permission to use this Command.', flags: MessageFlags.Ephemeral });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return await interaction.reply({ content: 'Grant me Permission to Ban Users.', flags: MessageFlags.Ephemeral });
        }

        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({ content: 'You cannot Ban yourself.', flags: MessageFlags.Ephemeral });
        }

        if (targetUser.id === interaction.guild.ownerId) {
            return await interaction.reply({ content: 'Cannot Ban the Server Owner.', flags: MessageFlags.Ephemeral });
        }

        if (targetMember) {
            if (!targetMember.bannable) {
                return await interaction.reply({ content: 'Cannot Ban this user. They have a higher role than me.', flags: MessageFlags.Ephemeral });
            }

            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                return await interaction.reply({ content: 'You cannot Ban someone with a role equal to or higher than your own.', flags: MessageFlags.Ephemeral });
            }
        }

        try {
            await interaction.guild.members.ban(targetUser.id, { reason: `${interaction.user.tag}: ${reason}` });
            await interaction.reply({ content: `Successfully banned **${targetUser.tag}** for: *${reason}*` });

            await logAction({
                guild: interaction.guild,
                action: 'ban',
                target: targetUser,
                moderator: interaction.user,
                reason: reason,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error trying to ban this user.', flags: MessageFlags.Ephemeral });
        }
    }
};
