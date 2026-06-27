const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('View Crimstone`s Uptime'),

    async execute(interaction) {
        try {
            
            let totalSeconds = (interaction.client.uptime / 1000);

            const days = Math.floor(totalSeconds / 86400);
            totalSeconds %= 86400;

            const hours = Math.floor(totalSeconds / 3600);
            totalSeconds %= 3600;

            const minutes = Math.floor(totalSeconds / 60);
            const seconds = Math.floor(totalSeconds % 60);

            const uptimeString = `**Uptime:** ${days}d ${hours}h ${minutes}m ${seconds}s`;

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
