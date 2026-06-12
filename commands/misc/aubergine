const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    // 1. This sets up how the command looks inside Discord
    data: new SlashCommandBuilder()
        .setName('aubergine') // Must be lowercase, no spaces
        .setDescription('Links to the Developer'),

    // 2. This is what happens when someone types the command
    async execute(interaction) {
        // Send a message back to the user
        await interaction.reply('Follow the Dev: https://github.com/aubergine-ux');
    },
};
