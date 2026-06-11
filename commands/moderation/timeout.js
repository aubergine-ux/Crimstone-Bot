const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
        const user = await interaction.guild.members.fetch(interaction.options.getUser('user').id);
        const time = interaction.options.getInteger('time');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        if (user.isCommunicationDisabled()) {
            return interaction.reply({
                content: `${user} is already timed out!`,
                ephemeral: true,
            });
        }

        await user.timeout(time * 60 * 1000, reason);
        await interaction.reply({
            content: `${user} has been timed out for **${time} minute(s)**. Reason: ${reason}`,
            ephemeral: true,
        });
    },
};