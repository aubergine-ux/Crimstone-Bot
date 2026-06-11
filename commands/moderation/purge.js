const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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

        await interaction.channel.bulkDelete(amount, true);
        await interaction.reply({
            content: `Sucessfully deleted ${amount} mesages!`,
            epheremal: true,
        })
    }



}