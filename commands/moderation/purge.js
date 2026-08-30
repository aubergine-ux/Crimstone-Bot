const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { logAction } = require('../utility/modLog.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete multiple messages at once.')
        .addIntegerOption((option) =>
            option
                .setName('amount')
                .setDescription('Number of messages to delete (1-50)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(50)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const botPermissions = interaction.channel.permissionsFor(interaction.guild.members.me);

        if (!botPermissions.has([PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory])) {
            return await interaction.reply({
                content: 'I don\'t have permission to delete messages in this channel. I need **Manage Messages** and **Read Message History**.',
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);

            if (deleted.size === 0) {
                return await interaction.reply({
                    content: 'Nothing was deleted — messages older than 14 days can\'t be bulk removed.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            await interaction.reply({
                content: `Successfully deleted ${deleted.size} message(s)!`,
                flags: MessageFlags.Ephemeral,
            });

            await logAction({
                guild: interaction.guild,
                action: 'purge',
                moderator: interaction.user,
                reason: 'Bulk message deletion',
                channel: interaction.channel,
                extra: `${deleted.size} of ${amount} requested message(s) removed`,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'There was an error trying to delete those messages.',
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
