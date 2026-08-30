const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { logAction } = require('../utility/modLog.js');

const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} minute(s)`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours < 24) {
        return remainingMinutes === 0 ? `${hours} hour(s)` : `${hours}h ${remainingMinutes}m`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return remainingHours === 0 ? `${days} day(s)` : `${days}d ${remainingHours}h`;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user.')
        .addUserOption((option) =>
            option.setName('user').setDescription('The user to timeout').setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName('time')
                .setDescription('Timeout duration in minutes')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption((option) =>
            option.setName('reason').setDescription('Reason for the timeout')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const time = interaction.options.getInteger('time');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return await interaction.reply({ content: 'That user is not in this server.', flags: MessageFlags.Ephemeral });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return await interaction.reply({ content: 'Grant me Permission to Timeout Users.', flags: MessageFlags.Ephemeral });
        }

        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({ content: 'You cannot Timeout yourself.', flags: MessageFlags.Ephemeral });
        }

        if (!member.moderatable) {
            return await interaction.reply({ content: 'Cannot Timeout this user. They have a higher role than me.', flags: MessageFlags.Ephemeral });
        }

        if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return await interaction.reply({ content: 'You cannot Timeout someone with a role equal to or higher than your own.', flags: MessageFlags.Ephemeral });
        }

        if (member.isCommunicationDisabled()) {
            return await interaction.reply({
                content: `**${targetUser.tag}** is already timed out!`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const duration = formatDuration(time);

        try {
            await member.timeout(time * 60 * 1000, `${interaction.user.tag}: ${reason}`);

            await interaction.reply({
                content: `**${targetUser.tag}** has been timed out for **${duration}**. Reason: *${reason}*`,
            });

            await logAction({
                guild: interaction.guild,
                action: 'timeout',
                target: targetUser,
                moderator: interaction.user,
                reason: reason,
                duration: duration,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error trying to timeout this user.', flags: MessageFlags.Ephemeral });
        }
    },
};
