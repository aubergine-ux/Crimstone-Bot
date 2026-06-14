const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    // 1. Define the command configuration
    data: new SlashCommandBuilder()
        .setName('command_name') // Must be lowercase, no spaces
        .setDescription('A brief description of what this command does'),

    // 2. Define the execution logic
    async execute(interaction) {
        try {
            // Your command logic goes here!
            
            // Reply to the user
            await interaction.reply('Hello! This is a blank template response.');
            
        } catch (error) {
            console.error('Error executing command:', error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error checking the uptime!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error checking the uptime!', ephemeral: true });
            }
        }
    },
};
