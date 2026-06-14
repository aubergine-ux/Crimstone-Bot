const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    // 1. Define the command configuration
    data: new SlashCommandBuilder()
        .setName('uptime') // Must be lowercase, no spaces
        .setDescription('View Crimstone`s Uptime'),

    // 2. Define the execution logic
    async execute(interaction) {
        try {
            // Your command logic goes here!
            
            let totalSeconds = (interaction.client.uptime / 1000);

            const days = Math.floor(totalSeconds / 86400);
            totalSeconds %= 86400;

            const hours = Math.floor(totalSeconds / 3600);
            totalSeconds %= 3600;

            const minutes = Math.floor(totalSeconds / 60);
            const seconds = Math.floor(totalSeconds % 60);

            const uptimeString = `**Uptime:** ${days}d ${hours}h ${minutes}m ${seconds}s`;


            // Reply to the user
            await interaction.reply({ content: uptimeString });
            
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
