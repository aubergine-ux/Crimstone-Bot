const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    // 1. This sets up how the command looks inside Discord
    data: new SlashCommandBuilder()
        .setName('announce') // Must be lowercase, no spaces
        .setDescription('Sends a Embedded Announcement in the Desired Channel')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Message Contents')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    // 2. This is what happens when someone types the command
    async execute(interaction) {
        
        const text = interaction.options.getString('text');

        const embed = new EmbedBuilder()
            .setTitle ('Server Announcement')
            .setDescription(text)
            .setColor('Blurple')
            .setTimestamp();
        // Send a message back to the user
        await interaction.reply({ embeds: [embed] });
    },
};
